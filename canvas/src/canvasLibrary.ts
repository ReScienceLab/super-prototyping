import { useEffect, useReducer } from "react";
import { WELCOME_PAGE_SLUG } from "./canvasUrl";

// Auto-discovers the boards dropped under <canvases dir>/<slug>/*.html, one folder per board
// (a cloned app, a feature round, a design-system sheet). Each folder becomes a tldraw page; each
// HTML file in it becomes one shape. Add or edit files there; nothing here needs to change.
//
// Everything here reads the index the page fetched from `/__sp/index.json` before it imported
// this module (canvasIndex.ts): the server scans the project's `canvases` per request, a build
// wrote it once for this repo's own canvases. It was a module generated at build time
// until the canvas became a served app, and `import.meta.glob` calls before that: a glob
// pattern is a string literal resolved at build time, so it could only ever read one
// hard-coded directory, never the boards of whoever installed it.
//
// Boards stay lazy — one fetch per file, the first time a shape asks for it, so opening the
// welcome page pulls a dozen covers rather than every board (the full set is 25 MB of HTML,
// which a phone should not download to look at one page). Layouts and icons come with the
// index because they are read during render.
import { BOARDS_CHANGED, canvasIndex } from "./canvasIndex";
import { coverBoard, inStripOrder } from "./cover";
export { CANVAS_FILE_DEFAULT_SIZE, DEFAULT_COVER_BOX, fitCover } from "./cover";
export { LAYOUT_CHANGED } from "./canvasIndex";

const boards = () => canvasIndex().boards;
const board = (slug: string) => boards().find((b) => b.slug === slug);

/**
 * The address of a file inside a board folder, `/board/<slug>/<file>`: the server reads it off
 * the boards directory, a build emits it as a file (see the `prototyping-canvases` plugin).
 * encodeURI, not encodeURIComponent: the server decodes the request path with decodeURI, so
 * only an encoding decodeURI reverses survives the round trip. That is also why `#` and `?` in
 * a name cannot be encoded away at all, and are dropped at scan time instead.
 */
export const boardFileUrl = (slug: string, file: string) =>
  `${import.meta.env.BASE_URL}board/${encodeURI(slug)}/${encodeURI(file)}`;

/**
 * What the canvas calls a board: the key its shape id is built from. It keeps the historical
 * `../../mockups/canvases/<slug>/<file>` spelling of the `import.meta.glob` days, because a
 * persisted tldraw document holds shapes seeded from it and a respelling would orphan them all.
 */
const boardKey = (slug: string, file: string) =>
  `../../mockups/canvases/${slug}/${file}`;

export interface CanvasLibraryFile {
  path: string;
  pageSlug: string;
  pageName: string;
  fileName: string;
  title: string;
}

/**
 * A row's file, either by name alone (uses that file's humanized title) or with a label
 * override. `w`/`h` override the 478 x 980 artboard for a board that is not phone-shaped,
 * a landscape banner say; a row is laid out at its first file's size, so give every file
 * in the row the same one.
 */
export type CanvasLayoutFileEntry =
  | string
  | {
      file: string;
      label?: string;
      w?: number;
      h?: number;
    };

/** A button under a row that opens an address in a new tab. */
export interface CanvasLayoutLink {
  label: string;
  url: string;
}

/**
 * A picture in a row, laid out as a tldraw image shape rather than a board: a logo, a screenshot
 * of someone else's marketing, an ad creative. `file` is relative to the folder and has to live
 * under `assets/brand/`, which is the only part of `assets/` the plugin gives an address to.
 *
 * `w`/`h` are the image's own pixel size, not the size it draws at — the row scales every image
 * to a common band from them, so a wrong pair renders the wrong shape.
 */
export interface CanvasLayoutImage {
  file: string;
  label: string;
  w: number;
  h: number;
  /** The human page this came from, and whether the company published it or an archive did. */
  source?: string;
  provenance?: string;
}

export interface CanvasLayoutRow {
  title: string;
  /** The boards in this row. Omitted by a row that carries `images` instead. */
  files?: CanvasLayoutFileEntry[];
  /** Pictures in this row, instead of boards. A row is one or the other, never both. */
  images?: CanvasLayoutImage[];
  /** Prefix each caption with its 1-based position in `files`, e.g. "3 · Referral". */
  numbered?: boolean;
  /**
   * Buttons under this row's boards. Boards render in `<iframe srcDoc sandbox="">`, where a
   * link cannot navigate anything, so anything clickable has to be a shape out here.
   */
  links?: CanvasLayoutLink[];
}

