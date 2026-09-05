import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

/*
 * Everything the reel says out loud, in one place, so that a claim on screen
 * can be checked against the run it came from without reading the animation.
 *
 * Every number below is copied from `mockups/canvases/duolingo-ios/`: the two
 * evidence boards for the tokens, that folder's README for the deltas and the
 * artwork scores. Nothing here is rounded for the edit or written to fit a
 * line. If a value looks wrong on screen, it is wrong in the clone, and this
 * file is where to start.
 */

/**
 * The reel's third face. Inter and Instrument Serif live in `src/lib/fonts.ts`
 * because the fifteen templates share them; a mono is this film's alone, and
 * loading it there would put it at the head of every other render for nothing.
 * Same loader for the same reason — a bare @font-face lets one worker draw a
 * frame in the fallback and the file comes out in two typefaces.
 */
export const MONO = loadMono("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
}).fontFamily;

/**
 * GitHub's light theme, Primer's own tokens under their own names. The reel is
 * about reading a repository — a token block, a diff, a folder of evidence —
 * so it is set on the ground that material is normally read on: white, one
 * blue for everything the film points with, one red for the single refusal.
 *
 * `MINOR` and `MAJOR` are the exception and are not decoration: `refkit grid`
 * draws cyan every 10pt and red every 50, and the grid this reel lays over the
 * phone is that grid. They are the tool's colours rather than the theme's, and
 * they are only ever drawn over a board.
 */
export const GROUND = "#ffffff"; // canvas.default
export const SUBTLE = "#f6f8fa"; // canvas.subtle
export const INSET = "#eaeef2"; // the ground of a track or a well
export const BORDER = "#d1d9e0"; // border.default
export const INK = "#1f2328"; // fg.default
export const MUTE = "#59636e"; // fg.muted
export const ACCENT = "#0969da"; // accent.fg — every eyebrow, rule and callout
export const DANGER = "#d1242f"; // danger.fg — the one refusal
export const DONE = "#8250df"; // done.fg — the far end of the progress rule
export const MINOR = "#22d3ee"; // refkit grid, every 10pt
export const MAJOR = "#ff4757"; // refkit grid, every 50pt

/** The one screen the reel measures, in its own green. */
export const DUO_GREEN = "#59CC01";

/** The eight boards, in the order `layout.json` lays them out. */
export const BOARDS = [
  "01-path-green",
  "02-path-red",
  "03-path-blue",
  "04-section-done",
  "05-section-next",
  "06-jump-here",
  "07-streak-freeze",
  "08-league-promo",
] as const;

/**
 * Phase 1b, three probes taken off screen 01 alone, so the boxes the reel
 * draws are the boxes the numbers came from.
 *
 * `name` and `note` are the film's words, not the tool's: on screen this is
 * three things a newcomer can point at — a fill, a corner, a rule — and how
 * each was read. The tokens they land in are `--d-u-green`, `--d-r-card` and
 * `--d-rule`, and the techniques are a flat census over 16,704 px, a
 * least-squares corner fit at rms 0.20, and a column scan at y 757.6. Those
 * belong on the evidence board in `mockups/canvases/duolingo-ios/`, which is
 * where a reader who wants them should end up.
 *
 * `box` is in design pt on the 393 x 852 screen, which is also the unit every
 * token is written in.
 */
export const EVIDENCE = [
  {
    name: "the green in the header",
    value: "#59CC01",
    note: "read off every pixel of the fill",
    swatch: "#59CC01",
    box: [24.1, 111, 344.8, 76] as const,
  },
  {
    name: "how round the corners are",
    value: "13.5pt",
    note: "fitted to the curve, not eyeballed",
    swatch: null,
    box: [24.1, 111, 34, 34] as const,
  },
  {
    name: "the hairline under the tabs",
    value: "#E3E3E3",
    note: "scanned all the way across the row",
    swatch: "#E3E3E3",
    box: [0, 756.6, 393, 2.2] as const,
  },
] as const;

/**
 * Phase 1c. `refkit font` ranks a word's glyph shapes against a closed set of
 * faces already on disk; under a 0.05 top-two margin it reports no call rather
 * than naming a lookalike. Duolingo sets Feather Bold, which is not on this
 * machine and not in any candidate list, so the run scored 0.353 against a top
 * scorer of SF Compact and refused — and the board ships a declared stand-in.
 *
 * The reel draws `FONT_SCORE` as a bar and never prints it. What a newcomer
 * needs from this shot is that the tool can decline, not what it declined at.
 */
export const CANDIDATES = [
  "ui-rounded",
  "Helvetica Neue",
  "Georgia",
  "Avenir Next",
  "Courier New",
] as const;
export const FONT_SCORE = 0.353;

/**
 * Phase 2, the measured `:root` every board inlines — under the names the
 * film uses for it rather than its own. A beginner reading `--d-u-green-d`
 * learns nothing; reading "darker green  #45A302" beside a board that is
 * mostly green learns what a token is. The real names are one file away, in
 * `mockups/canvases/duolingo-ios/00-design-tokens.html`, and every value here
 * is that board’s, unrounded.
 */
export const RECIPE = [
  // First, because it is literally the first line of that board's `:root` —
  // and because the shot before this one ends on the refusal that put it
  // there. The list opens on the stand-in the tool declared.
  ["typeface", "ui-rounded"],
  ["background", "#FFFFFF"],
  ["panel", "#F7F7F7"],
  ["hairline", "#E3E3E3"],
  ["text", "#4B4B4B"],
  ["faint text", "#AFAFAF"],
  ["green", "#59CC01"],
  ["darker green", "#45A302"],
  ["red", "#FF4C4B"],
  ["blue", "#1DB1F8"],
  ["purple", "#C385F7"],
  ["button blue", "#53ADF0"],
  ["orange", "#F89402"],
  ["card corner", "13.5pt"],
  ["button corner", "10pt"],
  ["tile corner", "24pt"],
  ["unit heading", "19.4pt"],
  ["screen title", "22.9pt"],
  ["body text", "19.3pt"],
  ["card starts at", "24.1pt"],
  ["card width", "344.8pt"],
  ["tab bar at", "756.6pt"],
] as const;

/**
 * Phase 4. Mean absolute delta against the capture, whole 393 x 852 frame,
 * in levels of 255. The two sheets are highest because they carry the most
 * type; the six path screens are mostly illustration, and illustration is
 * cropped out of the capture rather than redrawn.
 */
export const DELTAS = [
  { screen: "01 path, green", d: 1.41 },
  { screen: "02 path, red", d: 1.47 },
  { screen: "03 path, blue", d: 2.38 },
  { screen: "04 section complete", d: 2.38 },
  { screen: "05 up next, locked", d: 1.83 },
  { screen: "06 jump here", d: 1.32 },
  { screen: "07 streak freeze", d: 2.59 },
  { screen: "08 league promotion", d: 2.93 },
] as const;

/** 16.31 / 8. Written out so the screen and this file cannot drift apart. */
export const MEAN_DELTA =
  DELTAS.reduce((sum, row) => sum + row.d, 0) / DELTAS.length;
