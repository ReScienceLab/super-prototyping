/**
 * What the inspector panel derives from an agent report before drawing it. Pure functions, so
 * the joins and fallbacks are testable without a frame.
 */
import type { SpAsset, SpGroup, SpNode, SpToken, SpTokenKind } from "./inspectorAgent";

/** Where an asset's name came from, so a fallback is never passed off as a file name. */
export type AssetNameSource = "file" | "alt" | "none";

export interface AssetRow {
  key: string;
  name: string;
  source: AssetNameSource;
  bytes: number;
  w: number;
  h: number;
  mime: string;
  via: "img" | "css";
  uri: string;
  uses: number[];
}

/**
 * Joins the board's images against the folder's committed files by content. A generator that
 * re-encodes (a PIL resize) produces bytes that match nothing, so the image's alt text is the
 * fallback, and after that its format and size.
 */
export function assetRows(
  assets: SpAsset[],
  names: Record<string, { name: string; bytes: number }> | undefined,
): AssetRow[] {
  return assets.map((a) => {
    const hit = names?.[a.key];
    const format = a.mime.replace(/^image\//, "") || "image";
    const name = hit ? hit.name : a.alt || `${format} ${a.w}×${a.h}`;
    return {
      key: a.key,
      name,
      source: hit ? "file" : a.alt ? "alt" : "none",
      // A base64 payload decodes to three bytes per four characters, less any padding.
      bytes: hit ? hit.bytes : Math.floor((a.chars * 3) / 4),
      w: a.w,
      h: a.h,
      mime: a.mime,
      via: a.via,
      uri: a.uri,
      uses: a.uses,
    };
  });
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export type LayerKind = "frame" | "image" | "text" | "box";

export function layerKind(node: SpNode): LayerKind {
  if (node.i === 0) return "frame";
  if (node.img) return "image";
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
