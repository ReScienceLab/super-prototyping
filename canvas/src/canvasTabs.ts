import type { MouseEvent } from "react";
import { canvasIndex, type IndexBoard } from "./canvasIndex";
import type { Cover } from "./cover";
import {
  canvasIconUrl,
  hasBrandMaterial,
  readCanvasLibrary,
  shortName,
} from "./canvasLibrary";
import { WELCOME_PAGE_SLUG, urlForTab, type CanvasTab } from "./canvasUrl";

/**
 * The tabs on the bar, and what each one shows. A tab is a project, or an example, which is a
 * project of one canvas. What a tab has in front is a view (`CanvasTab`, canvasUrl.ts): one of
 * its canvases, a brand kit, or one of its documents. The address names the view; this is the
 * rest of the bar.
 *
 * A project is its own pages at an address of their own (`/p/<name>/` in the desktop app), all
 * from one server. The bar is the window's and the canvas is a frame in it (AppShell.tsx), so a
 * tab on another project loads that project's canvas into the frame and the bar stays. Every
 * project's server has the examples, so an example's tab opens over whichever project is loaded,
 * and over the server's root when none is.
 */

/**
 * A project's view with no canvas of its own in front: what its bare address opens, the view of
 * a project with no canvas yet, and where a link to a folder that has gone lands. It shows Start
 * here's page, but it is not Start here's view. That one is an example like any other, on a tab
 * of its own at `?canvas=00-welcome`, and this one is the project's, under its tab. Its slug is
 * empty the way the index of every kit's is, `{ kind: "brand", slug: "" }`.
 */
export const HOME_TAB: CanvasTab = { kind: "canvas", slug: "" };

/** The tldraw page a canvas view shows: its folder's, or Start here's for HOME_TAB. */
export const pageOf = (view: CanvasTab) => view.slug || WELCOME_PAGE_SLUG;

export type ProjectTab =
  | {
      kind: "project";
      /** The address its pages are under, from the root: `/p/<name>/`, or `/` for `sp start`. */
      url: string;
      name: string;
      icon: string | null;
      /** What it had in front when it was left, which is where coming back to it lands. */
      view: CanvasTab;
    }
  | { kind: "example"; slug: string; view: CanvasTab };

/** One tab's identity, for React keys and for the bar, which holds no duplicates. */
export function tabKey(tab: ProjectTab) {
  return tab.kind === "project" ? `project:${tab.url}` : `example:${tab.slug}`;
}

/** The bar with `tab` on it: in its own place when it was already open, which keeps the order
 *  and takes the view it now has in front, and on the end when it was not. */
export function withTab(open: ProjectTab[], tab: ProjectTab) {
  const at = open.findIndex((had) => tabKey(had) === tabKey(tab));
  return at < 0 ? [...open, tab] : open.with(at, tab);
}

export type ProjectCanvas = Pick<
  IndexBoard,
  "slug" | "html" | "updated" | "layout" | "icon"
>;

/** A project as `/__sp/projects.json` lists it: a folder, and the canvases in it. */
export interface Project {
  name: string;
  /** Its pages' address from the root: `/p/<name>/`. */
  url: string;
  /** Its folder, which a card's Delete names before it moves it to the Trash. */
  path: string;
  updated: number;
  canvases: ProjectCanvas[];
  /** What its card shows (cover.ts); none before it has a canvas. */
  cover?: Cover;
}

/**
 * The tab a project opens as: the one on the bar already, or a new one on its most recently
 * edited canvas, with the icon of the most recent that has one. A project with no canvas yet
 * opens on HOME_TAB, its own view of Start here's page.
 */
export function tabOfProject(
  p: Pick<Project, "name" | "url"> & {
    canvases: Pick<ProjectCanvas, "slug" | "updated" | "icon">[];
  },
  open: ProjectTab[],
): ProjectTab {
  const url = new URL(p.url, window.location.href).pathname;
  const had = open.find((tab) => tab.kind === "project" && tab.url === url);
  if (had) return had;
  const recent = p.canvases.toSorted((a, b) => b.updated - a.updated);
  const iconed = recent.find((c) => c.icon);
  return {
    kind: "project",
    url,
    name: p.name,
    icon: iconed ? `${url}board/${encodeURI(iconed.slug)}/icon.png` : null,
    view: recent[0] ? { kind: "canvas", slug: recent[0].slug } : HOME_TAB,
  };
}

/** An example's tab: the one on the bar already, or a new one on its canvas. */
export function tabOfExample(slug: string, open: ProjectTab[]): ProjectTab {
  return (
    open.find((tab) => tab.kind === "example" && tab.slug === slug) ?? {
      kind: "example",
      slug,
      view: { kind: "canvas", slug },
    }
  );
}

/**
 * An example this server has, rather than a canvas of the project's own. Start here is one, the
 * first, and its view is `?canvas=00-welcome`. The bare address is the project's (HOME_TAB).
 */
export function isExample(slug: string) {
  return canvasIndex().boards.some((b) => b.slug === slug && b.example);
}

/** The project's own canvases, in the index's order: the ones the canvas strip shows. Start
 *  here is never one, flagged as an example or not, since the project's view of it is HOME_TAB. */
