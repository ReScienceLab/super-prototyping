import { useEffect, useReducer } from "react";
import { WELCOME_PAGE_SLUG } from "./canvasUrl";

// Auto-discovers the boards dropped under mockups/canvases/<slug>/*.html, one folder per board
// (a cloned app, a feature round, a design-system sheet). Each folder becomes a tldraw page; each
// HTML file in it becomes one shape. Add or edit files there; nothing here needs to change.
// Each file is its own lazy module, fetched the first time a shape asks for it, so
// opening the welcome page pulls a dozen covers rather than every board in the repo (the full
// set is 25 MB of HTML, which a phone should not download to look at one page). Vite still
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
 * A rendering shape's board HTML: undefined until its chunk arrives, then the string. Every shape
 * on the page mounts (culling only hides the off-screen ones), so a page fetches its own boards
 * and nothing else. The cache is the source of truth and state is only a re-render tick, so a
 * shape whose path changes reads the new path's HTML on the same render instead of showing the
 * old board for a frame.
 */
export function useCanvasFileHtml(path: string): string | undefined {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (canvasFileHtml.has(path)) return;
    let live = true;
    loadCanvasFileHtml(path).then(() => {
      if (live) rerender();
    });
    return () => {
      live = false;
    };
  }, [path]);
  return canvasFileHtml.get(path);
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
  // numeric: true so 02- sorts before 10-, and v1.9 before v1.13. Then `order`: sort is
  // stable, so it only moves the folders that ask to be moved.
  const rank = (slug: string) =>
    slug === WELCOME_PAGE_SLUG ? -Infinity : (readCanvasLayout(slug)?.order ?? 0);
  return [...byPage.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([, files]) => files);
}
