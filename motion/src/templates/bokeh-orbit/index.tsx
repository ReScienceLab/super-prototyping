import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { COCOA, PAPER } from "../../lib/palette";
import { Orb } from "../../lib/Orb";
import { SERIF } from "../../lib/fonts";
import { enter, useDuration } from "../../lib/timing";

/*
 * Bokeh orbit: a ring of out-of-focus spheres turning around a word.
 *
 * Reference: f268-312, "Chaos" on the dark ground with a broken ring of pale
 * defocused beads around it. The ring is not flat — the beads at the top of the
 * circle are smaller and softer than the ones at the bottom, i.e. it is tilted
 * away from the camera, and the ones on the near half pass in FRONT of the word.
 *
 * It is also much bigger than the frame: at f280 the beads run off the left and
 * right edges and off the top, so what you see is an arc, not a circle. A ring
 * that fits inside the frame reads as a bead necklace hung around the word.
 *
 * That front/behind split is the only thing this template really has to get
 * right, and it is done by rendering the ring twice with the word between the
 * two passes, rather than by sorting one list by depth — a single sorted list
 * is one stacking context and cannot straddle the text no matter how it sorts.
 */

export type BokehOrbitProps = {
  durationInFrames?: number;
  word: string;
  /** beads in the ring */
  count: number;
  /** ring radius as a fraction of frame height */
  radius: number;
  /** how far the ring is tilted away: 0 is edge-on, 1 is face-on */
  tilt: number;
  /** frames for one full turn */
  period: number;
  /** bead diameter as a fraction of frame height, before depth scaling */
  bead: number;
  /** px of defocus on the far side; the near side gets a third of it */
  blur: number;
  /** anything; changes the size jitter per bead */
  seed: string;
  fadeFrames: number;
  size: number;
  color: string;
  background: string;
};

export const BokehOrbit: React.FC<BokehOrbitProps> = ({
  durationInFrames,
  word,
  count,
  radius,
  tilt,
  period,
  bead,
  blur,
  seed,
  fadeFrames,
  size,
  color,
  background,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);
  const fade = enter(frame, 0, fadeFrames);

  const beads = [...Array(count)].map((_, i) => {
    // A seeded angular jitter of up to a bead's own spacing: evenly spaced
    // beads read as a bead necklace, and the reference ring is visibly broken
    // and clumped.
    const angle =
      (2 * Math.PI * i) / count +
      (2 * Math.PI * frame) / period +
      ((random(`${seed}-a-${i}`) - 0.5) * 2 * Math.PI) / count;
    // depth: +1 nearest the camera, -1 furthest. Size, blur, opacity and which
    // pass a bead lands in all hang off this one number.
    const depth = Math.cos(angle);
    const scale = 0.62 + 0.19 * (depth + 1);
    return {
      i,
      near: depth > 0,
      // The 1080/1920 keeps a radius given in frame heights circular once it is
      // written out as a percentage of a 16:9 box's width.
      left: `${50 + Math.sin(angle) * radius * (1080 / 1920) * 100}%`,
      top: `${50 - depth * radius * tilt * 100}%`,
      // A seeded jitter per bead so the ring is not a bicycle wheel. Seeded,
      // not random: the same bead must be the same size on every worker.
      diameter: bead * 1080 * scale * (0.45 + 1.1 * random(`${seed}-${i}`)),
      blur: blur * (depth > 0 ? 0.34 : 1) * scale,
      opacity: 0.35 + 0.25 * (depth + 1),
    };
  });

  const ring = (half: boolean) => (
    <AbsoluteFill style={{ opacity: fade }}>
      {beads
        .filter((b) => b.near === half)
        .map((b) => (
          <Orb
            key={b.i}
            size={b.diameter}
            blur={b.blur}
            opacity={b.opacity}
            style={{
              position: "absolute",
              left: b.left,
              top: b.top,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
    </AbsoluteFill>
  );

  return (
    <AbsoluteFill style={{ background }}>
      {ring(false)}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SERIF,
          fontSize: `${size * 100}vh`,
          color,
        }}
      >
        {word}
      </AbsoluteFill>
      {ring(true)}
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = BokehOrbit;

export const defaultProps: BokehOrbitProps = {
  word: "Chaos",
  count: 48,
  radius: 0.9,
  tilt: 0.85,
  period: 260,
  bead: 0.13,
  blur: 34,
  seed: "chaos",
  fadeFrames: 18,
  size: 0.3,
  color: PAPER,
  background: COCOA,
};
