import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createShapeId, useEditor, type TLCommentThreadId, type TLShapeId } from "tldraw";
import { BoardComments } from "./InspectorComments";
import { CanvasChromeContext } from "./canvasChrome";
import { installInspectorClicks, type InspectorTarget } from "./inspectorClicks";
import {
  BOARD_STATUSES,
  BOARD_STATUS_LABEL,
  LAYOUT_CHANGED,
  type CanvasBoardStatus,
  type CanvasLayoutImage,
  boardPageUrl,
  boardStatusForPath,
  canvasImageUrl,
  readCanvasAssetNames,
  writeBoardStatus,
} from "./canvasLibrary";
import {
  type SpBinding,
  type SpBindings,
  type SpGroup,
  type SpMessage,
  type SpNode,
  type SpReady,
  type SpToken,
} from "./inspectorAgent";
import {
  type AssetRow,
  PANEL_W,
  VISIBLE_PROPS,
  assetForNode,
  assetRows,
  formatBytes,
  initialLayersH,
  isColorValue,
  cx,
  layersBounds,
  layerKind,
  layerName,
  layerRows,
  layerSelector,
  nextLayersH,
  newBoardPin,
  nextPanelW,
  panelBounds,
  tokenGroups,
  tokenVia,
} from "./inspectorModel";

/**
 * Panel state that outlives the board it was set on.
 *
 * The panel is keyed by path, so clicking a different board mounts a fresh one. That is right for
 * the selection and the report, which are about the board, and wrong for how the panel is
 * arranged, which is about the person: a rail collapsed or dragged narrower should stay that way
 * for the next board. Kept in sessionStorage, next to the board the inspector had open, so a
 * reload does not undo it either.
 */
function useStickyPanelState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(key);
      return saved === null ? initial : (JSON.parse(saved) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // No storage to write to: the panel goes back to forgetting between boards.
    }
  }, [key, value]);
  return [value, setValue] as const;
}

/** How long the Undo beside the badge stays up after a status has been written. */
const UNDO_MS = 10_000;

/**
 * The board's status, in the panel's header, where the badge is also the control that sets it.
 *
 * It is the only place a status can be changed: the coloured tab above a board out on the canvas
 * is a read-only echo of the same value in layout.json.
 *
 * `import.meta.env.DEV` is the whole of the read-only rule. Writing means editing layout.json
 * through the dev server, and a built canvas is static files on a host with no repo behind them,
 * so there it is a badge and nothing more.
 */
function BoardStatus({ path }: { path: string }) {
  const [status, setStatus] = useState(() => boardStatusForPath(path));
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [undo, setUndo] = useState<{ back: CanvasBoardStatus } | null>(null);

  // Anywhere outside closes it, including the board: the preview is an iframe, so a click that
  // lands in it never reaches this document as a pointerdown, but it does take the window's
  // focus, which is what `blur` catches.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("blur", close);
    };
  }, [open]);

  // The file, edited from anywhere: this control, an agent, or the editor it is open in. The
  // badge reads it back rather than trusting what it last set, so the two cannot disagree.
  useEffect(() => {
    const reread = () => setStatus(boardStatusForPath(path));
    window.addEventListener(LAYOUT_CHANGED, reread);
    return () => window.removeEventListener(LAYOUT_CHANGED, reread);
  }, [path]);

  // The offer expires. A stale Undo next to a badge someone has since stopped looking at is a
  // trap: it would write a status back over whatever the file says by then.
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undo]);

  const pick = async (next: CanvasBoardStatus) => {
    setOpen(false);
    if (next === status) return;
    const previous = status;
    // Optimistic, so the badge answers the click at once rather than at the end of a round trip
    // through the file. The write comes back over HMR and the effect above confirms it, or the
    // failure notice below says it never landed.
    setStatus(next);
    const ok = await writeBoardStatus(path, next);
    setFailed(!ok);
    // A status click edits a file in the user's repo, and nothing else on the canvas undoes it,
    // because tldraw's history knows only about shapes. So the way back is offered here, briefly,
    // rather than left to be typed back into layout.json by hand.
    setUndo(ok ? { back: previous } : null);
  };

  const revert = async () => {
    if (!undo) return;
    setUndo(null);
    setStatus(undo.back);
    setFailed(!(await writeBoardStatus(path, undo.back)));
  };

  const badge = (
    <>
      <i className="sp-status-dot" />
      {BOARD_STATUS_LABEL[status]}
    </>
  );

  // Away from the dev server there is no file to write a status back to, so the badge is only a
  // label — but it keeps the wrapper, which is what the menu and the Undo hang off.
  if (!import.meta.env.DEV) {
    return (
      <div className="sp-status-wrap">
        <span className={`sp-status sp-status--${status}`}>{badge}</span>
      </div>
    );
  }

  return (
    // The menu is dismissed by any pointerdown on the window, so the control has to keep its own
    // out of that. Otherwise opening it closes it in the same gesture.
    <div className="sp-status-wrap" onPointerDown={(event) => event.stopPropagation()}>
      <button
        type="button"
        className={`sp-status sp-status--${status}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Status: ${BOARD_STATUS_LABEL[status]}. Click to change`}
        onClick={() => setOpen((v) => !v)}
      >
        {badge}
        <svg className="sp-status-chev" width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M2.5 4.5L6 8l3.5-3.5" />
        </svg>
      </button>
      {open ? (
        <div className="sp-menu" role="menu">
          {BOARD_STATUSES.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={option === status}
              className="sp-menu-row"
              onClick={() => pick(option)}
            >
              <i className={`sp-status-dot sp-status--${option}`} />
              {BOARD_STATUS_LABEL[option]}
              {option === status ? (
                <svg className="sp-menu-ck" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 6.4l2.6 2.6L10 3.6" />
                </svg>
              ) : null}
            </button>
          ))}
          <div className="sp-menu-foot">
            Writes <code>{`${/canvases\/([^/]+)\//.exec(path)?.[1] ?? ""}/layout.json`}</code>
          </div>
        </div>
      ) : null}
      {undo ? (
        <button
          type="button"
          className="sp-status-undo"
          title={`Back to ${BOARD_STATUS_LABEL[undo.back]}`}
          onClick={revert}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.2 4.6H7.6a2.6 2.6 0 010 5.2H5.2" />
            <path d="M5 2.4L3 4.6l2 2.2" />
          </svg>
          Undo
        </button>
      ) : null}
      {failed ? <span className="sp-status-err">layout.json not written</span> : null}
    </div>
  );
}

