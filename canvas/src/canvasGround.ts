import { useEffect, useState } from "react";
import type { Editor } from "tldraw";
import { canvasIndex, LAYOUT_CHANGED } from "./canvasIndex";
import { readCanvasLayout } from "./canvasLibrary";
import { isExample } from "./canvasTabs";

/**
 * A canvas's ground colour, its layout.json `ground`, so it is the canvas's and goes wherever the
 * folder goes. Picked from the strip's swatch (CanvasStrip.tsx) or the right button's Background
 * menu (canvasChrome.tsx), and written by the dev server (server/sp.ts), which hands the edited
 * layout back to every open page.
 */

/** The theme's own ground (index.css), which a canvas has until its layout names another. */
export const DEFAULT_GROUND = "#2b2b2b";

/** The right button's presets. */
export const GROUNDS = [
  ["Dark grey", DEFAULT_GROUND],
  ["Black", "#000000"],
  ["Light grey", "#f2f2f2"],
  ["White", "#ffffff"],
] as const;

/** Picks not yet back from the server as a layout, which then speaks for them. */
const picked = new Map<string, string>();
const PICKED = "sp:ground-picked";
window.addEventListener(LAYOUT_CHANGED, () => picked.clear());

/** A tldraw page's ground, by its slug (canvasTabs.ts `pageOf`). */
export function groundOf(page: string) {
  return picked.get(page) ?? readCanvasLayout(page)?.ground ?? DEFAULT_GROUND;
}

/** Whether this page's ground can be changed: only a served canvas of the project's own. */
export const groundEditable = (page: string) => canvasIndex().served && !isExample(page);

let pending: ReturnType<typeof setTimeout> | undefined;

/**
 * Painted at once, written a moment later: the swatch's picker fires on every step of a drag,
 * and only where it comes to rest belongs in the file.
 */
export function setGround(editor: Editor, page: string, color: string) {
  picked.set(page, color);
  paintGround(editor.getContainer(), color);
  window.dispatchEvent(new Event(PICKED));
  clearTimeout(pending);
  pending = setTimeout(() => {
    void fetch(`${import.meta.env.BASE_URL}__sp/canvas-ground`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: page, ground: color === DEFAULT_GROUND ? null : color }),
    });
  }, 300);
}

/** The ground of the page in front, painted on the editor as the page or its layout changes. */
export function useGround(editor: Editor | null, page: string | undefined) {
  const [ground, set] = useState(DEFAULT_GROUND);
  useEffect(() => {
    const read = () => {
      const color = page ? groundOf(page) : DEFAULT_GROUND;
      set(color);
      if (editor) paintGround(editor.getContainer(), color);
    };
    read();
    window.addEventListener(LAYOUT_CHANGED, read);
    window.addEventListener(PICKED, read);
    return () => {
      window.removeEventListener(LAYOUT_CHANGED, read);
      window.removeEventListener(PICKED, read);
    };
  }, [editor, page]);
  return ground;
}

/**
 * The ground on the editor's container, where an inline value beats the theme's (index.css). A
 * light one is flagged too, because tldraw's dark theme draws every heading and caption near
 * white, and index.css turns them dark on it.
 */
function paintGround(container: HTMLElement, color: string) {
  if (color === DEFAULT_GROUND) {
    container.style.removeProperty("--tl-color-background");
    delete container.dataset.ground;
    return;
  }
  container.style.setProperty("--tl-color-background", color);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  container.dataset.ground = 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "light" : "dark";
}
