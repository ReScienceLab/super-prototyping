import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createShapeId, useEditor, type TLCommentThreadId } from "tldraw";
import { BoardComments, BoardPins } from "./InspectorComments";
import { CanvasChromeContext } from "./canvasChrome";
import type { CanvasFileShape } from "./CanvasFileShapeUtil";
import {
  BOARD_STATUSES,
  BOARD_STATUS_LABEL,
  LAYOUT_CHANGED,
  type CanvasBoardStatus,
  boardStatusForPath,
  readCanvasAssetNames,
  useCanvasFileHtml,
  writeBoardStatus,
} from "./canvasLibrary";
import {
  injectAgent,
  type SpBinding,
  type SpBindings,
  type SpGroup,
  type SpMessage,
  type SpNode,
  type SpReady,
  type SpToken,
} from "./inspectorAgent";
import { installInspectorClicks } from "./inspectorClicks";
import {
  type AssetRow,
  PANEL_W,
  RAIL_W,
  VISIBLE_PROPS,
  assetForNode,
  assetRows,
  fitScale,
  formatBytes,
  initialLayersH,
  isColorValue,
  layersBounds,
  layerKind,
  layerName,
  layerSelector,
  nextLayersH,
  newBoardPin,
  nextPanelW,
  nextRailW,
  panelBounds,
  railBounds,
  tokenGroups,
  tokenVia,
} from "./inspectorModel";

/**
 * Panel state that outlives the board it was set on.
 *
 * The panel is keyed by path, so clicking a different board mounts a fresh one. That is right for
 * the selection and the report, which are about the board — and wrong for how the panel is
 * arranged, which is about the person: collapsing the rail or dragging it narrower only to have
 * the next board undo it is the panel arguing with the user. Kept in sessionStorage, next to the
 * board the inspector had open, so a reload does not undo it either.
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
 * The board's status, top-left of the stage, where the badge is also the control that sets it.
 *
 * On the stage rather than in the rail so it stays with the board when the rail is collapsed —
 * and it is the only place a status can be changed: the coloured tab above a board out on the
 * canvas is a read-only echo of the same value in layout.json.
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
  // lands in it never reaches this document, which is why the frame is watched separately.
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
    // through the file. The write comes back over HMR and the effect above confirms it — or the
    // failure notice below says it never landed.
    setStatus(next);
    const ok = await writeBoardStatus(path, next);
    setFailed(!ok);
    // A status click edits a file in the user's repo, and nothing else on the canvas undoes it —
    // tldraw's history knows only about shapes. So the way back is offered here, briefly, rather
    // than left to be typed back into layout.json by hand.
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

  if (!import.meta.env.DEV) {
    return <span className={`sp-status sp-status--${status}`}>{badge}</span>;
  }

  return (
    // The menu is dismissed by any pointerdown on the window, so the control has to keep its own
    // out of that — otherwise opening it closes it in the same gesture.
    <div className="sp-status-wrap" onPointerDown={(event) => event.stopPropagation()}>
      <button
        type="button"
        className={`sp-status sp-status--${status}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Status: ${BOARD_STATUS_LABEL[status]} — click to change`}
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
 * The docked inspector: a large preview of the clicked board on the left, a resizable and
 * collapsible rail on the right with layers and properties, the board's images, and its design tokens. The board is
 * loaded a second time into a scripted frame (inspectorAgent.ts), which is how the panel reads
 * what the canvas's own sandboxed frames cannot.
 */

/**
 * A divider drag. `from` is read at pointerdown, so the handler works off the value the drag
 * started at rather than accumulating rounding error, and `apply` gets that value with the
 * pointer delta along one axis.
 *
 * Pointer capture is the whole trick: the preview is an iframe, and without capture the first
 * move over it delivers the event to the frame's document instead, which ends the drag the
 * moment the pointer crosses into the board.
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

type Tab = "inspect" | "assets" | "tokens";

const fmt = (n: number) => String(Math.round(n * 100) / 100);
const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/** Wiring component: lives inside <Tldraw> so it can reach the editor. */
export function InspectorClicks({ onPick }: { onPick: (shape: CanvasFileShape) => void }) {
  const editor = useEditor();
  useEffect(() => installInspectorClicks(editor, onPick), [editor, onPick]);
  return null;
}