/**
 * The docked inspector: layers and properties, the board's images, its design tokens and the
 * comments on it. There is no preview in here — the board being inspected is the one out on the
 * canvas, which runs the agent (see CanvasFileShapeUtil) and is what a pick is made on, so the
 * mockup someone reads is the mockup they click.
 */

/**
 * A divider drag. `from` is read at pointerdown, so the handler works off the value the drag
 * started at rather than accumulating rounding error, and `apply` gets that value with the
 * pointer delta along one axis.
 *
 * Pointer capture is the whole trick: the canvas behind the panel holds board frames, and
 * without capture the first move over one delivers the event to that frame's document instead,
 * which ends the drag the moment the pointer crosses onto a board.
 */
function divider(
  axis: "x" | "y",
  from: () => number,
  apply: (start: number, delta: number) => void,
) {
  return (e: React.PointerEvent<HTMLElement>) => {
    // Left button only, and only one pointer at a time: a second finger on the same grip would
    // otherwise run two drags off two origins and thrash the pane between them, and a right
    // button drag can lose its pointerup to the context menu and leave the listener bound.
    if (e.button !== 0 || !e.isPrimary) return;
    e.preventDefault();
    const el = e.currentTarget;
    const origin = axis === "x" ? e.clientX : e.clientY;
    const start = from();
    el.setPointerCapture(e.pointerId);
    const move = (m: PointerEvent) => {
      if (m.pointerId !== e.pointerId) return;
      apply(start, (axis === "x" ? m.clientX : m.clientY) - origin);
    };
    const up = (m: PointerEvent) => {
      if (m.pointerId !== e.pointerId) return;
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
}

/** The same move by arrow key, so a focused grip does what its label says it does. */
function dividerKeys(
  axis: "x" | "y",
  from: () => number,
  apply: (start: number, delta: number) => void,
) {
  const [less, more] = axis === "x" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
  return (e: React.KeyboardEvent<HTMLElement>) => {
    const step = e.key === less ? -1 : e.key === more ? 1 : 0;
    if (!step) return;
    e.preventDefault();
    apply(from(), step * (e.shiftKey ? 64 : 8));
  };
}

/**
 * The panel's width, and the window it is clamped to. Both panels below are the same dock: one
 * width, dragged from one edge, kept for whatever is opened next.
 *
 * Keyed `sp:panel`, not the `sp:panel-w` the two-pane panel used: the same number means a rail
 * width now, and a session that had dragged the old panel wide would open a 736px rail.
 */
function usePanelWidth() {
  const [panelW, setPanelW] = useStickyPanelState("sp:panel", PANEL_W);
  const [win, setWin] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setWin({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  // Clamped here, not only where it is set: see the note on `nextPanelW`. The raw state is what
  // a drag started from, this is what is rendered and what the next drag reads back.
  const panel = nextPanelW(panelW, 0, win.w);
  return {
    win,
    panel,
    setPanel: {
      from: () => panel,
      apply: (w0: number, dx: number) => setPanelW(nextPanelW(w0, dx, win.w)),
    },
  };
}

/** The panel is docked right, so its left edge is the one that resizes it: drag left, wider. */
function WidthGrip({
  width,
  max,
  set,
}: {
  width: number;
  max: number;
  set: { from: () => number; apply: (start: number, delta: number) => void };
}) {
  return (
    <div
      className="sp-grip sp-grip--x"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize inspector"
      aria-valuenow={width}
      aria-valuemin={panelBounds(max)[0]}
      aria-valuemax={panelBounds(max)[1]}
      tabIndex={0}
      onPointerDown={divider("x", set.from, set.apply)}
      onKeyDown={dividerKeys("x", set.from, set.apply)}
    />
  );
}

type Tab = "inspect" | "assets" | "tokens";

const fmt = (n: number) => String(Math.round(n * 100) / 100);
/** Wiring component: lives inside <Tldraw> so it can reach the editor. */
export function InspectorClicks({
  onPick,
  inspectingPath,
  frame,
}: {
  onPick: (shape: InspectorTarget) => void;
  inspectingPath: string | null;
  frame: React.RefObject<HTMLIFrameElement | null>;
}) {
  const editor = useEditor();
  useEffect(
    () => installInspectorClicks(editor, onPick, inspectingPath, frame),
    [editor, onPick, inspectingPath, frame],
  );
  return null;
}

export function InspectorPanel({
  path,
  name,
  size,
  frame,
  onClose,
}: {
  path: string;
  name: string;
  /** The shape's own size, which is the artboard's: the frame is created at it. */
  size: { w: number; h: number };
  /**
   * The frame this board is drawn in out on the canvas, filled in by CanvasFileShapeUtil. It is
   * the only board running the agent, so it is the only one this panel talks to.
   */
  frame: React.RefObject<HTMLIFrameElement | null>;
  onClose: () => void;
}) {
  const pageUrl = boardPageUrl(path);
  const [data, setData] = useState<SpReady | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [hov, setHov] = useState<number | null>(null);
  /** Layers folded shut, and layers the eye has taken off the board. Both by node index. */
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(() => new Set());
  const [hidden, setHidden] = useState<ReadonlySet<number>>(() => new Set());
  const [bindings, setBindings] = useState<SpBindings | null>(null);
  const [tab, setTab] = useState<Tab>("inspect");
  const [focusToken, setFocusToken] = useState<string | null>(null);
  const [layersH, setLayersH] = useStickyPanelState(
    "sp:layers-h",
    initialLayersH(window.innerHeight),
  );
  const { win, panel, setPanel } = usePanelWidth();
  // The comments on this board are the canvas's own, reached through the chrome context
  // because the panel renders beside `<Tldraw>` rather than under it.
  const editor = useContext(CanvasChromeContext).editor;
  const shapeId = useMemo(() => createShapeId(`canvas-file:${path}`), [path]);
  const [openThread, setOpenThread] = useState<TLCommentThreadId | null>(null);

  const slug = /canvases\/([^/]+)\//.exec(path)?.[1] ?? "";
  const names = useMemo(() => readCanvasAssetNames(slug), [slug]);

  // `sp:ready` is fire-and-forget, so it is lost for good if it arrives before this listener is
  // attached — and when the board is already in the library's cache, `srcDoc` is real on the very
  // first render and the frame can run the agent before this effect does. The frame's `onLoad`
  // asks again, and that is ordered after the frame's own script, so the handshake cannot race.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // The frame has no origin to check — `allow-scripts` without `allow-same-origin` puts it in
      // an opaque origin, so `event.origin` is the string "null" for every such frame on the page.
      // Identity is the check that means anything: this message came from this frame's window.
      if (!frame.current || event.source !== frame.current.contentWindow) return;
      const message = event.data as SpMessage | null;
      if (!message || typeof message !== "object") return;
      if (message.type === "sp:ready") setData(message);
      else if (message.type === "sp:bindings") setBindings(message);
      else if (message.type === "sp:pick") setSel(message.i);
      else if (message.type === "sp:hover") setHov(message.i);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frame]);

  // `data` is in the deps because the frame is the canvas's: tldraw drops a board that scrolls
  // out of view and mounts it again with the board reloaded, which is a fresh report and a
  // highlight that has to be put back.
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: "sp:sel", i: sel }, "*");
  }, [sel, data, frame]);

  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: "sp:hover", i: hov }, "*");
  }, [hov, frame]);

  // `data` again: a board that scrolled out of view and came back is a fresh document, with
  // every layer visible on it.
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: "sp:hide", i: [...hidden] }, "*");
  }, [hidden, data, frame]);

  // Escape clears the selection, and with nothing selected closes the panel. `defaultPrevented`
  // skips the ones a tldraw menu or a Radix layer has already dismissed itself on.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (sel !== null) setSel(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, onClose]);

  const assets = useMemo(() => (data ? assetRows(data.assets, names) : []), [data, names]);
  const assetNameByNode = useMemo(() => {
    const map = new Map<number, string>();
    for (const row of assets) for (const i of row.uses) if (!map.has(i)) map.set(i, row.name);
    return map;
  }, [assets]);

  const node = data && sel !== null ? data.nodes[sel] : undefined;
  const selAsset = assetForNode(assets, sel);

  // Clamped here, not only where it is set: see the note on `nextPanelW`. The raw state is what
  // a drag started from, this is what is rendered and what the next drag reads back.
  const layers = nextLayersH(layersH, 0, win.h);

  const setLayers = {
    from: () => layers,
    apply: (h0: number, dy: number) => setLayersH(nextLayersH(h0, dy, win.h)),
  };
  const usedTokens = data ? data.tokens.filter((t) => t.usedBy.length).length : 0;

  const jumpToToken = (token: string) => {
    setTab("tokens");
    setFocusToken(token);
  };

  return (
    <aside className="sp-panel" style={{ width: panel }}>
      <WidthGrip width={panel} max={win.w} set={setPanel} />
      <div className="sp-rail">
        <header className="sp-head">
          <span className="sp-head-name" title={path}>
            {name}
          </span>
          <span className="sp-head-dim">
            {data ? `${fmt(data.size.w)} × ${fmt(data.size.h)}` : "reading board…"}
          </span>
          <BoardStatus path={path} />
          {/*
            The board as an ordinary web page, in a tab of its own: on the canvas it is drawn at
            whatever the camera says, so that is where type is read and a flow is tapped through.
            An anchor, not a button, so middle click, ⌘-click and copy all work on it.
          */}
          {pageUrl ? (
            <a
              className="sp-head-x"
              href={pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open this board as a page"
              aria-label="Open this board as a page"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4.5 1.5h-3v3M7.5 1.5h3v3M10.5 7.5v3h-3M1.5 7.5v3h3" />
              </svg>
            </a>
          ) : null}
          <button type="button" className="sp-head-x" onClick={onClose} aria-label="Close inspector">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
            </svg>
          </button>
        </header>

        <nav className="sp-tabs" aria-label="Inspector sections">
          {(["inspect", "assets", "tokens"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={cx(tab === t && "on")}
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
            >
              {t === "inspect" ? "Inspect" : t === "assets" ? "Assets" : "Tokens"}
            </button>
          ))}
        </nav>

        {tab === "inspect" ? (
          <section className="sp-tab">
            <Layers
              nodes={data?.nodes ?? []}
              height={layers}
              sel={sel}
              hov={hov}
              names={assetNameByNode}
              collapsed={collapsed}
              hidden={hidden}
              onSelect={setSel}
              onHover={setHov}
              onFold={(i) => setCollapsed((set) => toggled(set, i))}
              onHide={(i) => setHidden((set) => toggled(set, i))}
            />
            {/* The list was a fixed 240px, which is why a 24-layer board could not be read. */}
            <div
              className="sp-grip sp-grip--y"
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize layers"
              aria-valuenow={layers}
              aria-valuemin={layersBounds(win.h)[0]}
              aria-valuemax={layersBounds(win.h)[1]}
              tabIndex={0}
              onPointerDown={divider("y", setLayers.from, setLayers.apply)}
              onKeyDown={dividerKeys("y", setLayers.from, setLayers.apply)}
            />
            {/* The image the selected layer draws, on its own, pinned under the row that named it. */}
            {selAsset ? (
              <figure className="sp-asset-view">
                <img src={selAsset.uri} alt={selAsset.name} />
                <figcaption>
                  <span className="sp-asset-view-n" title={selAsset.name}>
                    {selAsset.name}
                  </span>
                  <span className="sp-asset-view-d">
                    {selAsset.via === "svg"
                      ? `${fmt(selAsset.w)} × ${fmt(selAsset.h)} · svg`
                      : `${selAsset.w} × ${selAsset.h} · ${formatBytes(selAsset.bytes)}`}
                    {selAsset.svg ? <CopySvg key={selAsset.key} svg={selAsset.svg} /> : null}
                  </span>
                </figcaption>
              </figure>
            ) : null}
            <div className="sp-props">
              {node ? (
                <Properties
                  node={node}
                  bindings={bindings && bindings.i === node.i ? bindings : null}
                  tokens={data?.tokens ?? []}
                  onToken={jumpToToken}
                  onSelect={setSel}
                />
              ) : data ? (
                <Summary
                  name={name}
                  path={path}
                  data={data}
                  assets={assets}
                  usedTokens={usedTokens}
                />
              ) : (
                <div className="sp-empty">reading board…</div>
              )}
            </div>
          </section>
        ) : tab === "assets" ? (
          <section className="sp-tab">
            <Assets rows={assets} sel={sel} hov={hov} onSelect={setSel} onHover={setHov} />
          </section>
        ) : (
          <section className="sp-tab">
            <Tokens
              tokens={data?.tokens ?? []}
              groups={data?.groups ?? []}
              used={usedTokens}
              sel={sel}
              focus={focusToken}
              onSelect={setSel}
            />
          </section>
        )}

        {/* The board's threads, under the tab rather than under a preview. The pins themselves
            are the canvas's own, drawn on the board out there. */}
        {editor ? (
          <BoardComments
            editor={editor}
            subject="board"
            shapeId={shapeId}
            open={openThread}
            onOpen={setOpenThread}
            pinAt={newBoardPin(node?.box, size)}
          />
        ) : null}
      </div>
    </aside>
  );
}

