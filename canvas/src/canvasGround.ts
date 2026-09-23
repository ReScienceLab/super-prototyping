import { useEffect, useState } from "react";
import type { Editor } from "tldraw";

/**
 * A canvas's ground colour, this viewer's own and per canvas, a light app's boards being easier to
 * judge on light. Picked from the strip's swatch (CanvasStrip.tsx) or the right button's
 * Background menu (canvasChrome.tsx); the event keeps the swatch showing a pick from the menu.
 */
const KEY = "sp-canvas-ground:";
const CHANGE = "sp-canvas-ground";

/** The theme's own ground (index.css), for the swatch when a canvas has none of its own. */
export const DEFAULT_GROUND = "#2b2b2b";

/** The right button's presets, after Default, which is dark grey. */
export const GROUNDS = [
  ["White", "#ffffff"],
  ["Light grey", "#f2f2f2"],
  ["Black", "#000000"],
] as const;

export function groundOf(slug: string) {
  return localStorage.getItem(KEY + slug);
}

export function setGround(editor: Editor, slug: string, color: string | null) {
  if (color) localStorage.setItem(KEY + slug, color);
  else localStorage.removeItem(KEY + slug);
  paintGround(editor.getContainer(), color);
  window.dispatchEvent(new Event(CHANGE));
}

/** The ground of the canvas in front, painted on the editor as the canvas changes. */
export function useGround(editor: Editor | null, slug: string | undefined) {
  const [ground, set] = useState<string | null>(null);
  useEffect(() => {
    const read = () => set(slug ? groundOf(slug) : null);
    read();
    if (editor) paintGround(editor.getContainer(), slug ? groundOf(slug) : null);
    window.addEventListener(CHANGE, read);
    return () => window.removeEventListener(CHANGE, read);
  }, [editor, slug]);
  return ground;
}

/**
 * The ground on the editor's container, where an inline value beats the theme's (index.css). A
 * light one is flagged too, because tldraw's dark theme draws every heading and caption near
 * white, and index.css turns them dark on it.
 */
function paintGround(container: HTMLElement, color: string | null) {
  if (!color) {
    container.style.removeProperty("--tl-color-background");
    delete container.dataset.ground;
    return;
  }
  container.style.setProperty("--tl-color-background", color);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  container.dataset.ground = 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "light" : "dark";
}