export interface CanvasLayoutConfig {
  /**
   * Page name override. Without one the folder slug is humanized, which cannot
   * express casing or punctuation: "notion-ios" becomes "Notion Ios", never
   * "(example) Notion iOS". Set this when the humanized name reads wrong. Every
   * folder shipped with the repo is an example, and says so as a "(example) "
   * prefix, so a board of your own stands out from them in the page menu.
   */
  name?: string;
  /**
   * Board that stands in for this folder on the welcome page, by file name,
   * e.g. "00-launch-light". Without one the cover is the folder's first board
   * that is not a 00- sheet, which is a token board on most of them.
   */
  cover?: string;
  /**
   * Where the folder sits in the page menu and the welcome row: lower first, default 0,
   * ties keep slug order. The welcome page stays on top whatever anyone declares.
   */
  order?: number;
  /**
   * The part of the cover board a welcome card shows, `[x, y, w, h]` in board px.
   * Default is the phone frame every folder here draws at the same place, so cards
   * crop to the mockup instead of framing it in artboard margin. Declare one for a
   * board that is not a phone, e.g. a full-bleed sheet: `[0, 0, 478, 980]`.
   */
  coverBox?: [number, number, number, number];
  /**
   * The canvas's ground, a `#rrggbb` the boards sit on. Without one it is the theme's dark grey.
   * Set from the canvas's Background menu, which writes it here.
   */
  ground?: string;
  rows: CanvasLayoutRow[];
}

/**
 * The board that stands in for a folder on the welcome page and the home page: the one its
 * layout.json names, else its first screen rather than its 00- board, which is a token sheet on
 * every example and would make the cards look alike.
 */
export function coverFile(files: CanvasLibraryFile[]) {
  const name = coverBoard(
    files.map((file) => file.fileName),
    readCanvasLayout(files[0].pageSlug),
  );
  return files.find((file) => file.fileName === name)!;
}