/**
 * A brand image on the canvas, as the panel needs it. The shape is a plain tldraw image, so
 * everything there is to say about the picture is in its folder's layout.json.
 */
export interface CanvasImagePick {
  shapeId: TLShapeId;
  slug: string;
  file: string;
  /** The row it was listed in, which is the surface it was collected from: "App Store", "X". */
  row: string;
  image: CanvasLayoutImage;
}

/**
 * The inspector for a picture. Brand material is laid out as image shapes rather than boards, so
 * there is no agent running inside one and nothing to pick within it: what a picture has to say
 * is where it came from and how many pixels it really has. The comments are the board panel's,
 * the same canvas threads, pinned on the image out there.
 */
export function ImagePanel({ pick, onClose }: { pick: CanvasImagePick; onClose: () => void }) {
  const { win, panel, setPanel } = usePanelWidth();
  const editor = useContext(CanvasChromeContext).editor;
  const [openThread, setOpenThread] = useState<TLCommentThreadId | null>(null);
  const { slug, file, row, image } = pick;
  const original = canvasImageUrl(slug, file);

  // Nothing is selected inside a picture, so Escape has only the one thing left to do.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside className="sp-panel" style={{ width: panel }}>
      <WidthGrip width={panel} max={win.w} set={setPanel} />
      <div className="sp-rail">
        <header className="sp-head">
          <span className="sp-head-name" title={file}>
            {image.label}
          </span>
          <span className="sp-head-dim">{`${image.w} × ${image.h}`}</span>
          {/* The file itself, at full size, in a tab of its own: on the canvas it is drawn at
              whatever the camera says, and the pixels are the whole point of a reference. */}
          {original ? (
            <a
              className="sp-head-x"
              href={original}
              target="_blank"
              rel="noopener noreferrer"
              title="Open the original"
              aria-label="Open the original"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4.5 1.5h-3v3M7.5 1.5h3v3M10.5 7.5v3h-3M1.5 7.5v3h3" />
              </svg>
            </a>
          ) : null}
          <button type="button" className="sp-head-x" onClick={onClose} aria-label="Close inspector">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
            </svg>
          </button>
        </header>

        <div className="sp-props">
          <div className="sp-sec">
            <div className="sp-sh">
              <span className="sp-sh-t">{row}</span>
              <span className="sp-sh-s">{file.split("/").pop()}</span>
            </div>
            <Row k="Pixels" v={`${image.w} × ${image.h}`} />
            <Row k="File" v={file} />
            {image.source ? <Source source={image.source} /> : null}
            {/* One word from the skill that collected it: "theirs" for something the company
                published, "archive" for something recovered from one. */}
            {image.provenance ? <Row k="Provenance" v={image.provenance} /> : null}
          </div>
        </div>

        {editor ? (
          <BoardComments
            editor={editor}
            subject="image"
            shapeId={pick.shapeId}
            open={openThread}
            onOpen={setOpenThread}
            pinAt={{ x: 0.5, y: 0.5 }}
          />
        ) : null}
      </div>
    </aside>
  );
}