export function ownCanvases() {
  return readCanvasLibrary()
    .map((files) => files[0].pageSlug)
    .filter((slug) => slug !== WELCOME_PAGE_SLUG && !isExample(slug));
}

/** A document at the project's root, by file name, as the index has it. */
export function readDoc(name: string) {
  return canvasIndex().docs?.find((doc) => doc.name === name)?.text;
}

/** The address this page's project is under, which is the build's base resolved against it. */
export function projectUrl() {
  return new URL(import.meta.env.BASE_URL, window.location.href).pathname;
}

/**
 * The tab a view belongs to: an example's, for an example or its kit, and this project's for
 * anything else: its canvases, their kits, HOME_TAB and the index of every kit.
 */
export function tabFor(view: CanvasTab): ProjectTab {
  if (isExample(view.slug)) return { kind: "example", slug: view.slug, view };
  const here = {
    // Unnamed only where no project was set: the dev server, and the hosted canvas.
    name: canvasIndex().project ?? "Canvases",
    url: projectUrl(),
    canvases: canvasIndex().boards.filter((b) => !b.example),
  };
  return { ...tabOfProject(here, []), view };
}

/** Whether a tab opens in the canvas loaded, rather than being another project's to load. */
export function isHere(tab: ProjectTab) {
  return tab.kind === "example" || tab.url === projectUrl();
}

/** A tab's view as an address: the one the window shows for it. */
export function tabUrl(tab: ProjectTab) {
  const base = tab.kind === "project" ? tab.url : projectUrl();
  return urlForTab(new URL(base, window.location.href).href, tab.view);
}

/** The chip's label: a project's name, an example's page name. */
export function projectTabLabel(tab: ProjectTab) {
  return tab.kind === "project" ? tab.name : shortName(tab.slug);
}

export function projectTabIcon(tab: ProjectTab) {
  return tab.kind === "project"
    ? (tab.icon ?? undefined)
    : canvasIconUrl(tab.slug);
}

/**
 * Whether there is still something behind a tab. Folders come and go between visits: a clone is
 * made, a folder renamed, a project opened on the port another one was on. A restored tab for
 * one that is gone would be a chip that opens nothing.
 *
 * This checks a canvas against the library rather than against the boards directory, because
 * the library is what becomes tldraw pages. A folder holding no board at all is a folder with
 * nothing to switch to.
 */
export function tabExists(tab: CanvasTab) {
  if (tab.kind === "doc") return readDoc(tab.slug) !== undefined;
  if (tab.kind === "brand")
    return tab.slug === "" || hasBrandMaterial(tab.slug);
  return readCanvasLibrary().some((files) => files[0].pageSlug === pageOf(tab));
}

/**
 * The tab something actually opens, which is not always the one it named. A kit is named by the
 * folder whose material it shows, and a folder that collected none has no kit of its own. That
 * address is the index of every kit, which is the page brand.html serves for it too. A canvas
 * the library has never heard of is a link to a folder that has since gone, and lands on the
 * project's own view of Start here, the one page that is always there. So does a document
 * that has gone.
 */
export function resolveTab(tab: CanvasTab): CanvasTab {
  if (tab.kind === "doc") return tabExists(tab) ? tab : HOME_TAB;
  if (tab.kind === "brand") {
    return tab.slug && !hasBrandMaterial(tab.slug)
      ? { kind: "brand", slug: "" }
      : tab;
  }
  return tabExists(tab) ? tab : HOME_TAB;
}

/**
 * One list for every project, since they share an origin: the bar is the same from any of them.
 * The key is new with project tabs, so a bar of canvas tabs from before is not read as one.
 */
const OPEN_KEY = "sp-project-tabs";

/**
 * The tabs this browser left open, in the order they were left. This drops an example this
 * server no longer has, and keeps a project until the list of projects says it has gone
 * (AppShell.tsx), since another project's folder is not something this page can see.
 */
export function readOpenTabs(): ProjectTab[] {
  let stored: unknown;
  try {
    stored = JSON.parse(localStorage.getItem(OPEN_KEY) ?? "[]");
  } catch {
    // Storage unavailable (private mode, blocked cookies), or a half-written value.
    return [];
  }
  if (!Array.isArray(stored)) return [];
  const open: ProjectTab[] = [];
  for (const tab of stored as ProjectTab[]) {
    const view = tab?.view;
    if (
      (view?.kind !== "canvas" && view?.kind !== "brand" && view?.kind !== "doc") ||
      typeof view.slug !== "string" ||
      !(tab.kind === "project"
        ? typeof tab.url === "string" && typeof tab.name === "string"
        : tab.kind === "example" && isExample(tab.slug))
    )
      continue;
    if (!open.some((had) => tabKey(had) === tabKey(tab))) open.push(tab);
  }
  return open;
}

export function writeOpenTabs(open: ProjectTab[]) {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify(open));
  } catch {
    // Storage unavailable, so the bar lasts until this page is closed.
  }
}

/**
 * The click handler for a link that is also a tab. Every one of these, the shelf of kits on a
 * kit and the cards on the kit index and on the home page, points at a real address, and takes
 * the plain left click to open a tab instead. It leaves a modified click alone, so ⌘-click,
 * middle click and copy-link still reach the page itself.
 */
export function openInTab<T>(open: (tab: T) => void, tab: T) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    open(tab);
  };
}
