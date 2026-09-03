import React from "react";
import {
  AbsoluteFill,
  Easing,
  random,
  useCurrentFrame,
} from "remotion";
import { DIM, Gradient, type GradientProps } from "../../lib/Gradient";
import { enter, useDuration } from "../../lib/timing";

/*
 * Particle form: a figure made of a hundred-odd white dots fades up in place
 * beside the type.
 *
 * Reference: f1340-1400, beside "Your digital mind / is born". Measured, the
 * figure does NOT gather. Nothing in its region is above luma 150 until f1344;
 * then 133 dots fade up together over about twelve frames — mean dot luma 169
 * at f1346, 183 at f1348, 210 at f1349, 227 at f1352, 250 at f1356, on a
 * ground of 105 — while their centroid sits still (0.278 -> 0.270 w across the
 * fade). It is a bust: head, neck, shoulders, 0.55 of the frame high and a
 * third as wide, left of centre. The dots are pure white with a soft halo and
 * very mixed in size — diameters p10/p50/p90/max of 5.0/10.8/21.5/31.1 px at
 * f1352, which a log-uniform draw over 4.5-30 px gives as 5.4/11.6/24.8/30.
 *
 * After it lands the reference pushes in slowly (centroid x 0.277 at f1350 ->
 * 0.172 at f1388, median dot 10 -> 14.5 px) and defocuses out. Neither is
 * here: a template has to settle and hold, and this one holds the figure.
 *
 * Everything is a pure function of the frame and of `random(seed)`. Nothing
 * is stored between frames, so a worker that starts on frame 90 draws the
 * same thing as one that walked there from frame 0.
 */

/**
 * The figure in twelve equal bands, top to bottom, at f1370 (bbox 0.250-0.802
 * h, so a band is 0.046 h). WIDTH is each band's x extent as a fraction of
 * the figure's height: head 0.30-0.35, neck 0.21-0.23, shoulders 0.45-0.59,
 * then the ragged underside. DENSITY is how many of the 133 dots sit in each
 * band: the head is packed, the neck and the underside are not, and a
 * uniform draw down the figure (what this had before) put a third too few
 * dots in the head and read as an hourglass.
 *
 * The dots are evenly spaced, not scattered: nearest-neighbour distance
 * p10/25/50/75 of 16/19/22/24 px at f1352 (18/22/25/28 at f1370). A uniform
 * draw with these counts gives 6/9/14/20 and clumps into blobs; a jittered
 * two-row lattice across each band gives 13/17/21/25, which is what this
 * lays down.
 */
const WIDTH = [0.3, 0.31, 0.35, 0.32, 0.23, 0.21, 0.3, 0.45, 0.59, 0.57, 0.18, 0.05];
const DENSITY = [13, 15, 14, 8, 8, 10, 14, 17, 15, 15, 3, 1];

export type ParticleFormProps = {
  durationInFrames?: number;
  /** dots in the figure; 133 in the reference, the bands scale with it */
  count: number;
  seed: string;
  /** frame the dots start fading up */
  at: number;
  /** frames the fade takes. 12 in the reference. */
  fadeFrames: number;
  /** figure height as a fraction of the frame height */
  scale: number;
  /** dot diameter range in px, drawn log-uniform */
  dotMin: number;
  dotMax: number;
  /** centre of the figure, as a fraction of the frame */
  x: number;
  y: number;
  /** a hex colour; the halo is drawn from it at 60% */
  color: string;
  gradient: GradientProps;
};

export const ParticleForm: React.FC<ParticleFormProps> = ({
  durationInFrames,
  count,
  seed,
  at,
  fadeFrames,
  scale,
  dotMin,
  dotMax,
  x,
  y,
  color,
  gradient,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);

  // Ease-out quad: the dots' alpha over the ground reads 0.43/0.52/0.70/0.81/
  // 0.97 at frames 2/4/5/8/12 of the fade (f1346-f1356); quad gives 0.31/
  // 0.56/0.66/0.89/1, cubic overshoots the middle at 0.70/0.80.
  const fade = enter(frame, at, fadeFrames, Easing.out(Easing.quad));
  const height = scale * 1080;
  const dots = DENSITY.flatMap((n, band) =>
    [...Array(Math.round((n * count) / 133))].map((_, j, row) => ({ band, j, n: row.length })),
  );

  return (
    <AbsoluteFill>
      <Gradient {...gradient} />
      {dots.map(({ band, j, n }) => {
        const r = (k: string) => random(`${seed}-${band}-${j}-${k}`);

        // Dot j of n in its band: stratified across the band's width, on the
        // upper or lower half-row by parity, jittered in both. The n/(n-1)
        // is because WIDTH is the extent of the outermost dots, and a
        // stratified draw's outermost dots sit half a slot in from the ends.
        const dx = ((j + r("x")) / n - 0.5) * WIDTH[band] * height * (n > 1 ? n / (n - 1) : 1);
        const v = (band + (j % 2 + r("y")) / 2) / DENSITY.length;
        const dot = dotMin * Math.pow(dotMax / dotMin, r("size"));

        return (
          <div
            key={`${band}-${j}`}
            style={{
              position: "absolute",
              left: x * 1920 + dx,
              top: (y - scale / 2) * 1080 + v * height,
              width: dot,
              height: dot,
              marginLeft: -dot / 2,
              marginTop: -dot / 2,
              borderRadius: "50%",
              background: color,
              // The halo. Around a dot at f1370 the ground (106) reads 159/
              // 140/132/125/121 at 1.4/2.7/4/5.3/6.7 px past the edge — a
              // gaussian of about 6 px sigma at 0.6 alpha.
              boxShadow: `0 0 12px ${color}99`,
              opacity: fade,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = ParticleForm;

export const defaultProps: ParticleFormProps = {
  count: 133,
  seed: "born",
  at: 4,
  fadeFrames: 12,
  // Bbox 0.176-0.363 w, 0.266-0.809 h at f1352 and 0.250-0.802 h at f1370:
  // 0.55 h tall, centred on (0.27 w, 0.53 h).
  scale: 0.55,
  dotMin: 4.5,
  dotMax: 30,
  x: 0.27,
  y: 0.53,
  // #ffffff at the centre of the big dots at f1370; PAPER (#faf7f3) read 0.90
  // alpha against the reference's 0.97 on the fade check.
  color: "#ffffff",
  // The band does not move in this shot: a 4x4 census of f1352, f1370 and
  // f1390 is the same to a few levels everywhere the figure and type are not.
  // The dimmer, flatter ground of f1344-f1400; see DIM in lib/Gradient.tsx.
  gradient: DIM,
};
