import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { GRADIENT } from "./palette";
import { enter } from "./timing";

/**
 * The ground almost every shot in the reference film sits on: a warm mesh
 * gradient with a hard diagonal light band across it.
 *
 * Two separate measurements, both off f1172-f1280 (the percentage shot, which
 * holds still long enough to fit):
 *
 * - The band runs at a constant **35 degrees**, from a luminance-weighted
 *   centroid fitted per row: dx/dy = +1.43 at f1180 and +1.43 again at f1260.
 * - It slides **33% of the frame width to the left** and stops: the centroid
 *   goes 172 -> 130 -> 107 -> 96 -> 94 -> 92 (of 240) at f1172/80/90/1200/10/40.
 *   Fitting 1-(1-t)^p over that gives p = 3.4, 2.8, 2.5 — an **ease-out cubic
 *   over 40 frames**, which is what `enter` already is.
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
  /** band width as a fraction of the gradient axis */
  bandWidth: number;
  /** how far the band slides, as a fraction of the axis. Negative = leftward. */
  bandTravel: number;
  /** frames the slide takes to ease out */
  bandFrames: number;
  /** band opacity at its centre */
  bandOpacity: number;
};

export const MESH: GradientProps = {
  base: GRADIENT[2],
  blobs: [
    { x: 0.08, y: 0.9, r: 0.55, stop: 0, drift: 0.04, period: 210 },
    { x: 0.85, y: 0.12, r: 0.5, stop: 0, drift: 0.05, period: 260 },
    { x: 0.3, y: 0.25, r: 0.45, stop: 3, drift: 0.06, period: 190 },
    { x: 0.72, y: 0.78, r: 0.42, stop: 4, drift: 0.05, period: 230 },
    { x: 0.5, y: 0.5, r: 0.3, stop: 5, drift: 0.07, period: 170 },
  ],
  bandAngle: 35,
  bandWidth: 0.62,
  bandTravel: -0.33,
  bandFrames: 40,
  bandOpacity: 0.85,
};

export const Gradient: React.FC<GradientProps> = ({
  base,
  blobs,
  bandAngle,
  bandWidth,
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

  // 50% is the band's resting place; it slides in from `-bandTravel` away.
  const centre = 50 + 100 * -bandTravel * (1 - enter(frame, 0, bandFrames));
  const half = (bandWidth * 100) / 2;
  const band =
    `linear-gradient(${bandAngle}deg, ` +
    `${GRADIENT[7]}00 ${centre - half}%, ` +
    `${GRADIENT[7]} ${centre}%, ` +
    `${GRADIENT[7]}00 ${centre + half}%)`;

  return (
    <AbsoluteFill style={{ background: base }}>
      <AbsoluteFill style={{ background: layers.join(", ") }} />
      <AbsoluteFill style={{ background: band, opacity: bandOpacity }} />
    </AbsoluteFill>
  );
};
