/**
 * An SVG on its way into the composer, drawn into a PNG.
 *
 * Two reasons, and either alone would be enough. The CLIs read png, jpeg, gif and webp and
 * nothing else, so a vector handed over whole is a picture the agent cannot look at — it would
 * travel the whole pipe to be refused at the far end. And an SVG is a document rather than an
 * image, which is why IMAGE_TYPES (agents.ts) does not carry one: the server serves an
 * attachment back on its own origin.
 *
 * The drawing goes through an `<img>`, and that is what makes this safe rather than merely
 * convenient. An SVG loaded that way renders in the browser's secure static mode, where a script
 * does not run, an external reference is not fetched and no other document is reachable. Pixels
 * come out; nothing SVG-shaped is stored, sent or served back, so the allowlist stays as it is.
 */

/**
 * The long edge of the PNG. A vector has no pixels of its own to be scaled up past — unlike the
 * photographs in an image row, which App.tsx is careful never to draw larger than they are — so
 * every one is drawn at this size rather than at whatever it claims: a 24px icon attached at 24px
 * is a picture the agent can see nothing in. 1024² of PNG is a few hundred KB against the 24 MB
 * the tray holds.
 */
const RASTER_EDGE = 1024;

/**
 * What to draw the vector at, from its own markup: the `width`/`height` pair if it states one in
 * absolute units, else the `viewBox`, else whatever the browser made of it.
 *
 * Parsed from the text rather than read off the loaded `<img>` because a viewBox-only SVG — which
 * is most icons — has a ratio but no intrinsic size, and browsers disagree on what naturalWidth
 * then reports: the CSS default 300×150 in some, the viewBox in others. Taking the wrong one is a
 * squashed logo, and a logo is the thing people attach these for.
 */
export function rasterSize(
  markup: string,
  natural: { w: number; h: number },
): { w: number; h: number } {
  // The root's start tag, read with a pattern rather than a DOMParser, which code scanning reports
  // as the file's text reinterpreted as markup; three attributes of one tag are all this needs. A
  // file with no whole `<svg …>` tag states nothing and falls through to `natural`. The space
  // before the name is what keeps `stroke-width` from reading as `width`.
  const tag = /<svg\b[^>]*>/.exec(markup)?.[0] ?? "";
  const attr = (name: string) =>
    new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`).exec(tag)?.[2] ?? null;
  const px = (raw: string | null) => {
    const n = Number.parseFloat(raw ?? "");
    // A percentage or an em is a size relative to a box this has no business inventing.
    return Number.isFinite(n) && n > 0 && !/%|e[mx]\s*$/i.test(raw ?? "")
      ? n
      : 0;
  };
  const box = (attr("viewBox") ?? "").split(/[\s,]+/).map(Number);
  const side = (name: string, i: number, fallback: number) =>
    px(attr(name)) ||
    (Number.isFinite(box[i]) && box[i]! > 0 ? box[i]! : 0) ||
    fallback;
  const w = side("width", 2, natural.w);
  const h = side("height", 3, natural.h);
  // A vector that states no size anywhere and that the browser measured at nothing. Square is the
  // only guess left, and it is better than a zero-sized canvas, which throws.
  if (!(w > 0) || !(h > 0)) return { w: RASTER_EDGE, h: RASTER_EDGE };
  const k = RASTER_EDGE / Math.max(w, h);
  // Rounded up off zero, not just rounded. Past about 2048:1 — a hairline rule, a wide divider —
  // the short edge lands under half a pixel and rounds away, and a canvas with a zero side draws
  // nothing for toBlob to hand back. One pixel of a sliver is the sliver; none of it throws.
  const edge = (side: number) => Math.max(1, Math.round(side * k));
  return { w: edge(w), h: edge(h) };
}

/** The same picture as a PNG, named for the file it came from. Rejects if it will not draw. */
export async function rasterizeSvg(file: File): Promise<File> {
  const markup = await file.text();
  // An object URL rather than the text as a data URL: same origin either way, so the canvas is
  // not tainted and toBlob is allowed, and a large icon is not carried twice through base64.
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((drawn, fail) => {
      img.onload = () => drawn();
      img.onerror = () => fail(new Error(`${file.name} is not a picture`));
      img.src = url;
    });
    const { w, h } = rasterSize(markup, {
      w: img.naturalWidth,
      h: img.naturalHeight,
    });
    const surface = document.createElement("canvas");
    surface.width = w;
    surface.height = h;
    const pen = surface.getContext("2d");
    if (!pen) throw new Error("this browser draws no 2d canvas");
    // Left transparent where the vector is transparent. Painting a background in would be a
    // guess at the page it is meant to sit on, and would bury a logo drawn in white.
    pen.drawImage(img, 0, 0, w, h);
    const png = await new Promise<Blob | null>((done) =>
      surface.toBlob(done, "image/png"),
    );
    if (!png) throw new Error(`${file.name} could not be drawn`);
    return new File([png], `${file.name.replace(/\.svg$/i, "")}.png`, {
      type: "image/png",
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
