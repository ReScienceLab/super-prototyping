import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { GRADIENT, PAPER } from "../../lib/palette";
import { Gradient, type GradientProps, MESH } from "../../lib/Gradient";
import { enter, useDuration } from "../../lib/timing";

/*
 * Particle form: a few hundred bright dots drift in from everywhere and gather
 * into a shape, densest at its edge.
 *
 * Reference: f1352-1400, beside "Your digital mind / is born" — a standing
 * figure assembling itself out of white specks, dense along the silhouette and
 * sparse through the middle, which is what tells you it is a *shape* made of
 * dots and not a cloud. It is small and tight: about 0.55 of the frame height
 * and a third as wide, left of centre, with the type beside it.
 *
 * The target here is a seeded organic outline rather than a traced silhouette:
 * the mechanic this template exists for is scatter -> gather -> hold, and the
 * outline is a prop-tunable stand-in for whatever shape a film wants. Trading
 * `harmonics`/`aspect`/`seed` reshapes it; tracing a real silhouette would mean
 * shipping a point list and would not make the motion any more faithful.
 *
 * Everything is a pure function of the frame and of `random(seed)`. Nothing is
 * stored between frames, so a worker that starts on frame 90 draws the same
 * thing as one that walked there from frame 0.
 */

export type ParticleFormProps = {
  durationInFrames?: number;
  count: number;
  seed: string;
  /** frames one particle takes to travel */
  travel: number;
  /** frames between the first particle leaving and the last */
  spread: number;
  /** how far particles start from their target, as a fraction of the frame */
  scatter: number;
  /** shape height as a fraction of the frame height */
  scale: number;
  /** width / height of the shape */
  aspect: number;
  /** wobble amplitude of the outline; 0 is a clean ellipse */
  harmonics: number;
  /** 0 fills the shape evenly, 1 pins every particle to the rim */
  rim: number;
  /** dot diameter in px */
  dot: number;
  /** x of the shape's centre, as a fraction of the frame */
  x: number;
  y: number;
  color: string;
  gradient: GradientProps;
};

export const ParticleForm: React.FC<ParticleFormProps> = ({
  durationInFrames,
  count,
  seed,
  travel,
  spread,
  scatter,
  scale,
  aspect,
  harmonics,
  rim,
  dot,
  x,
  y,
  color,
  gradient,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);

  return (
    <AbsoluteFill>
      <Gradient {...gradient} />
      {[...Array(count)].map((_, i) => {
        const r = (k: string) => random(`${seed}-${i}-${k}`);

        const angle = 2 * Math.PI * r("a");
        // Two harmonics on the radius is what turns an ellipse into something
        // that reads as organic; three or more just reads as noise at this dot
        // count. The +1 keeps the radius positive for any `harmonics` <= 0.5.
        const wobble =
          1 + harmonics * (Math.sin(3 * angle + 6 * r("h")) * 0.6 + Math.sin(5 * angle) * 0.4);
        // r("d")^(1-rim) biases the radius outward: at rim=1 every particle is
        // on the outline, at rim=0 the disc fills evenly by area.
        const radius = Math.pow(r("d"), (1 - rim) * 0.5) * wobble;

        const tx = x + Math.cos(angle) * radius * scale * aspect * 0.5 * (1080 / 1920);
        const ty = y + Math.sin(angle) * radius * scale * 0.5;

        const start = 2 * Math.PI * r("s");
        const sx = tx + Math.cos(start) * scatter * (0.4 + r("m"));
        const sy = ty + Math.sin(start) * scatter * (0.4 + r("m"));

        const t = enter(frame, r("t") * spread, travel);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${interpolate(t, [0, 1], [sx, tx]) * 100}%`,
              top: `${interpolate(t, [0, 1], [sy, ty]) * 100}%`,
              width: dot,
              height: dot,
              marginLeft: -dot / 2,
              marginTop: -dot / 2,
              borderRadius: "50%",
              background: color,
              // A particle still in flight is soft and dim; it resolves as it
              // lands, so the shape sharpens into existence rather than sliding
              // into place fully formed.
              opacity: t * (0.45 + 0.55 * r("o")),
              filter: `blur(${(1 - t) * 4}px)`,
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
  count: 560,
  seed: "born",
  travel: 34,
  spread: 46,
  scatter: 0.34,
  scale: 0.58,
  aspect: 0.62,
  harmonics: 0.22,
  rim: 0.35,
  dot: 7,
  x: 0.38,
  y: 0.52,
  color: PAPER,
  gradient: { ...MESH, base: GRADIENT[2] },
};
