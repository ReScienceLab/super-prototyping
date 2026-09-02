/**
 * The reference film's palette, sampled off its own frames rather than picked.
 * Every value below is a hex that ffmpeg read out of 7481_0.mp4; the comment
 * says which frame and where. Reproduce any of them with:
 *
 *   python3 tools/motionkit.py swatch <clip> <frame> --grid 16x9
 *   python3 tools/motionkit.py swatch <clip> <frame> --crop W:H:X:Y
 *
 * The grid is for the gradient (an area-average IS the set of stops); the crop
 * census is for a solid fill, where an average would report the fill blended
 * with the page behind it.
 *
 * Two flat grounds and one accent carry almost the whole film; everything else
 * is a stop in the warm gradient the templates share.
 */

/** Flat light ground. 99.7% of the pixels in f1990 — no gradient at all. */
export const BONE = "#f4efe7";

/** Flat dark ground. 100% of a 600x300 corner crop at f860. Warm, not black. */
export const COCOA = "#221304";

/** The one saturated accent: the CTA pill fill, 30% of its crop at f2040. */
export const ORANGE = "#ef4a06";

/**
 * The warm gradient, dark pole to light pole. Sampled from f1180, f1300 and
 * f1420, which between them show the gradient at its most crimson, its most
 * vermilion and its most pink. Ordered so `GRADIENT[0]` is the darkest.
 */
export const GRADIENT = [
  "#760010", // crimson   f1180, top-right corner
  "#8b0014", // oxblood   f1180, row 2 right
  "#be001b", // red       f1180, row 7 left
  "#c44412", // vermilion f1300, mid-left
  "#e88451", // ember     f1300, row 2 left
  "#f4a574", // peach     f1180, row 0 left
  "#f6b48f", // blush     f1180, row 4
  "#ffc4a1", // cream     f1180, row 4 — the light band's hot spot
] as const;

/** Ink on BONE: the film's body copy is near-black, never pure black. */
export const INK = "#1c1613";

/** Ink on the gradient and on COCOA. */
export const PAPER = "#faf7f3";
