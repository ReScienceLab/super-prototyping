import React from "react";
import { AbsoluteFill, Easing, random, useCurrentFrame } from "remotion";
import { GRADIENT, PAPER } from "../../lib/palette";
import { Gradient, type GradientProps, MESH } from "../../lib/Gradient";
import { Orb } from "../../lib/Orb";
import { SERIF } from "../../lib/fonts";
import { enter, stagger, useDuration } from "../../lib/timing";

/*
 * Orb bloom: a single warm sphere swells out of the ground until it overruns
 * the frame, and a row of small chips lands across it as it arrives.
 *
 * Reference: f1283-1340, "piece by piece". The shot is a hard cut off the end
 * of the count-up at f1280, and the sphere is ALREADY bigger than the frame on
 * the first frame of it — what f1283-1340 shows is the back half of a bloom,
 * with the bright rim sweeping across and off. The template plays the whole
 * bloom because a template needs a head; see the README.
 *
 * What the shot does pin down is the two ends. `to` has to be at least 2.05:
 * the frame's diagonal is 2.04 frame heights, so a smaller sphere leaves the
 * corners showing and reads as a ball on a background rather than as the shot.
 * 1.4 clears the top and bottom only. And the chips do not just hold — they
 * arrive over three frames each (f1284, f1286, f1291), sit in a flat row for
 * about forty, and then leave upward and outward at different rates over the
 * last ten, which is where the film cuts.
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
  /** frame the chips start leaving */
  exitAt: number;
  exitFrames: number;
  /** how far a chip travels leaving, as a fraction of frame height */
  exit: number;
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
  exitAt,
  exitFrames,
  exit,
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
        {chips.map((chip, i) => {
          const landed = stagger(frame, i, {
            at: chipAt,
            step: chipStep,
            frames: chipFrames,
          });
          // The tail. The reference's chips hold a flat row for most of the
          // shot and then leave upward and outward at different rates over
          // about ten frames — which is the shot's cut point, and the reason
          // this template has an end state and not just a hold.
          const away = enter(
            frame,
            exitAt,
            exitFrames,
            Easing.in(Easing.cubic),
          );
          const dx = (random(`chip-x-${i}`) - 0.5) * 2 * exit * 0.5;
          const dy = -exit * (0.6 + 0.8 * random(`chip-y-${i}`));
          return (
            <span
              key={chip + i}
              style={{
                opacity: landed * (1 - away),
                filter: `blur(${(1 - landed) * 10}px)`,
                transform:
                  `translate(${dx * away * 1080}px, ` +
                  `${(1 - landed) * 12 + dy * away * 1080}px)`,
                display: "flex",
                alignItems: "center",
                gap: "0.5em",
              }}
            >
              <Orb size={22} />
              {chip}
            </span>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = OrbBloom;

export const defaultProps: OrbBloomProps = {
  chips: ["piece", "by", "piece"],
  from: 0.1,
  to: 2.05,
  bloomFrames: 62,
  blur: 60,
  chipAt: 10,
  chipStep: 3,
  chipFrames: 14,
  exitAt: 66,
  exitFrames: 12,
  exit: 0.5,
  size: 0.045,
  color: PAPER,
  gradient: { ...MESH, base: GRADIENT[3] },
};
