// The address of a page. A board is `?canvas=<slug>`, the canvases/<slug> folder name; the
// welcome page is the bare URL, so the way in stays the shortest link there is. Anything else
// in the query string is left alone.

export const WELCOME_PAGE_SLUG = "00-welcome";

const CANVAS_PARAM = "canvas";

/** The page slug an address opens: its `canvas` parameter, else the welcome page. */
export function slugFromUrl(href: string) {
  return new URL(href).searchParams.get(CANVAS_PARAM) ?? WELCOME_PAGE_SLUG;
}

/** The address for a page slug, built on `href` so the origin, path and other parameters stay. */
export function urlForSlug(href: string, slug: string) {
  const url = new URL(href);
  if (slug === WELCOME_PAGE_SLUG) url.searchParams.delete(CANVAS_PARAM);
  else url.searchParams.set(CANVAS_PARAM, slug);
  return url.href;
}