export function InspectorPanel({
  path,
  name,
  size,
  onClose,
}: {
  path: string;
  name: string;
  /** The shape's own size, which is the artboard's: the frame is created at it. */
  size: { w: number; h: number };
  onClose: () => void;
}) {
  const html = useCanvasFileHtml(path);
  const srcDoc = useMemo(() => (html ? injectAgent(html) : ""), [html]);
  const frame = useRef<HTMLIFrameElement>(null);
  const [data, setData] = useState<SpReady | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [hov, setHov] = useState<number | null>(null);
  const [bindings, setBindings] = useState<SpBindings | null>(null);
  const [tab, setTab] = useState<Tab>("inspect");
  const [focusToken, setFocusToken] = useState<string | null>(null);
  const [panelW, setPanelW] = useStickyPanelState("sp:panel-w", PANEL_W);
  const [railW, setRailW] = useStickyPanelState("sp:rail-w", RAIL_W);
  const [layersH, setLayersH] = useStickyPanelState(
    "sp:layers-h",
    initialLayersH(window.innerHeight),
  );
  const [win, setWin] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [railOpen, setRailOpen] = useStickyPanelState("sp:rail-open", true);
  const stage = useRef<HTMLDivElement>(null);
  // The comments on this board are the canvas's own, reached through the chrome context
  // because the panel renders beside `<Tldraw>` rather than under it.
  const editor = useContext(CanvasChromeContext).editor;
  const shapeId = useMemo(() => createShapeId(`canvas-file:${path}`), [path]);
  const [openThread, setOpenThread] = useState<TLCommentThreadId | null>(null);

  useEffect(() => {
    const onResize = () => setWin({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const [scale, setScale] = useState(1);
  const { w: boardW, h: boardH } = size;

  /**
   * The board is scaled to fit the stage rather than pinned at a constant, because every one of
   * the three controls below changes how much stage there is. Contain, never past 1:1 — a phone
   * board blown up past its own pixels is a blurrier board, not a bigger one — and a landscape
   * evidence board fits by width and leaves the height alone.
   */
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => {
      setScale(fitScale({ w: el.clientWidth, h: el.clientHeight }, { w: boardW, h: boardH }));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
    // Not `size`: App builds that object fresh every render, so depending on it would tear the
    // observer down and rebuild it on each one.
  }, [boardW, boardH]);

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
  }, []);

  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: "sp:sel", i: sel }, "*");
  }, [sel]);

  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: "sp:hover", i: hov }, "*");
  }, [hov]);

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

  // Clamped here, not only where they are set: see the note on `nextPanelW`. The raw state is
  // what a drag started from, these are what is rendered and what the next drag reads back.
  const panel = nextPanelW(panelW, 0, win.w);
  const rail = nextRailW(railW, 0, panel);
  const layers = nextLayersH(layersH, 0, win.h);

  const setPanel = {
    from: () => panel,
    apply: (w0: number, dx: number) => setPanelW(nextPanelW(w0, dx, win.w)),
  };
  const setRail = {
    from: () => rail,
    apply: (w0: number, dx: number) => setRailW(nextRailW(w0, dx, panel)),
  };
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
      {/* The panel is docked right, so its left edge is the one that resizes it: drag left, wider. */}
      <div
        className="sp-grip sp-grip--x"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize inspector"
        aria-valuenow={panel}
        aria-valuemin={panelBounds(win.w)[0]}
        aria-valuemax={panelBounds(win.w)[1]}
        tabIndex={0}
        onPointerDown={divider("x", setPanel.from, setPanel.apply)}
        onKeyDown={dividerKeys("x", setPanel.from, setPanel.apply)}
      />
      <div className="sp-preview">
        <div className="sp-stage" ref={stage}>
          <div
            className="sp-board"
            style={{ width: size.w, height: size.h, transform: `scale(${scale})` }}
          >
            {/*
              Mounted only once the HTML is here, and keyed by path so a different board is a
              different element. A board arrives asynchronously, so rendering the frame eagerly
              gives it `srcdoc=""` and then mutates the attribute a tick later — and Chrome drops
              that second navigation while the first is still pending, leaving a frame that is
              permanently blank. Creating the element with its final srcdoc avoids the mutation.
            */}
            {srcDoc ? (
              <iframe
                key={path}
                ref={frame}
                title={name}
                srcDoc={srcDoc}
                sandbox="allow-scripts"
                onLoad={() => frame.current?.contentWindow?.postMessage({ type: "sp:hello" }, "*")}
                style={{ width: size.w, height: size.h, border: 0, display: "block" }}
              />
            ) : null}
            {editor ? (
              <BoardPins
                editor={editor}
                shapeId={shapeId}
                scale={scale}
                open={openThread}
                onOpen={setOpenThread}
              />
            ) : null}
          </div>
          <BoardStatus path={path} />
          <span className="sp-zoom">{Math.round(scale * 100)}%</span>
          {/*
            Lives on the stage, not in the rail, so that collapsing the rail does not also hide the
            only way back — Escape does not help here, because clicking the preview moves focus into
            the frame and the agent forwards no keys.
          */}
          <button
            type="button"
            className="sp-collapse"
            aria-expanded={railOpen}
            title={railOpen ? "Hide details" : "Show details"}
            aria-label={railOpen ? "Hide details" : "Show details"}
            onClick={() => setRailOpen((v) => !v)}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d={railOpen ? "M7.5 2l4 4-4 4M4.5 2l-4 4 4 4" : "M2 2l4 4-4 4M7.5 2l4 4-4 4"} />
            </svg>
          </button>
        </div>
        {editor ? (
          <BoardComments
            editor={editor}
            shapeId={shapeId}
            open={openThread}
            onOpen={setOpenThread}
            pinAt={newBoardPin(node?.box, size)}
          />
        ) : null}
      </div>

      {railOpen ? (
        <div
          className="sp-grip sp-grip--x"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize details"
          aria-valuenow={rail}
          aria-valuemin={railBounds(panel)[0]}
          aria-valuemax={railBounds(panel)[1]}
          tabIndex={0}
          onPointerDown={divider("x", setRail.from, setRail.apply)}
          onKeyDown={dividerKeys("x", setRail.from, setRail.apply)}
        />
      ) : null}

      <div className="sp-rail" style={{ width: rail, display: railOpen ? undefined : "none" }}>
        <header className="sp-head">
          <span className="sp-head-name" title={path}>
            {name}
          </span>
          <span className="sp-head-dim">
            {data ? `${fmt(data.size.w)} × ${fmt(data.size.h)}` : "reading board…"}
          </span>
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
              onSelect={setSel}
              onHover={setHov}
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
      </div>
    </aside>
  );
}

