import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { GRADIENT, PAPER } from "../../lib/palette";
import { Gradient, type GradientProps, MESH } from "../../lib/Gradient";
import { Orb } from "../../lib/Orb";
import { SERIF } from "../../lib/fonts";
import { arrive, enter, stagger, useDuration } from "../../lib/timing";

/*
 * Orb bloom: a single warm sphere swells out of the ground until it overruns
 * the frame, and a row of small chips lands across it as it arrives.
 *
 * Reference: f1450-1520. The orb goes from roughly a tenth of the frame height
 * to about 1.4x it — it is meant to overrun the top and bottom edges, which is
 * why `to` is greater than 1 and nothing clips it back.
 *
 * The bloom and the defocus run on ONE progress value, not two: the orb is
 * heavily blurred while it is small and resolves as it lands, which is what
 * makes it read as coming toward the camera rather than just scaling up.
 */

export type OrbBloomProps = {
  durationInFrames?: number;
  /** short labels laid across the orb, arriving left to right */
  chips: string[];
  /** orb diameter at frame 0, as a fraction of frame height */
  from: number;
  /** orb diameter once bloomed; over 1 overruns the frame, as the reference does */
  to: number;
  bloomFrames: number;
  /** px of defocus on the orb at frame 0 */
  blur: number;
  /** frame the first chip arrives */
  chipAt: number;
  chipStep: number;
  chipFrames: number;
  size: number;
  color: string;
  gradient: GradientProps;
};

export const OrbBloom: React.FC<OrbBloomProps> = ({
  durationInFrames,
  chips,
  from,
  to,
  bloomFrames,
  blur,
  chipAt,
  chipStep,
  chipFrames,
  size,
  color,
  gradient,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);

  const bloom = enter(frame, 0, bloomFrames);
  // Against 1080 rather than in vh because Orb takes a px diameter; the whole
  // template is authored at the repo's 1920x1080 and scales with it.
  const diameter = (from + (to - from) * bloom) * 1080;

  return (
    <AbsoluteFill>
      <Gradient {...gradient} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Orb size={diameter} blur={(1 - bloom) * blur} opacity={0.92} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: "6vw",
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: `${size * 100}vh`,
          color,
        }}
      >
        {chips.map((chip, i) => (
          <span
            key={chip + i}
            style={{
              ...arrive(
                stagger(frame, i, {
                  at: chipAt,
                  step: chipStep,
                  frames: chipFrames,
                }),
                10,
                12,
              ),
              display: "flex",
              alignItems: "center",
              gap: "0.5em",
              // The chips are offset vertically as well as staggered in time: a
              // flat row of three reads as a caption, the reference reads as
              // debris suspended in front of the sphere.
              marginTop: `${(i % 2 ? 1 : -1) * 6}vh`,
            }}
          >
            <Orb size={22} />
            {chip}
          </span>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = OrbBloom;

export const defaultProps: OrbBloomProps = {
  chips: ["piece", "by", "piece"],
  from: 0.1,
  to: 1.4,
  bloomFrames: 62,
  blur: 60,
  chipAt: 10,
  chipStep: 6,
  chipFrames: 14,
  size: 0.036,
  color: PAPER,
  gradient: { ...MESH, base: GRADIENT[3] },
};
