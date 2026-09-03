import { useEffect, useState } from "react";

// Auto-discovers the boards dropped under mockups/canvases/<slug>/*.html, one folder per board
// (a cloned app, a feature round, a design-system sheet). Each folder becomes a tldraw page; each
// HTML file in it becomes one shape. Add or edit files there; nothing here needs to change.
// Each file is its own lazy module, fetched the first time a shape draws it live (see
// useBoardLive in BoardMedia.tsx), so opening a page pulls its thumbnails and the few
// boards big enough on screen to need their document, rather than every board in the repo (the
// full set is 25 MB of HTML, which a phone should not download to look at one page). Vite still
// reloads the page when a mockup is saved, so the edit shows up on the canvas the same as before.
const fileLoaders = import.meta.glob("../../mockups/canvases/*/*.html", {
  query: "?raw",
  import: "default",
}) as Record<string, () => Promise<string>>;

// Optional mockups/canvases/<slug>/layout.json alongside the HTML files declares that board's
// themed rows, so this tool's code never has to know one board's design content from another's.
// See CanvasLayoutConfig below for the shape.
const rawLayouts = import.meta.glob("../../mockups/canvases/*/layout.json", {
  eager: true,
  import: "default",
}) as Record<string, CanvasLayoutConfig>;

// Optional mockups/canvases/<slug>/icon.png, the app's own mark, badged on that folder's
// welcome card. `?url` so Vite emits the file and hands back its address, rather than inlining
// a 30-90 kB icon into the bundle as base64.
const rawIcons = import.meta.glob("../../mockups/canvases/*/icon.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

// Optional mockups/canvases/<slug>/thumbs/<board>.webp, the board at THUMB_SCALE, written by
// `python3 tools/refkit.py thumbs mockups/canvases/<slug>` after gen.py. A shape draws it in
// place of the live board while the board is small on screen; a board without one is always
// live. `?url` for the same reason as the icons.
const rawThumbs = import.meta.glob("../../mockups/canvases/*/thumbs/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

/** Thumbnail px per board px. tools/refkit.py THUMB_SCALE writes them at this; keep the two equal. */
export const THUMB_SCALE = 0.5;

/** A board's thumbnail module path: `<slug>/<board>.html` -> `<slug>/thumbs/<board>.webp`. */
export function thumbPathFor(path: string) {
  return path.replace(/\/([^/]+)\.html$/, "/thumbs/$1.webp");
}

/** The address of a board's thumbnail, or undefined when refkit has not written one. */
export function canvasThumbUrl(path: string): string | undefined {
  return rawThumbs[thumbPathFor(path)];
}

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
  | { file: string; label?: string; w?: number; h?: number };

/** A button under a row that opens an address in a new tab. */
export interface CanvasLayoutLink {
  label: string;
  url: string;
}

export interface CanvasLayoutRow {
  title: string;
  files: CanvasLayoutFileEntry[];
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
  /** Welcome-row sort key; lower sorts first, default 0, ties keep slug order. */
  order?: number;
  /**
   * The part of the cover board a welcome card shows, `[x, y, w, h]` in board px.
   * Default is the phone frame every folder here draws at the same place, so cards
   * crop to the mockup instead of framing it in artboard margin. Declare one for a
   * board that is not a phone, e.g. a full-bleed sheet: `[0, 0, 478, 980]`.
   */
  coverBox?: [number, number, number, number];
  rows: CanvasLayoutRow[];
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

/** path -> raw HTML for every file fetched so far. Filled by loadCanvasFileHtml. */
export const canvasFileHtml = new Map<string, string>();
const canvasFileLoads = new Map<string, Promise<string | undefined>>();

/** Whether a discovered board exists at this path, loaded or not. */
export function hasCanvasFile(path: string) {
  return path in fileLoaders;
}

/** Fetches a board's HTML once and caches it; resolves undefined for a path that is not a board. */
export function loadCanvasFileHtml(path: string): Promise<string | undefined> {
  const cached = canvasFileHtml.get(path);
  if (cached !== undefined) return Promise.resolve(cached);
  const loader = fileLoaders[path];
  if (!loader) return Promise.resolve(undefined);
  let load = canvasFileLoads.get(path);
  if (!load) {
    load = loader().then((html) => {
      canvasFileHtml.set(path, html);
      canvasFileLoads.delete(path);
      return html;
    });
    canvasFileLoads.set(path, load);
  }
  return load;
}

/**
 * A rendering shape's board HTML: undefined until its chunk arrives, then the string. Pass
 * undefined while the shape does not need the document (it is drawing the thumbnail) and
 * nothing is fetched; that is what makes a page cost the boards it shows live and nothing else.
 */
export function useCanvasFileHtml(path: string | undefined): string | undefined {
  const [html, setHtml] = useState(() => (path ? canvasFileHtml.get(path) : undefined));
  useEffect(() => {
    let live = true;
    const cached = path ? canvasFileHtml.get(path) : undefined;
    if (cached !== undefined) {
      setHtml(cached);
      return;
    }
    setHtml(undefined);
    if (!path) return;
    loadCanvasFileHtml(path).then((loaded) => {
      if (live) setHtml(loaded);
    });
    return () => {
      live = false;
    };
  }, [path]);
  return html;
}

const LAYOUT_PATTERN = /canvases\/([^/]+)\/layout\.json$/;

/** This board's layout.json, if it dropped one next to its HTML files. */
export function readCanvasLayout(
  pageSlug: string,
): CanvasLayoutConfig | undefined {
  for (const [path, config] of Object.entries(rawLayouts)) {
    if (LAYOUT_PATTERN.exec(path)?.[1] === pageSlug) return config;
  }
  return undefined;
}

const ICON_PATTERN = /canvases\/([^/]+)\/icon\.png$/;

/** This folder's app icon, if it dropped one next to its HTML files. */
export function canvasIconUrl(pageSlug: string) {
  for (const [path, url] of Object.entries(rawIcons)) {
    if (ICON_PATTERN.exec(path)?.[1] === pageSlug) return url;
  }
  return undefined;
}

/** Every discovered board, grouped by page and sorted by filename within it. */
export function readCanvasLibrary(): CanvasLibraryFile[][] {
  const byPage = new Map<string, CanvasLibraryFile[]>();
  for (const path of Object.keys(fileLoaders)) {
    const file = parse(path);
    if (!file) continue;
    const list = byPage.get(file.pageSlug) ?? [];
    list.push(file);
    byPage.set(file.pageSlug, list);
  }
  for (const list of byPage.values()) {
    list.sort((a, b) =>
      a.fileName.localeCompare(b.fileName, undefined, { numeric: true }),
    );
  }
  // numeric: true so 02- sorts before 10-, and v1.9 before v1.13.
  return [...byPage.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, files]) => files);
}
