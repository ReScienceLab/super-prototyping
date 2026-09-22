import type { MouseEvent, RefObject } from "react";
import { flushSync } from "react-dom";

/**
 * The right-click menus of the home page's cards (HomePage.tsx) and the bar's tabs
 * (CanvasTabBar.tsx): each is one native popover, `.sp-context-menu`, whose rows are rendered
 * for what was right-clicked.
 */

/**
 * Renders the menu's rows for what was right-clicked, then shows it at the pointer, slid back
 * from the window's right and bottom edges so it stays on the screen. The rows are rendered
 * first because they decide its size.
 */
export function openMenu(
  event: MouseEvent,
  menu: RefObject<HTMLElement | null>,
  render: () => void,
) {
  event.preventDefault();
  flushSync(render);
  const el = menu.current!;
  const show = () => {
    el.showPopover();
    el.style.left = `${Math.min(event.clientX, innerWidth - el.offsetWidth - 8)}px`;
    el.style.top = `${Math.min(event.clientY, innerHeight - el.offsetHeight - 8)}px`;
  };
  // On the release when a button is down, for the reason the agent's menu is (AgentButton).
  if (event.buttons === 0) return show();
  window.addEventListener("pointerup", () => setTimeout(show), { once: true });
}

/** Asks the server to do something to a project's folder (canvas/server/projects.ts). */
export async function askServer(action: "reveal" | "delete", name: string) {
  const res = await fetch(
    new URL(`/__sp/projects/${action}`, location.origin),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    },
  );
  if (!res.ok) alert(await res.text());
}

const mac = /Mac/.test(navigator.userAgent);
/** Each OS's own words for showing a folder in its file manager, and for binning it. */
export const REVEAL = mac ? "Show in Finder" : "Open file location";
export const TRASH = mac ? "Move to Trash…" : "Delete…";