export function humanize(slug: string) {
  return slug
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const FILE_PATTERN = /canvases\/([^/]+)\/([^/]+)\.html$/;

/** The tldraw page name for a folder: its layout.json `name`, else the humanized slug. */
export function pageNameFor(pageSlug: string) {
  return readCanvasLayout(pageSlug)?.name ?? humanize(pageSlug);
}

/**
 * The same name with the shelf taken off: "(example) Claude iOS" reads as "Claude iOS". The
 * brand pages want the product, because there every name on screen carries the same prefix and
 * it is the twelve characters before the word you are looking for.
 */
export const shortName = (pageSlug: string) =>
  pageNameFor(pageSlug).replace(/^\(example\)\s*/, "");

function parse(path: string): CanvasLibraryFile | null {
  const match = FILE_PATTERN.exec(path);
  if (!match) return null;
  const [, pageSlug, fileName] = match;
  return {
    path,
    pageSlug,
    pageName: pageNameFor(pageSlug),
    fileName,
    title: humanize(fileName),
  };
}

/**
 * Appended to every board. A wheel event whose target is inside an iframe never reaches the
 * parent document, so tldraw's own fix for this — preventDefault on the wheel that reaches its
 * container, in useGestureEvents — never runs, and the browser turns the horizontal part of a
 * two-finger pan into a back navigation. The page's own `overscroll-behavior: none` in index.css
 * cannot reach in: overscroll chains one frame at a time, so a board has to stop the chain in its
 * own document. Every iframe in this app gets one, because the ones that can be panned over are
 * not the same set in every browser and the fix has already been missed once per site.
 *
 * Appended rather than spliced: 37 of the repo's 180 boards emit no `</body>`, and a tag put
 * before the doctype would drop the board into quirks mode. A trailing `<style>` is parsed into
 * the body, and the inspector agent skips STYLE elements, so this adds no layer.
 */
const NO_OVERSCROLL = "<style>html{overscroll-behavior:none}</style>";

/** path -> the HTML every board iframe renders, for every file fetched so far. */
export const canvasFileHtml = new Map<string, string>();
const canvasFileLoads = new Map<string, Promise<string | undefined>>();

/** Whether a discovered board exists at this path, loaded or not. */
export function hasCanvasFile(path: string) {
  return boardPageUrl(path) !== undefined;
}

/**
 * Fetches a board's HTML once and caches it; resolves undefined for a path that is not a board.
 * `again` fetches a board rewritten on disk, keeping the old HTML in the cache until the new one
 * is in, so its shape never goes blank in between.
 */
export function loadCanvasFileHtml(path: string, again = false): Promise<string | undefined> {
  const cached = canvasFileHtml.get(path);
  if (cached !== undefined && !again) return Promise.resolve(cached);
  const url = boardPageUrl(path);
  if (!url) return Promise.resolve(undefined);
  let load = canvasFileLoads.get(path);
  if (!load) {
    // A board that 404s has to reject rather than resolve with the server's error page: the
    // canvas would put that page in the frame and call it the board.
    load = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${url}: ${r.status}`);
        return r.text();
      })
      .then((html) => {
        const board = html + NO_OVERSCROLL;
        canvasFileHtml.set(path, board);
        return board;
      })
      // A fetch can fail — a board deleted between discovery and first render, a server
      // restart mid-flight. Without this the rejected promise stays in the map and
      // the shape is blank for good, because every later call hands back the same rejection.
      .catch(() => undefined)
      .finally(() => {
        canvasFileLoads.delete(path);
      });
    canvasFileLoads.set(path, load);
  }
  return load;
}

/**
 * Where a board is a web page of its own, for the buttons that open one, and undefined for a
 * path that is not a board. `/board/<slug>/<file>.html`, the same file the shape fetches.
 *
 * An address rather than the `blob:` URL this was at first. A blob has no address to link, copy
 * or reload, and it is a page the browser calls restricted, which is enough for an extension —
 * a Figma importer, a reader, a screenshotter — to refuse to work on it at all.
 */
export function boardPageUrl(path: string): string | undefined {
  const file = parse(path);
  const html = file && `${file.fileName}.html`;
  return html && board(file.pageSlug)?.html.includes(html)
    ? boardFileUrl(file.pageSlug, html)
    : undefined;
}

/**
 * A rendering shape's board HTML: undefined until its chunk arrives, then the string. Every shape
 * on the page mounts (culling only hides the off-screen ones), so a page fetches its own boards
 * and nothing else. The cache is the source of truth and state is only a re-render tick, so a
 * shape whose path changes reads the new path's HTML on the same render instead of showing the
 * old board for a frame.
 */
export function useCanvasFileHtml(path: string): string | undefined {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    let live = true;
    const load = (again: boolean) =>
      loadCanvasFileHtml(path, again).then(() => {
        if (live) rerender();
      });
    if (!canvasFileHtml.has(path)) void load(false);
    const changed = (event: Event) => {
      const rewritten = (event as CustomEvent<string[]>).detail;
      if (rewritten.some((file) => path.endsWith(`canvases/${file}`))) void load(true);
    };
    window.addEventListener(BOARDS_CHANGED, changed);
    return () => {
      live = false;
      window.removeEventListener(BOARDS_CHANGED, changed);
    };
  }, [path]);
  return canvasFileHtml.get(path);
}

/** This board's layout.json, if it dropped one next to its HTML files. */
export function readCanvasLayout(
  pageSlug: string,
): CanvasLayoutConfig | undefined {
  return board(pageSlug)?.layout;
}

/** Whether this page collected any brand material: the brand page of one that did not is empty. */
export function hasBrandMaterial(pageSlug: string) {
  return (readCanvasLayout(pageSlug)?.rows ?? []).some(
    (row) => row.images?.length,
  );
}

/** Every page that collected brand material, in folder order — what the brand page switches between. */
export function brandMaterialSlugs() {
  return boards()
    .map((b) => b.slug)
    .filter((slug) => hasBrandMaterial(slug));
}

/**
 * This folder's inlined images by payload key, if it committed the files they came from: the
 * inspector's Assets tab joins a board's data: URIs against it to put a file name next to each
 * one. Undefined for a folder with no `assets/`, `assets-dark/` or `assets.json`.
 */
export function readCanvasAssetNames(pageSlug: string) {
  const assets = board(pageSlug)?.assets;
  return assets && Object.keys(assets).length ? assets : undefined;
}

/** This folder's app icon, if it dropped one next to its HTML files. */
export function canvasIconUrl(pageSlug: string) {
  return board(pageSlug)?.icon ? boardFileUrl(pageSlug, "icon.png") : undefined;
}

/** A folder's brand image by its path inside the folder, e.g. `assets/brand/social/x-banner.jpg`. */
export function canvasImageUrl(pageSlug: string, file: string) {
  return board(pageSlug)?.brand.includes(file)
    ? boardFileUrl(pageSlug, file)
    : undefined;
}

/**
 * What the canvas calls one picture in one folder: the key its image shape and its asset record
 * are both built from. `canvasImageRef` reads it back, so a click out on the canvas can find the
 * layout entry behind the shape it landed on.
 */
export const canvasImageKey = (pageSlug: string, file: string) =>
  `canvas-image:${pageSlug}/${file}`;

const IMAGE_SHAPE_PATTERN = /^shape:canvas-image:([^/]+)\/(.+)$/;

/**
 * The folder and file behind a board's path, which is the module path the generated index keys
 * it by and not an address: `<slug>/<file>.html` is what the server and the agent know it as.
 */
export function canvasBoardRef(path: string) {
  const file = parse(path);
  return file
    ? { slug: file.pageSlug, file: `${file.fileName}.html` }
    : undefined;
}

/** The folder and file behind a brand image's shape id, or undefined for any other shape. */
export function canvasImageRef(shapeId: string) {
  const match = IMAGE_SHAPE_PATTERN.exec(shapeId);
  return match ? { slug: match[1], file: match[2] } : undefined;
}

/** What that folder's layout.json says about the file, and the row it listed it in. */
export function readCanvasImage(pageSlug: string, file: string) {
  for (const row of readCanvasLayout(pageSlug)?.rows ?? []) {
    const image = row.images?.find((entry) => entry.file === file);
    if (image) return { row: row.title, image };
  }
  return undefined;
}

/**
 * The same image at `BRAND_THUMB_EDGE`, when one was generated for it. This is what the brand
 * page and the canvas draw; the original is what they fall back to the moment either is asked
 * to show the picture larger than the variant covers.
 */
export function canvasImageThumbUrl(pageSlug: string, file: string) {
  return board(pageSlug)?.thumbs.includes(file)
    ? boardFileUrl(pageSlug, `__thumbs/${file}.webp`)
    : undefined;
}

export const BRAND_THUMB_EDGE = canvasIndex().thumbEdge;

/**
 * Original brand-image URL to its variant. tldraw's asset resolver is handed an asset record
 * rather than a page and a file, so the URL it already holds is the only key it can look up by.
 */
let thumbBySrc: Map<string, string> | undefined;

/** The variant for an original's URL, or undefined for an asset that kept its original. */
export function brandThumbForSrc(src: string) {
  thumbBySrc ??= new Map(
    boards().flatMap((b) =>
      b.thumbs.map((file) => [
        boardFileUrl(b.slug, file),
        boardFileUrl(b.slug, `__thumbs/${file}.webp`),
      ]),
    ),
  );
  return thumbBySrc.get(src);
}

/**
 * Every canvas folder, with its boards sorted by filename. A folder can have none yet: one made
 * with the canvas strip's "+" is a page to draw on until the agent or the reader adds a board.
 */
export function readCanvasLibrary(): { slug: string; files: CanvasLibraryFile[] }[] {
  const canvases = boards().map((b) => ({
    slug: b.slug,
    files: b.html
      .map((html) => parse(boardKey(b.slug, html)))
      .filter((file): file is CanvasLibraryFile => file !== null)
      .sort((a, b) =>
        a.fileName.localeCompare(b.fileName, undefined, { numeric: true }),
      ),
  }));
  return inStripOrder(
    canvases,
    (c) => c.slug,
    (c) =>
      c.slug === WELCOME_PAGE_SLUG
        ? -Infinity
        : (readCanvasLayout(c.slug)?.order ?? 0),
  );
}

/**
 * Id prefixes of everything the library places: boards, row headings, captions, and the cards
 * and buttons that open things. They are all created locked, and `lockLibraryShapes` locks any
 * that a browser persisted before that was so. Locked, a shape cannot be selected, so a reader
 * who means to pinch or scroll cannot drag a board out of its row by accident; the camera is the
 * only thing that moves. The layout is declared in layout.json, so a board is never repositioned
 * by hand anyway. Anything a person draws on top stays unlocked and editable.
 */
const LIBRARY_SHAPE_PREFIXES = [
  "shape:canvas-file:",
  "shape:canvas-image:",
  "shape:canvas-row-heading:",
  "shape:canvas-file-label:",
  "shape:canvas-link:",
  // Placed by no pass any more; listed so the sweep clears any a browser still holds.
  "shape:canvas-status-banner:",
];

export function isLibraryShapeId(id: string) {
  return LIBRARY_SHAPE_PREFIXES.some((prefix) => id.startsWith(prefix));
}
