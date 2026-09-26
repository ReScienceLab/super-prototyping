import { ContextMenu } from "radix-ui";
import type { ReactElement, ReactNode } from "react";
import type { ChosenCover } from "./cover";

/**
 * The right-click menu of a home page card, a tab or a canvas (HomePage.tsx, Community.tsx,
 * CanvasTabBar.tsx, CanvasStrip.tsx), on `children`: Radix's, which opens it at the pointer, keeps
 * it on the screen and moves through its rows with the arrow keys. Its rows are `MenuItem`s,
 * run from their `onSelect`, which shuts the menu after.
 */
export function RightClickMenu({
  menu,
  children,
}: {
  menu: ReactNode;
  children: ReactElement;
}) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className="sp-context-menu"
          // An item that asks first (confirmTrash) opens a modal in the top window; handing focus
          // back to the menu's owner in the canvas's frame would take it from behind that modal,
          // where Escape no longer cancels.
          onCloseAutoFocus={(event) => {
            if (window.top!.document.querySelector("dialog[open]"))
              event.preventDefault();
          }}
        >
          {menu}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export function MenuItem({
  className,
  ...props
}: ContextMenu.ContextMenuItemProps) {
  return (
    <ContextMenu.Item
      className={className ? `sp-menu-row ${className}` : "sp-menu-row"}
      {...props}
    />
  );
}

export const MenuSeparator = () => (
  <ContextMenu.Separator className="sp-menu-sep" />
);

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
