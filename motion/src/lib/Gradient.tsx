import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { GRADIENT } from "./palette";
import { enter } from "./timing";

/**
 * The ground almost every shot in the reference film sits on: a warm mesh
 * gradient with a hard diagonal light band across it.
 *
 * All of it measured off f1172-f1280 (the percentage shot, which holds still
 * long enough to fit), on the middle 24 rows of a frame blurred hard enough to
 * erase the numerals — the band is the only thing in the frame that survives:
 *
 * - It runs at a constant **35 degrees**, from a luminance-weighted centroid
 *   fitted per row: dx/dy = +1.43 at f1180 and +1.43 again at f1260.
 * - It comes to rest **off centre and asymmetric**. At f1220/f1240/f1260 the
 *   profile peaks at 0.423 W and its half-height edges are at -0.345 W and
 *   +0.220 W: a long tail into the left of the frame, a hard edge on the
 *   right, and crimson ground again by 0.75 W. A symmetric band centred on the
 *   frame — which is what this was until the shots were cut together — washes
 *   the whole frame pink and never lets the right side go dark.
 * - It slides in from 0.619 W at f1172, so **0.196 W of travel**, easing out.
 *   Fitting T(1-t)^3 to the offsets at f1176/f1180/f1192 gives 36, 40 and 31
 *   frames, so the 40 that `enter` already does is inside the spread. (An
 *   earlier pass read 0.33 W of travel from a per-row centroid; that method
 *   reads the start too far right, because at f1172 the band's right half is
 *   still off the frame and cannot be weighed.)
 * - Its body is **#f7c2a2**, near enough constant over all eleven frames
 *   sampled (#f7bf9f to #f7c7ab). That is GRADIENT[7] at full opacity, within
 *   8/255 on R and 2 on G — the 0.85 this carried was the error, not the hue.
 *
 * The percentages below are on the gradient axis, not on the frame. One point
 * of axis is 0.01803 W at the middle row, which is the conversion used above;
 * our own render is the ruler for it (at `bandRest` 0 and symmetric half-widths
 * of 0.31 it peaks at 0.501 W with half-height edges at +/-0.254 W).
 *
 * The blobs drift on sines rather than being animated, so a frame is a pure
 * function of its index and nothing has to be rendered in order.
 */

export type Blob = {
  /** centre, as a fraction of the frame */
  x: number;
  y: number;
  /** radius, as a fraction of the frame width */
  r: number;
  /** index into GRADIENT */
  stop: number;
  /** how far the centre wanders, as a fraction of the frame */
  drift?: number;
  /** frames per full wander; a different one per blob keeps it from pulsing */
  period?: number;
};

export type GradientProps = {
  base: string;
  blobs: Blob[];
  /** degrees, CSS convention (0 = up, clockwise). 35 is the measured value. */
  bandAngle: number;
  /** where the band comes to rest, as a fraction of the axis from the centre */
  bandRest: number;
  /** how far the leading tail reaches left of the peak, fraction of the axis */
  bandLeft: number;
  /** how far the trailing edge reaches right of it. Shorter: the band falls
   *  off hard on that side and gives the ground back. */
  bandRight: number;
  /** how far the band slides, as a fraction of the axis. Negative = leftward. */
  bandTravel: number;
  /** frames the slide takes to ease out */
  bandFrames: number;
  /** band opacity at its centre */
  bandOpacity: number;
};

/**
 * The ground of f1172-f1280, which is the one most of the film's animated
 * shots sit on. Off the band it is one vertical ramp and nothing else:
 * `swatch --grid 16x9` at f1180, f1220 and f1260 all read #760010 #7f0011
 * #8b0014 #960013 #9f0016 #ab0018 #b50018 #be001b #ca001c down the rows, the
 * same in every column the band is not in.
 *
 * It carried five drifting blobs until the shots were cut together. Those were
 * fitted to f1300 — a shot that no template using this ground is on — and put
 * a pink wash and darkened corners over frames that measure as plain crimson.
 * A `blobs` list is still the right shape for a ground that has them; this one
 * does not, and nor does f1352-f1400. See `DIM` below.
 */
export const MESH: GradientProps = {
  base: `linear-gradient(${GRADIENT[0]}, ${GRADIENT[2]} 83%, #ca001c)`,
  blobs: [],
  bandAngle: 35,
  // Set from the targets above via the 0.01803 W a point of axis is worth.
  // `bandLeft` and `bandRight` are where the profile reaches the ground, not
  // its half-height: with FALL_LEFT / FALL_RIGHT on it the two are no longer
  // the same number. The normalised profile of f1220 hits zero at 0.90 W and,
  // fitted through its two innermost samples, at -0.10 W.
  bandRest: -0.036,
  bandLeft: 0.289,
  bandRight: 0.266,
  bandTravel: -0.109,
  bandFrames: 40,
  bandOpacity: 1,
};

