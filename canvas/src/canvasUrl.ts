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

/** The board an address opens, by file name: its hash, else nothing. */
export function boardFromUrl(href: string) {
  const { hash } = new URL(href);
  return hash ? decodeURIComponent(hash.slice(1)) : undefined;
}

/**
 * The address for a page slug and, if one is open, a board of it, built on `href` so the
 * origin, path and other parameters stay.
 */
export function urlForSlug(href: string, slug: string, board?: string) {
  const url = new URL(href);
  if (slug === WELCOME_PAGE_SLUG) url.searchParams.delete(CANVAS_PARAM);
  else url.searchParams.set(CANVAS_PARAM, slug);
  url.hash = board ?? "";
  return url.href;
}
