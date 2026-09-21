import type { MouseEvent } from "react";
import { canvasIndex } from "./canvasIndex";
import {
  hasBrandMaterial,
  readCanvasLibrary,
  shortName,
} from "./canvasLibrary";
import { WELCOME_PAGE_SLUG, type CanvasTab } from "./canvasUrl";

/**
 * Which tabs are open, and what each one is called. The address names the one in front
 * (canvasUrl.ts); this is the rest of the bar.
 *
 * A canvas tab costs nothing beyond its chip: every folder is already a tldraw page, made at
 * load whether or not anyone opens it, and tldraw draws only the page in front. So there is no
 * limit here and no unloading — closing a tab takes the chip off the bar and leaves the page,
 * its camera and anything drawn on it exactly where they were.
 */

/**
 * Start here, first in the bar and never closable. It is where the last close lands, and with
 * tldraw's page menu gone (canvasChrome.tsx) it is also the one chip that is always there to
 * go back to.
 */
export const HOME_TAB: CanvasTab = { kind: "canvas", slug: WELCOME_PAGE_SLUG };

/** One tab's identity, for React keys and for the open set, which holds no duplicates. */
export function tabKey(tab: CanvasTab) {
  return `${tab.kind}:${tab.slug}`;
}

export function sameTab(a: CanvasTab, b: CanvasTab) {
  return a.kind === b.kind && a.slug === b.slug;
}

/**
 * The chip's label. A canvas wears its page name with the shelf taken off, the way the brand
 * pages do — every example carries the same "(example)" prefix, and in a row of chips that is
 * twelve characters of nothing repeated across the bar.
 */
export function tabLabel(tab: CanvasTab) {
  if (tab.kind === "canvas") return shortName(tab.slug);
  return tab.slug ? `${shortName(tab.slug)} brand` : "Brand kits";
}

/**
 * Whether there is still something behind a tab. Folders come and go between visits — a clone
 * made, a folder renamed, a project opened on the port another one was on — and a restored tab
 * for one that is gone would be a chip that opens nothing.
 *
 * A canvas is checked against the library rather than against the boards directory, because the
 * library is what becomes tldraw pages: a folder holding no board at all is a folder with
 * nothing to switch to.
 */
export function tabExists(tab: CanvasTab) {
  if (tab.kind === "brand") return tab.slug === "" || hasBrandMaterial(tab.slug);
  return readCanvasLibrary().some((files) => files[0].pageSlug === tab.slug);
}

/**
 * The tab something actually opens, which is not always the one it named. A kit is named by the
 * folder whose material it shows, and a folder that collected none has no kit of its own — that
 * address is the index of every kit, which is the page brand.html serves for it too. A canvas
 * the library has never heard of is a link to a folder that has since gone, and lands on Start
 * here, the one page that is always there.
 */
export function resolveTab(tab: CanvasTab): CanvasTab {
  if (tab.kind === "brand") {
    return tab.slug && !hasBrandMaterial(tab.slug)
      ? { kind: "brand", slug: "" }
      : tab;
  }
  return tabExists(tab) ? tab : HOME_TAB;
}

/**
 * Per boards directory, like the tldraw document itself: every canvas runs on 127.0.0.1, so
 * without the namespace a second project started on the same port would open the first one's
 * tabs. See `canvasesNamespace` in server/boards.ts.
 */
function openKey() {
  return `sp-canvas-tabs${canvasIndex().canvasesNamespace}`;
}

/**
 * The tabs this browser left open, Start here excluded because it is always first. Anything
 * the stored list names that no longer exists is dropped rather than shown, so a folder
 * removed between visits takes its chip with it.
 */
export function readOpenTabs(): CanvasTab[] {
  let stored: unknown;
  try {
    stored = JSON.parse(localStorage.getItem(openKey()) ?? "[]");
  } catch {
    // Storage unavailable (private mode, blocked cookies), or a half-written value.
    return [];
  }
  if (!Array.isArray(stored)) return [];
  const open: CanvasTab[] = [];
  for (const entry of stored) {
    if (typeof entry !== "string") continue;
    const cut = entry.indexOf(":");
    const kind = entry.slice(0, cut);
    if (kind !== "canvas" && kind !== "brand") continue;
    const tab: CanvasTab = { kind, slug: entry.slice(cut + 1) };
    if (sameTab(tab, HOME_TAB) || !tabExists(tab)) continue;
    if (!open.some((had) => sameTab(had, tab))) open.push(tab);
  }
  return open;
}

export function writeOpenTabs(open: CanvasTab[]) {
  try {
    localStorage.setItem(openKey(), JSON.stringify(open.map(tabKey)));
  } catch {
    // Storage unavailable, so the bar lasts until this page is closed.
  }
}

/**
 * The click handler for a link that is also a tab. Every one of these — the Brand kit button,
 * the shelf of kits on a kit, the cards on the kit index — points at a real address under
 * brand.html, and takes the plain left click to open a tab instead. A modified click is left
 * alone, so ⌘-click, middle click and copy-link still reach the page itself.
 */
export function openInTab(open: (tab: CanvasTab) => void, tab: CanvasTab) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(tab);
  };
}
