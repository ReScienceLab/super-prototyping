import type { CommentsFile } from "./canvasComments";
import type { CanvasLayoutConfig } from "./canvasLibrary";

/**
 * What the boards directory holds, as the server (or the build) wrote it at `/__sp/index.json`:
 * one entry per board folder. `server/boards.ts` produces it; this is the shape the page reads.
 */
export interface IndexBoard {
  slug: string;
  /** The board files, `01-home.html`, sorted. */
  html: string[];
  /** When a board file in the folder was last written, in ms since the epoch. */
  updated: number;
  /** The folder's layout.json, parsed, when it has one. */
  layout?: CanvasLayoutConfig;
  /** Whether the folder has an icon.png. */
  icon: boolean;
  /** Brand images by path inside the folder, `assets/brand/logo.png`. */
  brand: string[];
  /** The brand images the build generated a smaller variant for; empty when served. */
  thumbs: string[];
  /** `length:hash` of an inlined image's payload -> the file it came from. */
  assets: Record<string, { name: string; bytes: number }>;
  /** The folder's comments.json, when it has one. */
  comments?: CommentsFile;
  /** One of the examples the desktop app shows beside the project's own, read-only. */
  example?: true;
  /** The folder's documents, as `CanvasIndex.docs` are the project's: the ones an example's
   *  tab shows, since an example is a project of one canvas. */
  docs: IndexDoc[];
}

/** A Markdown file shown as a tab of its own. */
export interface IndexDoc {
  name: string;
  text: string;
}

export interface CanvasIndex {
  /**
   * Whether a server is behind `/__sp`. That is the whole of what the canvas can write —
   * a status, a comment, a clone, a message to the agent — and the hosted build says no.
   */
  served: boolean;
  /** The boards directory's path, for the empty-state notice; empty in a build. */
  canvasesDir: string;
  /** Suffix for the tldraw persistence key, so two projects do not share one document. */
  canvasesNamespace: string;
  /** Longest edge of a brand image's variant. */
  thumbEdge: number;
  boards: IndexBoard[];
  /** The project's name, where one was set; absent from a build. */
  project?: string | null;
  /**
   * The Markdown files at the project's root the server shows, for now its PRD.md: one tab
   * each, before its canvases. Absent from a build and at the server's root, which have no project.
   */
  docs?: IndexDoc[];
}

let index: CanvasIndex | undefined;

/** Hands the page its index. The entries call `loadCanvasIndex`; the tests call this directly. */
export function installCanvasIndex(next: CanvasIndex) {
  index = next;
}

/** The index. Every entry loads it before importing anything that reads it, so this never throws. */
export function canvasIndex(): CanvasIndex {
  if (!index) throw new Error("the canvas index is read before it is loaded");
  return index;
}

/**
 * Window event fired once a board's layout changed underneath the page. The canvas lays itself
 * out again on it (App.tsx) and the inspector re-reads the board's status (InspectorPanel.tsx).
 * Between them, that is everything a layout.json change can move.
 */
export const LAYOUT_CHANGED = "sp:layout";
/** Fired on `window` when the project's documents have been rewritten. */
export const DOCS_CHANGED = "sp:docs";

/**
 * Fetches the index, and when a server wrote it, listens to that server: `reload` for a board
 * written or the set of boards changed, `layout` for one board's layout.json, handed over live
 * rather than reloaded because a reload to change one word would throw away the tldraw
 * viewport and the open panel. The status endpoint sends the layout it has just written rather
 * than leaving the page to hear about the write from the file watcher, which answers a settled
 * batch and would have the badge lag the click; the watcher sends the same message for a
 * layout.json edited by hand, so a status set twice over lands twice, identically.
 *
 * `live = false` skips the listening, for the home page. Each stream holds one of the six
 * connections a browser keeps to a host over HTTP/1.1, so six open pages that listen leave a
 * seventh unable to fetch its own scripts, and a list of canvases has no viewport to keep.
 */
export async function loadCanvasIndex(live = true) {
  const url = `${import.meta.env.BASE_URL}__sp/index.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  installCanvasIndex(await response.json());
  if (!live || !canvasIndex().served) return;
  const events = new EventSource(`${import.meta.env.BASE_URL}__sp/events`);
  events.addEventListener("reload", () => window.location.reload());
  events.addEventListener("docs", (event) => {
    canvasIndex().docs = JSON.parse(event.data);
    window.dispatchEvent(new Event(DOCS_CHANGED));
  });
  events.addEventListener("layout", (event) => {
    const { slug, layout } = JSON.parse(event.data);
    const board = canvasIndex().boards.find((b) => b.slug === slug);
    if (!board) return;
    board.layout = layout;
    window.dispatchEvent(new Event(LAYOUT_CHANGED));
  });
}