/**
 * Where the picture was collected from. Some sources are prose rather than an address — "openai.com
 * /brand (Logo section) via Wayback Machine snapshot 20260907013431" — because for those the route
 * to the asset was the finding, so only the ones a browser can open become links and the rest are
 * written out under the row. Same rule as the brand sheet's cards (BrandSheet.tsx).
 */
function Source({ source }: { source: string }) {
  let host: string | undefined;
  try {
    host = new URL(source).host.replace(/^www\./, "");
  } catch {
    host = undefined;
  }
  return host ? (
    <Row
      k="Source"
      v={
        <a className="sp-link" href={source} target="_blank" rel="noopener noreferrer" title={source}>
          {host}
        </a>
      }
    />
  ) : (
    <>
      <Row k="Source" v={source.split(/[\s/]/)[0]} />
      <div className="sp-sub sp-longs">{source}</div>
    </>
  );
}

/** The vector asset, to the clipboard: the standalone markup, for Figma or another gen.py. */
function CopySvg({ svg }: { svg: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      className="sp-copy"
      onClick={() => void navigator.clipboard.writeText(svg).then(() => setCopied(true))}
    >
      {copied ? "Copied" : "Copy SVG"}
    </button>
  );
}

function LayerIcon({ kind }: { kind: ReturnType<typeof layerKind> }) {
  if (kind === "vector")
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor">
        <path d="M2.5 9.5C2.5 4.5 7.5 7.5 9.5 2.5" />
        <circle cx="2.5" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="9.5" cy="2.5" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    );
  if (kind === "text")
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
        <path d="M2 2h8v2H7v6H5V4H2z" />
      </svg>
    );
  if (kind === "image")
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor">
        <rect x="1.5" y="1.5" width="9" height="9" rx="1" />
        <path d="M2 9l2.5-3 2 2 1.5-1.5L10 9" />
      </svg>
    );
  if (kind === "frame")
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor">
        <path d="M3.5 1v10M8.5 1v10M1 3.5h10M1 8.5h10" />
      </svg>
    );
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor">
      <rect x="1.5" y="1.5" width="9" height="9" rx="1" />
    </svg>
  );
}

