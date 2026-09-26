// The address of what is on screen. A page is `?canvas=<slug>`, the canvases/<slug> folder
// name. The bare URL names no page: it is a project's own view with no canvas of its in front
// (HOME_TAB, canvasTabs.ts), so the way in stays the shortest link there is. One thing of a page is the hash: `#<file>` for the board
// canvases/<slug>/<file>.html, and `#assets/brand/<...>` for a picture, which is that file's
// path inside the folder. A board is one file at the folder's root and every picture is under
// assets/brand, so one hash names either without ambiguity. Anything else in the query string
// is left alone.
//
// A brand kit open in a tab is `?brand=<slug>` instead, and `?brand=` for the index of every
// kit. Its own parameter rather than a second value of `canvas=`, because the two name
// different things of the same folder and a kit has no board to hang a hash off.
//
// A Markdown file at the project's root open in a tab is `?doc=<file name>`, `?doc=PRD.md`, and
// one of an example's is `?doc=<example>/<file name>`, `?doc=spotify-ios/PRD.md`.

const CANVAS_PARAM = "canvas";
const BRAND_PARAM = "brand";
const DOC_PARAM = "doc";

/**
 * What one tab shows: a canvas page, by the folder slug its tldraw page is stamped with, or a
 * brand kit, which is that folder's, or the index of every kit when the slug is empty, or a
 * Markdown document at the project's root, by its file name. The kinds are what the bar holds
 * and what the address names, so they are spelled here.
 */
export type CanvasTab =
  | { kind: "canvas"; slug: string }
  | { kind: "brand"; slug: string }
  | { kind: "doc"; slug: string };

/** The page slug an address opens: its `canvas` parameter, else none, which is the bare address. */
export function slugFromUrl(href: string) {
  return new URL(href).searchParams.get(CANVAS_PARAM) ?? "";
}

/**
 * The board or picture an address opens, by file name and by path in the folder respectively:
 * its hash, else nothing. The hash is typed by hand, so a broken escape in it is something that
 * does not exist, not an error.
 */
export function targetFromUrl(href: string) {
  const { hash } = new URL(href);
  if (!hash) return undefined;
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return undefined;
  }
}

/**
 * The three pages of the app, for links between them: the canvas showing a page, that same
 * page's boards at full size (sheet.html, one entry of its own so a board read as a web page
 * does not download tldraw with it), and its brand material (brand.html). All three take the
 * slug as `?canvas=`, so one address becomes another by swapping the file. Built on BASE_URL
 * rather than on the current address, which is one of the others.
 */
export function canvasPageUrl(slug: string) {
  return `${import.meta.env.BASE_URL}?${CANVAS_PARAM}=${encodeURIComponent(slug)}`;
}

export function sheetPageUrl(slug: string) {
  return `${import.meta.env.BASE_URL}sheet.html?${CANVAS_PARAM}=${encodeURIComponent(slug)}`;
}

/** Without a slug: the index of every product that collected any, which is what a bare
 *  brand.html opens. */
export function brandPageUrl(slug?: string) {
  const query = slug ? `?${CANVAS_PARAM}=${encodeURIComponent(slug)}` : "";
  return `${import.meta.env.BASE_URL}brand.html${query}`;
}

/**
 * The window and the canvas in it (AppShell.tsx). The window's address is the one people see,
 * share and reload, a project's `./?canvas=…#board` or its `home.html`, and the canvas is
 * canvas.html beside it, in a frame, so one becomes the other by swapping the file.
 */
export function frameUrl(href: string) {
  const url = new URL(href);
  url.pathname = url.pathname.replace(/[^/]*$/, "canvas.html");
  return url.href;
}

export function windowUrl(href: string) {
  const url = new URL(href);
  url.pathname = url.pathname.replace(/canvas\.html$/, "");
  return url.href;
}

/**
 * The address for a page slug and, if one is open, a board or picture of it, built on `href` so
 * the origin, path and other parameters stay.
 *
 * Escaped a segment at a time, so a picture's separators survive as separators and its address
 * stays the path a person would recognise; a board's file name has no separator in it and comes
 * out exactly as it always did.
 */
export function urlForSlug(href: string, slug: string, target?: string) {
  const url = new URL(href);
  // A canvas page, a brand kit and a document are tabs, and the address names the one in front.
  url.searchParams.delete(BRAND_PARAM);
  url.searchParams.delete(DOC_PARAM);
  if (slug) url.searchParams.set(CANVAS_PARAM, slug);
  else url.searchParams.delete(CANVAS_PARAM);
  url.hash = target ? target.split("/").map(encodeURIComponent).join("/") : "";
  return url.href;
}

/** The tab an address opens: a document when it carries `doc`, a brand kit when it carries
 *  `brand`, else the canvas page. */
export function tabFromUrl(href: string): CanvasTab {
  const params = new URL(href).searchParams;
  const doc = params.get(DOC_PARAM);
  if (doc !== null) return { kind: "doc", slug: doc };
  const brand = params.get(BRAND_PARAM);
  return brand === null
    ? { kind: "canvas", slug: slugFromUrl(href) }
    : { kind: "brand", slug: brand };
}

/** The address for a tab, and for the board or picture open on it when it is a canvas. */
export function urlForTab(href: string, tab: CanvasTab, target?: string) {
  if (tab.kind === "canvas") return urlForSlug(href, tab.slug, target);
  const url = new URL(href);
  url.searchParams.delete(CANVAS_PARAM);
  url.hash = "";
  if (tab.kind === "doc") {
    url.searchParams.delete(BRAND_PARAM);
    url.searchParams.set(DOC_PARAM, tab.slug);
    return url.href;
  }
  url.searchParams.delete(DOC_PARAM);
  // Empty is the index of every kit, which is the tab a page that collected none opens.
  url.searchParams.set(BRAND_PARAM, tab.slug);
  return url.href;
}

const SITE = "https://superproto.dev";
const ID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * A community project's address on the site, `/p/<id>/<name>`, as Figma's file links are: the
 * id finds it and the name is for people reading the link (docs/2026-09-25-project-urls.md).
 */
export function webUrl(id: string, name = "") {
  const slug = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
  return `${SITE}/p/${id}/${slug}`;
}

/**
 * The community project an address is of, by its id: the app's `/c/<id>/`, or the site's
 * `/p/<id>/…`. Not a `/p/` on this machine, which is a local project's folder, whatever its name.
 */
export function communityIdOf(href: string) {
  const url = new URL(href);
  const app = new RegExp(`^/c/(${ID})/`).exec(url.pathname)?.[1];
  if (app || ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
    return app;
  return new RegExp(`^/p/(${ID})(/|$)`).exec(url.pathname)?.[1];
}

/**
 * The address to hand someone for `href`. A community project's is always the site's, with the
 * same view and board, whether it is open there or in the app, whose address is localhost and
 * opens nowhere else. A local project's is its own: it is on no site.
 */
export function shareUrl(href: string, name?: string) {
  const id = communityIdOf(href);
  if (!id) return href;
  const { search, hash } = new URL(href);
  return webUrl(id, name) + search + hash;
}

/** Whether two addresses are of one project: the same page, or the same community project
 *  wherever each is open, so a link copied off it (shareUrl) still names this one. */
export function sameProject(a: string, b: string) {
  const id = communityIdOf(a);
  if (id) return id === communityIdOf(b);
  const x = new URL(a);
  const y = new URL(b);
  return x.origin === y.origin && x.pathname === y.pathname;
}
