import { useEffect, useState } from "react";
import type { Editor } from "tldraw";
import { WELCOME_PAGE_SLUG } from "./canvasUrl";

/**
 * A canvas's ground colour, this viewer's own and per tldraw page, a light app's boards being easier to
 * judge on light. Picked from the strip's swatch (CanvasStrip.tsx) or the right button's
 * Background menu (canvasChrome.tsx); the event keeps the swatch showing a pick from the menu.
 */
const KEY = "sp-canvas-ground:";
const CHANGE = "sp-canvas-ground";

/** The theme's own ground (index.css), which a canvas has until it is given another. */
export const DEFAULT_GROUND = "#2b2b2b";

/** Start here is the app's front door, and its covers read best on pure black. */
const PAGE_DEFAULTS: Record<string, string> = { [WELCOME_PAGE_SLUG]: "#000000" };

/** The right button's presets. */
export const GROUNDS = [
  ["Dark grey", DEFAULT_GROUND],
  ["Black", "#000000"],
  ["Light grey", "#f2f2f2"],
  ["White", "#ffffff"],
] as const;

/** A tldraw page's ground, by its slug (canvasTabs.ts `pageOf`). */
export function groundOf(page: string) {
  return localStorage.getItem(KEY + page) ?? PAGE_DEFAULTS[page] ?? DEFAULT_GROUND;
}

export function setGround(editor: Editor, page: string, color: string) {
  localStorage.setItem(KEY + page, color);
  paintGround(editor.getContainer(), color);
  window.dispatchEvent(new Event(CHANGE));
}

/** The ground of the page in front, painted on the editor as the page changes. */
export function useGround(editor: Editor | null, page: string | undefined) {
  const [ground, set] = useState(DEFAULT_GROUND);
  useEffect(() => {
    const read = () => set(page ? groundOf(page) : DEFAULT_GROUND);
    read();
    if (editor) paintGround(editor.getContainer(), page ? groundOf(page) : DEFAULT_GROUND);
    window.addEventListener(CHANGE, read);
    return () => window.removeEventListener(CHANGE, read);
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
