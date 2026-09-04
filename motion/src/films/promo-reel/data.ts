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
 * The palette is the repo's own logo, read off `assets/super-prototyping-logo.png`:
 * artboards as white-edged panels glowing on pure black, over a lit grid. So
 * the ground is black, the boards glow white, and the only other ink is the
 * measurement itself.
 *
 * `MINOR` and `MAJOR` are not decoration: `refkit grid` draws cyan every 10pt
 * and red every 50, and the grid this reel lays over the phone is that grid.
 */
export const GROUND = "#07080a";
export const GLOW = "#ffffff";
export const HAZE = "#b9a7ff"; // the lilac fringe on the logo's lit edges
export const MINOR = "#22d3ee"; // refkit grid, every 10pt
export const MAJOR = "#ff4757"; // refkit grid, every 50pt
export const PAPER = "#e9edf2";
export const MUTE = "#767f8c";

/** The one screen the reel measures. Its own header green, for the accent. */
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
 * draws are the boxes the numbers came from. The technique differs per region
 * and that is the shot: a flat fill is a census over its own pixels, a corner
 * is a least-squares fit, a 2pt rule is a scan across it.
 *
 * `box` is in design pt on the 393 x 852 screen, which is also the unit every
 * token is written in.
 */
export const EVIDENCE = [
  {
    token: "--d-u-green",
    value: "#59CC01",
    how: "flat census · unit header fill · 16,704 px",
    swatch: "#59CC01",
    box: [24.1, 111, 344.8, 76] as const,
  },
  {
    token: "--d-r-card",
    value: "13.5pt",
    how: "least-squares corner fit · rms 0.20",
    swatch: null,
    box: [24.1, 111, 34, 34] as const,
  },
  {
    token: "--d-rule",
    value: "#E3E3E3",
    how: "column scan · tab-bar rule at y 757.6",
    swatch: "#E3E3E3",
    box: [0, 756.6, 393, 2.2] as const,
  },
] as const;

/**
 * Phase 1c. `refkit font` ranks a word's glyph shapes against a closed set of
 * faces already on disk; under a 0.05 top-two margin it reports no call rather
 * than naming a lookalike. Duolingo sets Feather Bold, which is not on this
 * machine and not in any candidate list, so the run scored 0.353 and refused —
 * and the board ships a declared stand-in whose cap ratio was then measured on
 * the render rather than assumed from SF Pro's.
 */
export const CANDIDATES = [
  "ui-rounded",
  "Helvetica Neue",
  "Georgia",
  "Avenir Next",
  "Courier New",
] as const;
export const FONT_SCORE = 0.353;
export const FONT_TOP = "SF Compact";

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