/** Adds an index to a set, or takes it out: what the fold and the eye do to their set. */
function toggled(set: ReadonlySet<number>, i: number) {
  const next = new Set(set);
  if (!next.delete(i)) next.add(i);
  return next;
}

/**
 * The board's tree, in document order and indented by depth. A layer with children folds shut,
 * which is what makes the biggest boards readable (352 elements on `luma-ios/11-home-nearby`),
 * and the eye takes one off the board without touching the generator — the board is a rendered
 * file, so hiding is this session's view of it and nothing more.
 */
function Layers({
  nodes,
  height,
  sel,
  hov,
  names,
  collapsed,
  hidden,
  onSelect,
  onHover,
  onFold,
  onHide,
}: {
  nodes: SpNode[];
  height: number;
  sel: number | null;
  hov: number | null;
  names: Map<number, string>;
  collapsed: ReadonlySet<number>;
  hidden: ReadonlySet<number>;
  onSelect: (i: number) => void;
  onHover: (i: number | null) => void;
  onFold: (i: number) => void;
  onHide: (i: number) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (sel === null) return;
    list.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);
  const rows = useMemo(() => layerRows(nodes, collapsed), [nodes, collapsed]);
  return (
    <div className="sp-layers" style={{ height }} ref={list} onMouseLeave={() => onHover(null)}>
      <div className="sp-sh">
        <span className="sp-sh-t">Layers</span>
        <span className="sp-sh-s">{Math.max(0, rows.length - 1)}</span>
      </div>
      {rows.map(({ node: n, kids }) => (
        <div
          key={n.i}
          data-i={n.i}
          className={cx(
            "sp-layer",
            n.i === sel && "on",
            n.i === hov && n.i !== sel && "hov",
            hidden.has(n.i) && "off",
          )}
          style={{ paddingLeft: n.depth * 12 }}
          onMouseEnter={() => onHover(n.i)}
        >
          {/* Always rendered, so a leaf's name lines up with its siblings' rather than sliding
              back under the fold of the layer above it. */}
          <button
            type="button"
            className="sp-layer-fold"
            disabled={!kids}
            aria-label={collapsed.has(n.i) ? "Expand" : "Collapse"}
            aria-expanded={kids ? !collapsed.has(n.i) : undefined}
            onClick={() => onFold(n.i)}
          >
            {kids ? <Caret open={!collapsed.has(n.i)} /> : null}
          </button>
          <button
            type="button"
            className="sp-layer-hit"
            title={layerSelector(n)}
            onClick={() => onSelect(n.i)}
          >
            <LayerIcon kind={layerKind(n)} />
            <span className="sp-layer-n">{layerName(n, names.get(n.i))}</span>
            {n.i === 0 && n.box ? (
              <span className="sp-layer-d">
                {fmt(n.box.w)} × {fmt(n.box.h)}
              </span>
            ) : null}
          </button>
          {/* The root is the artboard: hiding it would blank the board and leave nothing to
              click the eye back on. */}
          {n.i > 0 ? (
            <button
              type="button"
              className="sp-layer-eye"
              aria-label={hidden.has(n.i) ? "Show" : "Hide"}
              aria-pressed={hidden.has(n.i)}
              onClick={() => onHide(n.i)}
            >
              <Eye off={hidden.has(n.i)} />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
      <path d={open ? "M0 2h8L4 7z" : "M2 0v8l5-4z"} />
    </svg>
  );
}

function Eye({ off }: { off: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor">
      <path d="M1 6s2-3.2 5-3.2S11 6 11 6s-2 3.2-5 3.2S1 6 1 6z" />
      <circle cx="6" cy="6" r="1.4" />
      {off ? <path d="M2 10L10 2" /> : null}
    </svg>
  );
}

function Summary({
  name,
  path,
  data,
  assets,
  usedTokens,
}: {
  name: string;
  path: string;
  data: SpReady;
  assets: AssetRow[];
  usedTokens: number;
}) {
  const file = path.slice(path.lastIndexOf("/") + 1);
  const root = data.nodes[0];
  const vectors = assets.filter((a) => a.via === "svg").length;
  return (
    <div className="sp-sec">
      <div className="sp-sh">
        <span className="sp-sh-t">{name}</span>
        <span className="sp-sh-s">{file}</span>
      </div>
      <Row k="Frame" v={root?.box ? `${fmt(root.box.w)} × ${fmt(root.box.h)}` : "–"} />
      <Row k="Layers" v={String(Math.max(0, data.nodes.filter((n) => !n.inSvg).length - 1))} />
      <Row k="Images" v={String(assets.length - vectors)} />
      <Row k="Vectors" v={String(vectors)} />
      <Row k="Tokens" v={`${usedTokens} used of ${data.tokens.length}`} />
      <div className="sp-hint">Click a layer, or an element in the preview.</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="sp-row">
      <span className="sp-k">{k}</span>
      <span className="sp-v">{v}</span>
    </div>
  );
}

function TokenPill({
  name,
  value,
  kind,
  lost,
  onClick,
}: {
  name: string;
  value: string;
  kind: SpToken["kind"] | undefined;
  lost: boolean;
  onClick: () => void;
}) {
  const swatch = isColorValue(value, kind);
  return (
    <button
      type="button"
      className={cx("sp-pill", !swatch && "plain", lost && "lost")}
      title={value}
      onClick={onClick}
    >
      {swatch ? <span className="sp-sw" style={{ background: value }} /> : null}
      {name}
    </button>
  );
}

/** The declaration with its tokens substituted, which is what the author would read back. */
function resolvedText(b: SpBinding) {
  return b.value.replace(/var\(\s*(--[\w-]+)\s*(?:,[^()]*)?\)/g, (m, n: string) => b.resolved[n] ?? m);
}

function stateText(b: SpBinding) {
  if (b.state === "overridden") return `overridden by ${b.by}`;
  if (b.state === "partial") {
    const lost = b.longhands.filter((l) => !l.ok).map((l) => l.p);
    return `partial — ${lost.join(", ")} from ${b.by}`;
  }
  if (b.state === "invalid") return "invalid declaration";
  return "unconfirmed — the probe could not reproduce this value";
}

/** The sources a selected element's declarations came from, in cascade order. */
function styleGroups(bindings: SpBinding[]) {
  const groups: { label: string; rows: SpBinding[] }[] = [];
  const index = new Map<string, (typeof groups)[number]>();
  for (const b of bindings) {
    // A declaration without a token earns a row only when it is visible and actually won, and
    // not when it is the universal reset (`* { padding: 0 }`), which every element would repeat.
    if (!b.tokens.length && (b.src === "*" || !VISIBLE_PROPS.has(b.prop) || b.state !== "applied"))
      continue;
    const from = b.inheritedFrom;
    const label =
      (b.src || "inline") +
      b.pseudo +
      (from ? ` · inherited from ${from.tag}${from.cls ? `.${from.cls.split(/\s+/)[0]}` : ""}` : "");
    let group = index.get(label);
    if (!group) {
      group = { label, rows: [] };
      index.set(label, group);
      groups.push(group);
    }
    group.rows.push(b);
  }
  return groups;
}

function Properties({
  node,
  bindings,
  tokens,
  onToken,
  onSelect,
}: {
  node: SpNode;
  bindings: SpBindings | null;
  tokens: SpToken[];
  onToken: (name: string) => void;
  onSelect: (i: number) => void;
}) {
  const kinds = useMemo(() => new Map(tokens.map((t) => [t.name, t.kind])), [tokens]);
  const groups = bindings ? styleGroups(bindings.bindings) : [];
  return (
    <>
      <div className="sp-sec">
        <div className="sp-sh">
          <span className="sp-sh-t">{layerName(node)}</span>
          <span className="sp-sh-s">{layerSelector(node)}</span>
        </div>
        <div className="sp-fields">
          <Field label="X" value={node.box ? fmt(node.box.x) : "–"} />
          <Field label="Y" value={node.box ? fmt(node.box.y) : "–"} />
          <Field label="W" value={node.box ? fmt(node.box.w) : "–"} />
          <Field label="H" value={node.box ? fmt(node.box.h) : "–"} />
        </div>
      </div>

      <div className="sp-sec">
        <div className="sp-sh">
          <span className="sp-sh-t">Styles</span>
          {bindings ? (
            <span className="sp-sh-s">
              {bindings.bindings.filter((b) => b.tokens.length).length} tokens
            </span>
          ) : null}
        </div>
        {!bindings ? (
          <div className="sp-empty">resolving…</div>
        ) : !groups.length ? (
          <div className="sp-empty">No declarations reach this element.</div>
        ) : (
          groups.map((g) => (
            <div key={g.label} className="sp-src-group">
              <div className="sp-src">
                <span className="sp-src-l" title={g.label}>
                  {g.label}
                </span>
                {g.rows[0].inheritedFrom?.i != null ? (
                  <button
                    type="button"
                    className="sp-link"
                    onClick={() => onSelect(Number(g.rows[0].inheritedFrom!.i))}
                  >
                    select
                  </button>
                ) : null}
              </div>
              {g.rows.map((b, n) => (
                <div key={`${b.prop}-${n}`} className={cx("sp-decl", b.state)}>
                  <div className="sp-row">
                    <span className="sp-k">{b.prop}</span>
                    <span className="sp-vv">
                      {b.tokens.length ? (
                        b.tokens.map((t) => (
                          <TokenPill
                            key={t}
                            name={t}
                            value={b.resolved[t] ?? ""}
                            kind={kinds.get(t)}
                            lost={b.state === "overridden"}
                            onClick={() => onToken(t)}
                          />
                        ))
                      ) : (
                        <span className="sp-v plain" title={b.value}>
                          {b.value}
                        </span>
                      )}
                    </span>
                  </div>
                  {b.tokens.length ? (
                    <div className="sp-sub" title={resolvedText(b)}>
                      {resolvedText(b)}
                    </div>
                  ) : null}
                  {b.prop === "font" && b.state !== "overridden" && b.longhands.length > 1 ? (
                    <div className="sp-sub sp-longs">
                      {b.longhands
                        .filter((l) => /^font-(weight|size|family)$|^line-height$/.test(l.p))
                        .map((l) => `${l.p.replace(/^font-/, "")} ${l.v}`)
                        .join(" · ")}
                    </div>
                  ) : null}
                  {b.state !== "applied" ? (
                    <div className={cx("sp-state", b.state)} title={b.by ?? undefined}>
                      {stateText(b)}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {bindings ? (
        <div className="sp-sec">
          <div className="sp-sh">
            <span className="sp-sh-t">Computed</span>
          </div>
          {Object.entries(bindings.computed).map(([k, v]) => (
            <div key={k} className="sp-row">
              <span className="sp-k">{k}</span>
              <span className="sp-v" title={v}>
                {isColorValue(v) ? <span className="sp-sw" style={{ background: v }} /> : null}
                {v}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="sp-field">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function Assets({
  rows,
  sel,
  hov,
  onSelect,
  onHover,
}: {
  rows: AssetRow[];
  sel: number | null;
  hov: number | null;
  onSelect: (i: number) => void;
  onHover: (i: number | null) => void;
}) {
  if (!rows.length) return <div className="sp-empty">No images or vectors on this board.</div>;
  return (
    <div className="sp-scroll" onMouseLeave={() => onHover(null)}>
      <div className="sp-sh sp-sh--pad">
        <span className="sp-sh-t">Assets</span>
        <span className="sp-sh-s">{rows.length}</span>
      </div>
      {rows.map((a) => {
        const on = sel !== null && a.uses.includes(sel);
        const hovered = !on && hov !== null && a.uses.includes(hov);
        return (
          <button
            key={a.key}
            type="button"
            className={cx("sp-asset", on && "on", hovered && "hov")}
            title={`${a.name}\n${a.mime} · ${formatBytes(a.bytes)} · ${a.via === "css" ? "background" : a.via}`}
            onClick={() => onSelect(a.uses[0])}
            onMouseEnter={() => onHover(a.uses[0])}
          >
            <span className={cx("sp-th", a.via === "svg" && "svg")}>
              <img src={a.uri} alt="" />
            </span>
            <span className="sp-asset-n">
              {a.source === "file" ? a.name : <i>{a.name}</i>}
              {a.source === "alt" || a.source === "label" ? <small>{a.source}</small> : null}
            </span>
            <span className="sp-asset-d">
              {a.w && a.h ? `${fmt(a.w)} × ${fmt(a.h)}` : formatBytes(a.bytes)}
              {a.uses.length > 1 ? ` · ×${a.uses.length}` : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Tokens({
  tokens,
  groups,
  used,
  sel,
  focus,
  onSelect,
}: {
  tokens: SpToken[];
  groups: SpGroup[];
  used: number;
  sel: number | null;
  focus: string | null;
  onSelect: (i: number) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const views = useMemo(() => tokenGroups(tokens, groups), [tokens, groups]);
  useEffect(() => {
    if (!focus) return;
    list.current
      ?.querySelector(`[data-token="${CSS.escape(focus)}"]`)
      ?.scrollIntoView({ block: "center" });
  }, [focus]);
  if (!tokens.length) return <div className="sp-empty">No tokens on this board.</div>;
  return (
    <div className="sp-scroll" ref={list}>
      <div className="sp-sh sp-sh--pad">
        <span className="sp-sh-t">Tokens</span>
        <span className="sp-sh-s">
          {used} used of {tokens.length}
        </span>
      </div>
      {views.map((g, gi) => (
        <div key={`${g.name}-${gi}`} className="sp-token-group">
          {g.name ? <div className="sp-sh sp-sh--group">{g.name}</div> : null}
          {g.tokens.map((t) => {
            const via = tokenVia(t, tokens);
            const swatch = isColorValue(t.value, t.kind);
            const unused = !t.usedBy.length && !via.length;
            const here = sel !== null && t.usedBy.includes(sel);
            // Clicking the count walks the elements that use the token, one per click.
            const next = () => {
              if (!t.usedBy.length) return;
              const at = sel === null ? -1 : t.usedBy.indexOf(sel);
              onSelect(t.usedBy[(at + 1) % t.usedBy.length]);
            };
            return (
              <div
                key={t.name}
                data-token={t.name}
                className={cx("sp-token", unused && "unused", here && "on", t.name === focus && "focus")}
              >
                <div className="sp-token-row">
                  {swatch ? (
                    <span className="sp-sw" style={{ background: t.canon || t.value }} />
                  ) : (
                    <span className="sp-sw sp-sw--none" />
                  )}
                  <span className="sp-token-n" title={t.decl || t.name}>
                    {t.name}
                  </span>
                  <span className="sp-token-v" title={t.value}>
                    {t.value || "—"}
                  </span>
                  <button
                    type="button"
                    className="sp-token-u"
                    title={
                      t.usedBy.length
                        ? `used by ${t.usedBy.length} element${t.usedBy.length === 1 ? "" : "s"} — click to select`
                        : via.length
                          ? `used only through ${via.join(", ")}`
                          : "unused on this board"
                    }
                    disabled={!t.usedBy.length}
                    onClick={next}
                  >
                    {t.usedBy.length ? `×${t.usedBy.length}` : via.length ? "via" : "–"}
                  </button>
                </div>
                {t.note ? <div className="sp-token-note">{t.note}</div> : null}
                {via.length ? <div className="sp-token-note">via {via.join(", ")}</div> : null}
                {t.overrides.map((o) => (
                  <div key={o.sel} className="sp-token-note">
                    <code>{o.sel}</code> {o.decl}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