/**
 * The band's falloff, as (distance from the peak in units of `bandLeft` or
 * `bandRight`, alpha). Straight stops -- one transparent, one solid, one
 * transparent -- draw a triangle, which is a specular streak with a point on
 * it, not a light: the normalised middle-row profile of f1220 holds 0.91-0.99
 * all the way from 0.20 W to 0.50 W, where a triangle of the same half-height
 * ramps 0.70 -> 0.99. So the shoulder is flat and the tails are long.
 *
 * The two sides are not the same curve, which is the other half of why one
 * `bandWidth` never fitted: the left leaves the shoulder at 0.4 and is still
 * at 0.27 alpha nine tenths of the way out, while the right is under half by
 * 0.4 and under a tenth by 0.8. Both fitted off f1220 with the peak at 0.425 W
 * and the zeros at -0.10 W and 0.90 W.
 */
const FALL_LEFT: [number, number][] = [
  [0, 1],
  [0.4, 0.92],
  [0.6, 0.6],
  [0.8, 0.27],
  [1, 0],
];
const FALL_RIGHT: [number, number][] = [
  [0, 1],
  [0.25, 0.86],
  [0.4, 0.55],
  [0.6, 0.34],
  [0.8, 0.1],
  [1, 0],
];

export const Gradient: React.FC<GradientProps> = ({
  base,
  blobs,
  bandAngle,
  bandRest,
  bandLeft,
  bandRight,
  bandTravel,
  bandFrames,
  bandOpacity,
}) => {
  const frame = useCurrentFrame();

  // Each blob wanders on a Lissajous figure: x on the period, y on 1.4x it, so
  // the two never come back into phase inside a shot and the ground never
  // visibly repeats.
  const layers = blobs.map(({ x, y, r, stop, drift = 0, period = 200 }) => {
    const t = (2 * Math.PI * frame) / period;
    const cx = (x + drift * Math.sin(t)) * 100;
    const cy = (y + drift * Math.cos(t * 1.4)) * 100;
    // `ellipse R% R%`, not `circle R%`: a circle's radius may not be a
    // percentage, and one invalid layer in the list drops the WHOLE background
    // shorthand — the blobs vanish silently and you are left looking at the
    // base colour wondering why the mesh has no mesh in it.
    return (
      `radial-gradient(ellipse ${r * 100}% ${r * 100}% at ${cx}% ${cy}%, ` +
      `${GRADIENT[stop]} 0%, ${GRADIENT[stop]}00 70%)`
    );
  });

  // `bandRest` is where it stops; it slides in from `-bandTravel` beyond that.
  const centre =
    50 + 100 * (bandRest - bandTravel * (1 - enter(frame, 0, bandFrames)));
  const side = (u: number, a: number, width: number) =>
    `${GRADIENT[7]}${Math.round(a * 255).toString(16).padStart(2, "0")} ` +
    `${centre + u * width * 100}%`;
  const band =
    `linear-gradient(${bandAngle}deg, ` +
    [
      ...[...FALL_LEFT].reverse().map(([u, a]) => side(-u, a, bandLeft)),
      ...FALL_RIGHT.slice(1).map(([u, a]) => side(u, a, bandRight)),
    ].join(", ") +
    ")";

  return (
    <AbsoluteFill style={{ background: base }}>
      <AbsoluteFill style={{ background: layers.join(", ") }} />
      <AbsoluteFill style={{ background: band, opacity: bandOpacity }} />
    </AbsoluteFill>
  );
};

/**
 * The ground under f1344-f1400. The same crimson ramp, but the light on it is
 * dimmer, flatter and has no hard edge anywhere in frame.
 *
 * The middle-row read that fitted `MESH` needs an empty frame and this shot
 * never has one: the particle figure and the type block are in it throughout,
 * and even f1400 carries their bloom. So this was fitted a different way —
 * every pixel binned by where it sits along the band's own 35-degree axis (in
 * units of W from the frame centre, so a stop at p% sits at (p-50) * 0.01034),
 * with everything whitish masked out. That leaves 83% of f1370 as ground, and
 * a profile of:
 *
 *   t     -0.28  -0.18  -0.08  +0.02  +0.07  +0.12  +0.17  +0.22  +0.27  +0.37
 *   luma  107.0  104.3  106.2  105.2   96.5   80.6   65.6   53.2   46.0   39.9
 *
 * — a flat shoulder at 105 across the whole left half of the frame and a fall
 * to the crimson floor over the right. The four props below reproduce it to an
 * rmse of 1.2 luma. The values they replaced were fitted when the band was
 * still a triangle, where `bandLeft` and `bandRight` meant half-height widths;
 * under FALL_LEFT / FALL_RIGHT they mean ground-crossings, so `DIM` spreading
 * `MESH` silently doubled its band and washed the left half of every shot that
 * uses it to 150 luma against the reference's 105.
 *
 * What this still does not have is the reference's second light: the two
 * bins past t = -0.30 are the bottom-left corner of the frame, where f1370
 * climbs to 140 while the band's shoulder stays flat. It is a bloom in the
 * corner, not part of the band, and it is not on this film's ramp either —
 * the corner averages #bd6a6f against our #d0313c, and blue equal to green
 * there means whatever is lighting it is neutral, where every stop in
 * GRADIENT is warm. Backing it out of the base needs about #bbb1a8 at 0.6,
 * which is a colour this palette does not have. Left out until it is measured
 * properly rather than guessed; everywhere else this fits to 4 luma.
 */
export const DIM: GradientProps = {
  ...MESH,
  bandRest: 0.01,
  bandLeft: 0.75,
  bandRight: 0.29,
  bandTravel: 0,
  bandOpacity: 0.35,
};
