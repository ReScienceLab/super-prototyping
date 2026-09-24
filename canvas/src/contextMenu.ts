import type { MouseEvent, RefObject } from "react";
import { flushSync } from "react-dom";
import type { ChosenCover } from "./cover";

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

/**
 * Keeps the browser's own menu off a page of the app, which has its own where a right-click
 * means something. A text field keeps it, for its spelling and its Paste. The listener is the
 * document's, so it runs after React's, and after tldraw has opened the canvas's menu.
 */
export function noBrowserMenu() {
  document.addEventListener("contextmenu", (event) => {
    if (
      !(event.target as Element).closest(
        "input, textarea, [contenteditable]:not([contenteditable=false])",
      )
    )
      event.preventDefault();
  });
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

/**
 * Sets the cover of the project whose pages are at `base`, or puts back its default with `null`
 * (canvas/server/sp.ts). Says so when the server would not, and answers whether it did.
 */
export async function setProjectCover(base: string, cover: ChosenCover | null) {
  const res = await fetch(`${base}__sp/project-cover`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cover }),
  });
  if (!res.ok) alert(await res.text());
  return res.ok;
}

const mac = /Mac/.test(navigator.userAgent);
/** Each OS's own words for showing a folder in its file manager, and for binning it. */
export const REVEAL = mac ? "Show in Finder" : "Open file location";
export const TRASH = mac ? "Move to Trash…" : "Delete…";

/**
 * Asked before a folder is binned, in a dialog of the page's own rather than the browser's
 * confirm(), which heads itself with the address and cannot be styled. The browser's <dialog>
 * already traps focus and closes on Escape. Answers whether to go ahead.
 */
export function confirmTrash(name: string, folder: string, goes: string) {
  // The window's, not the canvas frame's, so it sits in the middle of the whole window and its
  // backdrop covers the chat as well. The window loads the same stylesheet (shell.tsx).
  const doc = window.top!.document;
  const dialog = doc.createElement("dialog");
  dialog.className = "sp-confirm";
  const h2 = doc.createElement("h2");
  h2.textContent = `Move “${name}” to ${mac ? "the Trash" : "the Recycle Bin"}?`;
  const path = doc.createElement("code");
  path.textContent = folder;
  const p = doc.createElement("p");
  p.textContent = goes;
  const form = doc.createElement("form");
  form.method = "dialog";
  const cancel = doc.createElement("button");
  cancel.value = "cancel";
  cancel.textContent = "Cancel";
  const bin = doc.createElement("button");
  bin.value = "trash";
  bin.textContent = mac ? "Move to Trash" : "Delete";
  bin.className = "sp-confirm-danger";
  form.append(cancel, bin);
  dialog.append(h2, path, p, form);
  doc.body.append(dialog);
  dialog.showModal();
  // A click on the backdrop lands on the dialog itself, outside its box: the same as Cancel.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  return new Promise<boolean>((resolve) =>
    dialog.addEventListener("close", () => {
      dialog.remove();
      resolve(dialog.returnValue === "trash");
    }),
  );
}
