// The address of what is on screen. A page is `?canvas=<slug>`, the canvases/<slug> folder
// name; the welcome page is the bare URL, so the way in stays the shortest link there is. One
// thing of that page is the hash: `#<file>` for the board canvases/<slug>/<file>.html, and
// `#assets/brand/<...>` for a picture, which is that file's path inside the folder. A board is
// one file at the folder's root and every picture is under assets/brand, so one hash names
// either without ambiguity. Anything else in the query string is left alone.
//
// A brand kit open in a tab is `?brand=<slug>` instead, and `?brand=` for the index of every
// kit. Its own parameter rather than a second value of `canvas=`, because the two name
// different things of the same folder and a kit has no board to hang a hash off.

export const WELCOME_PAGE_SLUG = "00-welcome";

const CANVAS_PARAM = "canvas";
const BRAND_PARAM = "brand";

/**
 * What one tab shows: a canvas page, by the folder slug its tldraw page is stamped with, or a
 * brand kit — that folder's, or the index of every kit when the slug is empty. The two kinds
 * are what the bar holds and what the address names, so they are spelled here.
 */
export type CanvasTab =
  | { kind: "canvas"; slug: string }
  | { kind: "brand"; slug: string };

/** The page slug an address opens: its `canvas` parameter, else the welcome page. */
export function slugFromUrl(href: string) {
  return new URL(href).searchParams.get(CANVAS_PARAM) ?? WELCOME_PAGE_SLUG;
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
  const query =
    slug === WELCOME_PAGE_SLUG
      ? ""
      : `?${CANVAS_PARAM}=${encodeURIComponent(slug)}`;
  return `${import.meta.env.BASE_URL}${query}`;
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
 * The address for a page slug and, if one is open, a board or picture of it, built on `href` so
 * the origin, path and other parameters stay.
 *
 * Escaped a segment at a time, so a picture's separators survive as separators and its address
 * stays the path a person would recognise; a board's file name has no separator in it and comes
 * out exactly as it always did.
 */
export function urlForSlug(href: string, slug: string, target?: string) {
  const url = new URL(href);
  // A canvas page and a brand kit are two tabs, and the address names the one in front.
  url.searchParams.delete(BRAND_PARAM);
  if (slug === WELCOME_PAGE_SLUG) url.searchParams.delete(CANVAS_PARAM);
  else url.searchParams.set(CANVAS_PARAM, slug);
  url.hash = target ? target.split("/").map(encodeURIComponent).join("/") : "";
  return url.href;
}

/** The tab an address opens: a brand kit when it carries `brand`, else the canvas page. */
export function tabFromUrl(href: string): CanvasTab {
  const brand = new URL(href).searchParams.get(BRAND_PARAM);
  return brand === null
    ? { kind: "canvas", slug: slugFromUrl(href) }
    : { kind: "brand", slug: brand };
}

/** The address for a tab, and for the board or picture open on it when it is a canvas. */
export function urlForTab(href: string, tab: CanvasTab, target?: string) {
  if (tab.kind === "canvas") return urlForSlug(href, tab.slug, target);
  const url = new URL(href);
  url.searchParams.delete(CANVAS_PARAM);
  // Empty is the index of every kit, which is the tab a page that collected none opens.
  url.searchParams.set(BRAND_PARAM, tab.slug);
  url.hash = "";
  return url.href;
}
