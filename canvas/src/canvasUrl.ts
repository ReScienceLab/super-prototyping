// The address of what is on screen. A page is `?canvas=<slug>`, the canvases/<slug> folder
// name; the welcome page is the bare URL, so the way in stays the shortest link there is. A
// board of that page is the hash, `?canvas=<slug>#<file>` for canvases/<slug>/<file>.html: the
// board open in the inspector, and what a link to one board points at. Anything else in the
// query string is left alone.

export const WELCOME_PAGE_SLUG = "00-welcome";

const CANVAS_PARAM = "canvas";

/** The page slug an address opens: its `canvas` parameter, else the welcome page. */
export function slugFromUrl(href: string) {
  return new URL(href).searchParams.get(CANVAS_PARAM) ?? WELCOME_PAGE_SLUG;
}

/**
 * The board an address opens, by file name: its hash, else nothing. The hash is typed by hand,
 * so a broken escape in it is a board that does not exist, not an error.
 */
export function boardFromUrl(href: string) {
  const { hash } = new URL(href);
  if (!hash) return undefined;
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return undefined;
  }
}

/**
 * The two pages of the app, for links between them: the canvas showing a page, and that same
 * page's boards at full size (sheet.html, one entry of its own so a board read as a web page
 * does not download tldraw with it). Both take the slug as `?canvas=`, so one address becomes
 * the other by swapping the file. Built on BASE_URL rather than on the current address, which
 * is the other page.
 */
export function canvasPageUrl(slug: string) {
  const query =
    slug === WELCOME_PAGE_SLUG ? "" : `?${CANVAS_PARAM}=${encodeURIComponent(slug)}`;
  return `${import.meta.env.BASE_URL}${query}`;
}

export function sheetPageUrl(slug: string) {
  return `${import.meta.env.BASE_URL}sheet.html?${CANVAS_PARAM}=${encodeURIComponent(slug)}`;
}

/**
 * The address for a page slug and, if one is open, a board of it, built on `href` so the
 * origin, path and other parameters stay.
 */
export function urlForSlug(href: string, slug: string, board?: string) {
  const url = new URL(href);
  if (slug === WELCOME_PAGE_SLUG) url.searchParams.delete(CANVAS_PARAM);
  else url.searchParams.set(CANVAS_PARAM, slug);
  url.hash = board ? encodeURIComponent(board) : "";
  return url.href;
}
