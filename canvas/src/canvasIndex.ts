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

/**
 * Fetches the index, and when a server wrote it, listens to that server: `reload` for a board
 * written or the set of boards changed, `layout` for one board's layout.json, handed over live
 * rather than reloaded because a reload to change one word would throw away the tldraw
 * viewport and the open panel. The status endpoint sends the layout it has just written rather
 * than leaving the page to hear about the write from the file watcher, which answers a settled
 * batch and would have the badge lag the click; the watcher sends the same message for a
 * layout.json edited by hand, so a status set twice over lands twice, identically.
 */
export async function loadCanvasIndex() {
  const url = `${import.meta.env.BASE_URL}__sp/index.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  installCanvasIndex(await response.json());
  if (!canvasIndex().served) return;
  const events = new EventSource(`${import.meta.env.BASE_URL}__sp/events`);
  events.addEventListener("reload", () => window.location.reload());
  events.addEventListener("layout", (event) => {
    const { slug, layout } = JSON.parse(event.data);
    const board = canvasIndex().boards.find((b) => b.slug === slug);
    if (!board) return;
    board.layout = layout;
    window.dispatchEvent(new Event(LAYOUT_CHANGED));
  });
}