/** The vector asset, to the clipboard: the markup as it stands alone, for Figma or another gen.py. */
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

/**
 * A flat list in document order, indented by depth. It does not scale to the biggest boards
 * (352 elements on `luma-ios/11-home-nearby`); a collapsing tree or a text-and-image filter
 * is the open question, not taken up here.
 */
function Layers({
  nodes,
  height,
  sel,
  hov,
  names,
  onSelect,
  onHover,
}: {
  nodes: SpNode[];
  height: number;
  sel: number | null;
  hov: number | null;
  names: Map<number, string>;
  onSelect: (i: number) => void;
  onHover: (i: number | null) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (sel === null) return;
    list.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);
  // An icon is one layer: the paths inside an svg stay indexed (the Tokens tab counts uses on
  // them) but are not listed.
  const rows = nodes.filter((n) => !n.inSvg);
  return (
    <div className="sp-layers" style={{ height }} ref={list} onMouseLeave={() => onHover(null)}>
      <div className="sp-sh">
        <span className="sp-sh-t">Layers</span>
        <span className="sp-sh-s">{Math.max(0, rows.length - 1)}</span>
      </div>
      {rows.map((n) => (
        <button
          key={n.i}
          type="button"
          data-i={n.i}
          className={cx("sp-layer", n.i === sel && "on", n.i === hov && n.i !== sel && "hov")}
          style={{ paddingLeft: 12 + n.depth * 12 }}
          title={layerSelector(n)}
          onClick={() => onSelect(n.i)}
          onMouseEnter={() => onHover(n.i)}
        >
          <LayerIcon kind={layerKind(n)} />
          <span className="sp-layer-n">{layerName(n, names.get(n.i))}</span>
          {n.i === 0 && n.box ? (
            <span className="sp-layer-d">
              {fmt(n.box.w)} × {fmt(n.box.h)}
            </span>
          ) : null}
        </button>
      ))}
    </div>
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

function Row({ k, v }: { k: string; v: string }) {
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
