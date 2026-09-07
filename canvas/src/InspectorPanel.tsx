import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "tldraw";
import type { CanvasFileShape } from "./CanvasFileShapeUtil";
import { readCanvasAssetNames, useCanvasFileHtml } from "./canvasLibrary";
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
  VISIBLE_PROPS,
  assetRows,
  formatBytes,
  isColorValue,
  layerKind,
  layerName,
  layerSelector,
  tokenGroups,
  tokenVia,
} from "./inspectorModel";

/**
 * The docked inspector: a large preview of the clicked board on the left, a fixed rail on the
 * right with layers and properties, the board's images, and its design tokens. The board is
 * loaded a second time into a scripted frame (inspectorAgent.ts), which is how the panel reads
 * what the canvas's own sandboxed frames cannot.
 */

export const INSPECTOR_WIDTH = 736;
const RAIL_WIDTH = 280;

/**
 * A constant for now. Fit-to-height from the stage is the obvious replacement — at 85% a phone
 * board overflows a 768px-tall window and wastes space on a tall one, and a landscape evidence
 * board overflows either way — but how the stage should cope with a non-phone board is not
 * decided, so the number stays until it is.
 */
const PREVIEW_SCALE = 0.85;

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

  // Escape clears the selection, and with nothing selected closes the panel.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
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
  const usedTokens = data ? data.tokens.filter((t) => t.usedBy.length).length : 0;

  const jumpToToken = (token: string) => {
    setTab("tokens");
    setFocusToken(token);
  };

  return (
    <aside className="sp-panel" style={{ width: INSPECTOR_WIDTH }}>
      <div className="sp-stage">
        <div
          className="sp-board"
          style={{ width: size.w, height: size.h, transform: `scale(${PREVIEW_SCALE})` }}
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
              onLoad={() =>
                frame.current?.contentWindow?.postMessage({ type: "sp:hello" }, "*")
              }
              style={{ width: size.w, height: size.h, border: 0, display: "block" }}
            />
          ) : null}
        </div>
        <span className="sp-zoom">{Math.round(PREVIEW_SCALE * 100)}%</span>
      </div>

      <div className="sp-rail" style={{ width: RAIL_WIDTH }}>
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
              sel={sel}
              hov={hov}
              names={assetNameByNode}
              onSelect={setSel}
              onHover={setHov}
            />
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
                  assets={assets.length}
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

function LayerIcon({ kind }: { kind: ReturnType<typeof layerKind> }) {
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
  sel,
  hov,
  names,
  onSelect,
  onHover,
}: {
  nodes: SpNode[];
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
  return (
    <div className="sp-layers" ref={list} onMouseLeave={() => onHover(null)}>
      <div className="sp-sh">
        <span className="sp-sh-t">Layers</span>
        <span className="sp-sh-s">{Math.max(0, nodes.length - 1)}</span>
      </div>
      {nodes.map((n) => (
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
  assets: number;
  usedTokens: number;
}) {
  const file = path.slice(path.lastIndexOf("/") + 1);
  const root = data.nodes[0];
  return (
    <div className="sp-sec">
      <div className="sp-sh">
        <span className="sp-sh-t">{name}</span>
        <span className="sp-sh-s">{file}</span>
      </div>
      <Row k="Frame" v={root?.box ? `${fmt(root.box.w)} × ${fmt(root.box.h)}` : "–"} />
      <Row k="Layers" v={String(Math.max(0, data.nodes.length - 1))} />
      <Row k="Images" v={String(assets)} />
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
  if (!rows.length) return <div className="sp-empty">No images on this board.</div>;
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
            title={`${a.name}\n${a.mime} · ${formatBytes(a.bytes)} · ${a.via === "css" ? "background" : "img"}`}
            onClick={() => onSelect(a.uses[0])}
            onMouseEnter={() => onHover(a.uses[0])}
          >
            <span className="sp-th">
              <img src={a.uri} alt="" />
            </span>
            <span className="sp-asset-n">
              {a.source === "file" ? a.name : <i>{a.name}</i>}
              {a.source === "alt" ? <small>alt</small> : null}
            </span>
            <span className="sp-asset-d">
              {a.w && a.h ? `${a.w} × ${a.h}` : formatBytes(a.bytes)}
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
