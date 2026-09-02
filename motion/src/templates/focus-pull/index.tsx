import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { GRADIENT, PAPER } from "../../lib/palette";
import { Gradient, type GradientProps, MESH } from "../../lib/Gradient";
import { SERIF } from "../../lib/fonts";
import { enter, useDuration } from "../../lib/timing";

/*
 * Focus pull: two planes of type, one near and one far, and the focus racks
 * from one to the other while both stay on screen.
 *
 * Reference: f1360-1390 — "Your digital mind is born" is sharp against a soft
 * background, and over about 16 frames the near line goes to mush while what
 * was behind it resolves. It is the cheapest way in the film to move attention
 * without moving the camera or cutting.
 *
 * Two details separate a rack focus from a crossfade, and both are here:
 *
 * - Neither plane's opacity changes. A plane going out of focus keeps all its
 *   light, it just stops being legible. Fading it out reads as a dissolve.
 * - The near plane also scales, very slightly (`breathe`). A real lens changes
 *   magnification as it racks, and without it the shot looks like a Gaussian
 *   blur being turned up on a still, which is exactly what it is.
 */

export type FocusPullProps = {
  durationInFrames?: number;
  /** the plane that starts sharp; newlines are hard breaks */
  near: string;
  /** the plane that ends sharp */
  far: string;
  /** frame the rack starts */
  at: number;
  /** frames the rack takes. 16 in the reference. */
  frames: number;
  /** px of defocus a plane carries when it is not the subject */
  blur: number;
  /** how much the near plane grows as it goes soft, as a fraction */
  breathe: number;
  /** px the far plane sits below the near one */
  offset: number;
  nearSize: number;
  farSize: number;
  color: string;
  farColor: string;
  gradient: GradientProps;
};

export const FocusPull: React.FC<FocusPullProps> = ({
  durationInFrames,
  near,
  far,
  at,
  frames,
  blur,
  breathe,
  offset,
  nearSize,
  farSize,
  color,
  farColor,
  gradient,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);
  const rack = enter(frame, at, frames);

  return (
    <AbsoluteFill>
      <Gradient {...gradient} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SERIF,
          textAlign: "center",
          whiteSpace: "pre-line",
        }}
      >
        <div
          style={{
            position: "absolute",
            transform: `translateY(${offset}px)`,
            fontSize: `${farSize * 100}vh`,
            lineHeight: 1.1,
            color: farColor,
            filter: `blur(${(1 - rack) * blur}px)`,
          }}
        >
          {far}
        </div>
        <div
          style={{
            position: "absolute",
            fontSize: `${nearSize * 100}vh`,
            lineHeight: 1.1,
            color,
            filter: `blur(${rack * blur}px)`,
            transform: `scale(${1 + rack * breathe})`,
          }}
        >
          {near}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = FocusPull;

export const defaultProps: FocusPullProps = {
  near: "Your\ndigital mind",
  far: "is born",
  at: 22,
  frames: 16,
  blur: 14,
  breathe: 0.06,
  offset: 190,
  nearSize: 0.13,
  farSize: 0.115,
  color: PAPER,
  farColor: GRADIENT[7],
  gradient: MESH,
};
