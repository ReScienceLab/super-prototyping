import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { BONE, INK, ORANGE, PAPER } from "../../lib/palette";
import { Orb } from "../../lib/Orb";
import { SANS } from "../../lib/fonts";
import { useDuration } from "../../lib/timing";

/*
 * Depth flythrough: a queue of spheres strung out along the z axis with the
 * camera walking forward through them, each one growing, sharpening, passing
 * and gone.
 *
 * Reference: f1900-1975 — a receding row of orbs on the light ground, each with
 * a chat bubble beside it, the near ones large and crisp and the far ones small
 * and soft. The camera does not cut; it dollies, and the row reads as one
 * continuous space.
 *
 * The projection is the real perspective divide, `focal / (z - camera)`, not a
 * lerp between two sizes. It matters: a lerp makes the far orbs approach at the
 * same rate as the near ones and the shot goes flat. The divide gives you the
 * acceleration you can see in the reference for free, because it is the same
 * arithmetic a camera does.
 */

export type DepthFlythroughProps = {
  durationInFrames?: number;
  /** one label per orb; "" for a bare orb */
  labels: string[];
  /** z gap between consecutive orbs, in the same units as `focal` */
  gap: number;
  /** z units the camera covers per frame */
  speed: number;
  /** the perspective constant: bigger is a longer lens, flatter depth */
  focal: number;
  /** z distance in front of the camera that is in focus */
  focus: number;
  /** px of defocus per z unit away from the focal plane */
  blur: number;
  /** orb diameter at z = focal, in px */
  orb: number;
  /** how far orbs wander off the centre line, as a fraction of the frame */
  wander: number;
  seed: string;
  size: number;
  color: string;
  bubble: string;
  accent: string;
  background: string;
};

export const DepthFlythrough: React.FC<DepthFlythroughProps> = ({
  durationInFrames,
  labels,
  gap,
  speed,
  focal,
  focus,
  blur,
  orb,
  wander,
  seed,
  size,
  color,
  bubble,
  accent,
  background,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);
  const camera = frame * speed;

  const shots = labels
    .map((label, i) => {
      const z = (i + 1) * gap - camera;
      // Behind the camera, or so far off it is a sub-pixel speck. Dropping them
      // rather than rendering them at scale ~0 keeps the DOM to a dozen nodes.
      if (z < 0.35 || z > gap * labels.length) return null;
      const k = focal / z;
      return {
        i,
        label,
        k,
        // Painter's algorithm: far orbs must be painted first. React renders in
        // array order, so sorting the array IS the z-sort.
        z,
        x: 0.5 + (random(`${seed}-${i}`) - 0.5) * 2 * wander,
        y: 0.5 + (random(`${seed}-y-${i}`) - 0.5) * wander,
        blur: Math.abs(z - focus) * blur,
        // Fade the last stretch out rather than letting an orb vanish mid-frame
        // at full opacity, which pops.
        opacity: Math.min(1, z / (focus * 0.6)),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => b.z - a.z);

  return (
    <AbsoluteFill style={{ background, fontFamily: SANS }}>
      {shots.map((s) => (
        <div
          key={s.i}
          style={{
            position: "absolute",
            left: `${s.x * 100}%`,
            top: `${s.y * 100}%`,
            display: "flex",
            alignItems: "center",
            gap: orb * s.k * 0.16,
            transform: "translate(-50%, -50%)",
            filter: s.blur ? `blur(${s.blur}px)` : undefined,
            opacity: s.opacity,
            whiteSpace: "nowrap",
          }}
        >
          <Orb size={orb * s.k} />
          {s.label ? (
            <span
              style={{
                fontSize: size * s.k,
                lineHeight: 1.35,
                padding: `${0.5 * s.k}em ${0.9 * s.k}em`,
                borderRadius: 26 * s.k,
                // A bubble has to wrap, or a long line walks off the frame the
                // moment its orb gets close. The parent sets `nowrap` to keep
                // the orb and the bubble on one line; the bubble overrides it.
                maxWidth: 420 * s.k,
                whiteSpace: "normal",
                display: "inline-block",
                // Alternating fills: the reference answers in the accent and
                // asks in the pale bubble, which is what makes a row of orbs
                // read as a conversation rather than as decoration.
                background: s.i % 2 ? accent : bubble,
                color: s.i % 2 ? PAPER : color,
              }}
            >
              {s.label}
            </span>
          ) : null}
        </div>
      ))}
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = DepthFlythrough;

export const defaultProps: DepthFlythroughProps = {
  labels: [
    "Hi, what do you want to know?",
    "How do I read a balance sheet?",
    "Start with what it owes.",
    "And then?",
    "Then what it owns, and the gap.",
  ],
  gap: 2.4,
  speed: 0.075,
  focal: 2.5,
  focus: 3.0,
  blur: 3.4,
  orb: 118,
  wander: 0.14,
  seed: "flythrough",
  size: 15,
  color: INK,
  bubble: "#ffffff",
  accent: ORANGE,
  background: BONE,
};
