/**
 * What the inspector panel derives from an agent report before drawing it. Pure functions, so
 * the joins and fallbacks are testable without a frame.
 */
import type { TLCommentAnchor, TLShapeId } from "tldraw";
import type { SpAsset, SpBox, SpGroup, SpNode, SpToken, SpTokenKind } from "./inspectorAgent";

/**
 * Where an asset's name came from, so a fallback is never passed off as a file name: `alt` is an
 * image's own, `label` is a vector's guess from the class or the caption beside it.
 */
export type AssetNameSource = "file" | "alt" | "label" | "none";

export interface AssetRow {
  key: string;
  name: string;
  source: AssetNameSource;
  bytes: number;
  w: number;
  h: number;
  mime: string;
  via: SpAsset["via"];
  uri: string;
  /** The standalone markup of a vector; what Copy SVG hands out. */
  svg?: string;
  uses: number[];
}

/**
 * Joins the board's images against the folder's committed files by content. A generator that
 * re-encodes (a PIL resize) produces bytes that match nothing, so the image's alt text is the
 * fallback, and after that its format and size. A vector joins on its geometry, and falls back
 * to the label the agent guessed for it.
 */
export function assetRows(
  assets: SpAsset[],
  names: Record<string, { name: string; bytes: number }> | undefined,
): AssetRow[] {
  return assets.map((a) => {
    const vector = a.via === "svg";
    // A vector's key is its geometry key and then the colours it was drawn in; the file joins on
    // the geometry alone, so a red and a black instance of one glyph are two rows with one name.
    const hit = names?.[vector ? a.key.slice(0, a.key.lastIndexOf(":")) : a.key];
    const format = a.mime.replace(/^image\//, "").replace(/\+xml$/, "") || "image";
    const name = hit ? hit.name : a.alt || `${format} ${a.w}×${a.h}`;
    return {
      key: a.key,
      name,
      source: hit ? "file" : !a.alt ? "none" : vector ? "label" : "alt",
      // A base64 payload decodes to three bytes per four characters, less any padding; a vector
      // is its own text.
      bytes: hit ? hit.bytes : vector ? a.chars : Math.floor((a.chars * 3) / 4),
      w: a.w,
      h: a.h,
      mime: a.mime,
      via: a.via,
      uri: a.uri,
      svg: a.svg,
      uses: a.uses,
    };
  });
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export type LayerKind = "frame" | "image" | "vector" | "text" | "box";

export function layerKind(node: SpNode): LayerKind {
  if (node.i === 0) return "frame";
  if (node.img) return node.tag === "svg" ? "vector" : "image";
  if (node.text) return "text";
  return "box";
}

/** The label a layer row shows: its text, else the image's name, else its first class, else its tag. */
export function layerName(node: SpNode, assetName?: string) {
  if (node.i === 0) return node.cls.split(/\s+/)[0] || node.tag;
  if (node.text) return node.text;
  if (node.img && assetName) return assetName;
  return node.cls.split(/\s+/)[0] || node.tag;
}

/** `div.card` for the muted suffix beside a layer's name. */
export function layerSelector(node: SpNode) {
  const cls = node.cls.split(/\s+/).filter(Boolean);
  return node.tag + (cls.length ? `.${cls.join(".")}` : "");
}

export interface TokenGroupView {
  /** The author's heading, or a kind label when the board wrote none. */
  name: string;
  tokens: SpToken[];
}

export const KIND_LABEL: Record<SpTokenKind, string> = {
  color: "Colours",
  length: "Lengths",
  number: "Numbers",
  font: "Type",
  family: "Families",
  image: "Images",
  filter: "Filters",
  shadow: "Shadows",
  other: "Other",
  unset: "Unset",
};

/**
 * The Tokens tab's groups: the `/* heading *\/` comments in `:root`, in the author's order, with
 * the tokens before the first heading in an unnamed group ahead of them and the ones defined only
 * under a scope (`.dark { --x }`) after. A board with no headings at all is grouped by kind.
 */
export function tokenGroups(tokens: SpToken[], groups: SpGroup[]): TokenGroupView[] {
  const byName = new Map(tokens.map((t) => [t.name, t]));
  const out: TokenGroupView[] = [];
  if (groups.length) {
    const leading = tokens.filter((t) => t.group === null && !t.scoped);
    if (leading.length) out.push({ name: "", tokens: leading });
    for (const g of groups) {
      const list = g.tokens.map((n) => byName.get(n)).filter((t): t is SpToken => !!t);
      if (list.length) out.push({ name: g.name, tokens: list });
    }
  } else {
    const byKind = new Map<SpTokenKind, SpToken[]>();
    for (const t of tokens) {
      if (t.scoped) continue;
      const list = byKind.get(t.kind) ?? [];
      list.push(t);
      byKind.set(t.kind, list);
    }
    for (const [kind, list] of byKind) out.push({ name: KIND_LABEL[kind], tokens: list });
  }
  const scoped = tokens.filter((t) => t.scoped);
  if (scoped.length) out.push({ name: "Scoped only", tokens: scoped });
  return out;
}

/**
 * Tokens that reach the screen only through another token's declaration (`--sa-font` inside
 * every `--sa-t-*`): the names of the used tokens that reference this one.
 */
export function tokenVia(token: SpToken, tokens: SpToken[]) {
  if (token.usedBy.length) return [];
  return tokens.filter((t) => t.usedBy.length && t.refs.includes(token.name)).map((t) => t.name);
}

/** Whether a value can be drawn as a swatch: a token of colour kind, or a colour-shaped string. */
export function isColorValue(value: string, kind?: SpTokenKind) {
  if (kind) return kind === "color";
  return /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|color\()/i.test(value.trim());
}

/**
 * Properties worth listing even when nothing binds a token to them: the visible ones. Layout
 * properties (position, width, flex, …) are in the boxes already and would drown the list.
 */
export const VISIBLE_PROPS = new Set([
  "color",
  "background",
  "background-color",
  "background-image",
  "font",
  "font-size",
  "font-weight",
  "font-family",
  "line-height",
  "letter-spacing",
  "border",
  "border-color",
  "border-bottom",
  "border-top",
  "border-radius",
  "box-shadow",
  "opacity",
  "padding",
  "gap",
  "fill",
  "stroke",
]);

/**
 * The image a selected layer draws, if it draws one. `uses` already carries the node indices
 * behind every row — it is what the Assets tab highlights with — so the selection needs no
 * second index of its own.
 */
export const assetForNode = (rows: AssetRow[], node: number | null): AssetRow | null =>
  node === null ? null : (rows.find((a) => a.uses.includes(node)) ?? null);

/* --- Panel geometry ---------------------------------------------------------------------- */

/** Starting sizes. Every one of them is a drag away from something else. */
export const PANEL_W = 736;
export const RAIL_W = 300;

/**
 * How tall the layers list opens: a share of the window rather than a constant, because the
 * boards here run to 24 layers and a fixed 240px showed nine of them on every screen size. Held
 * off both ends — a short window still owes the properties below it room, and on a tall one a
 * list past ~34 rows is scrolled, not read.
 */
export const initialLayersH = (viewport: number) => clamp(Math.round(viewport * 0.45), 200, 560);

/** Drag limits, so a divider cannot swallow the thing on the other side of it. */
const PANEL_MIN = 360;
const RAIL_GAP = 280; // canvas left visible beside the panel
const RAIL_MIN = 200;
const STAGE_MIN = 240; // preview asked for beside the rail; the rail's own minimum wins under it
const LAYERS_MIN = 72;
const LAYERS_GAP = 200; // room under the layers for the selected asset and the properties

export const clamp = (v: number, lo: number, hi: number) =>
  // lo wins a crossover: on a viewport too small for both bounds, a divider pinned to the
  // minimum is usable, one pinned to a negative maximum is not. That crossover is reachable at
  // the panel minimum, where 360 cannot hold RAIL_MIN + STAGE_MIN and the rail keeps its 200.
  Math.max(lo, Math.min(v, hi));

/**
 * What each divider may range over. Exported because the bounds are also what the grips report
 * to a screen reader and what an arrow key steps within, not only what a drag is clamped to.
 */
export const panelBounds = (viewport: number): [number, number] => [
  PANEL_MIN,
  Math.max(PANEL_MIN, viewport - RAIL_GAP),
];
export const railBounds = (panelW: number): [number, number] => [
  RAIL_MIN,
  Math.max(RAIL_MIN, panelW - STAGE_MIN),
];
export const layersBounds = (viewport: number): [number, number] => [
  LAYERS_MIN,
  Math.max(LAYERS_MIN, viewport - LAYERS_GAP),
];

/**
 * Where a divider lands. The panel and the rail are both docked right, so their left edges
 * resize them and a leftward drag — a negative dx — makes them wider. The layers list is above
 * its divider, so it follows dy directly.
 *
 * Every one of these is applied at render as well as at drag time, with a zero delta. A bound
 * moves when the window resizes or when the divider on the other side of it is dragged, and a
 * value only clamped where it was set outlives its own bound: a layers list dragged tall in a
 * tall window put its grip below the rail's bottom edge, where nothing could reach it again.
 */
export const nextPanelW = (start: number, dx: number, viewport: number) =>
  clamp(start - dx, ...panelBounds(viewport));

export const nextRailW = (start: number, dx: number, panelW: number) =>
  clamp(start - dx, ...railBounds(panelW));

export const nextLayersH = (start: number, dy: number, viewport: number) =>
  clamp(start + dy, ...layersBounds(viewport));

/** Contain, never past 1:1 — a board blown up past its own pixels is blurrier, not bigger. */
export const fitScale = (stage: { w: number; h: number }, board: { w: number; h: number }) => {
  const pad = 32;
  return Math.max(0.05, Math.min(1, (stage.w - pad) / board.w, (stage.h - pad) / board.h));
};

/**
 * Where a comment thread points on a board, when it is that board's thread at all. Normalized
 * (0–1) within the artboard, and left unclamped: a pin dropped in the margin beside the mockup
 * belongs to it — that is what anchors it to the board through a layout.json reflow — but the
 * preview only draws the ones that land on the board itself.
 */
export interface BoardPin {
  x: number;
  y: number;
  inside: boolean;
}

export function boardPin(anchor: TLCommentAnchor, shapeId: TLShapeId): BoardPin | null {
  if (anchor.type !== "shape" || anchor.shapeId !== shapeId) return null;
  const inside = anchor.x >= 0 && anchor.x <= 1 && anchor.y >= 0 && anchor.y <= 1;
  return { x: anchor.x, y: anchor.y, inside };
}

/**
 * Where a comment written in the panel is pinned: on the middle of the selected layer, so a note
 * about one button lands on that button, and on the middle of the board when nothing is selected.
 */
export function newBoardPin(box: SpBox | null | undefined, board: { w: number; h: number }) {
  if (!box) return { x: 0.5, y: 0.5 };
  return { x: (box.x + box.w / 2) / board.w, y: (box.y + box.h / 2) / board.h };
}
