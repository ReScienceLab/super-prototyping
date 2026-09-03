import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { Gradient, type GradientProps, MESH } from "../../lib/Gradient";
import { SANS } from "../../lib/fonts";
import { enter, useDuration } from "../../lib/timing";

/*
 * Count up: one enormous number climbing to its target over the mesh gradient,
 * with a small label pinned at the optical centre.
 *
 * The number is not drawn on the ground, it is drawn INTO it: a white veil at
 * a third opacity, so the gradient and its light band read straight through the
 * glyphs. That is the whole trick — see README for the three-channel solve that
 * gives the 0.33.
 *
 * Every value here is a pure function of the frame.
 */

export type CountUpProps = {
  /** shot length; omit and the composition's own length is used */
  durationInFrames?: number;
  from: number;
  to: number;
  suffix: string;
  label: string;
  /** frames the count takes. 68 in the reference. */
  countFrames: number;
  /** numeral height as a fraction of the frame height */
  size: number;
  /** the numeral's push-in: scale at frame 0, reaching 1 as the count lands */
  scaleFrom: number;
  /** white veil opacity over the ground */
  veil: number;
  gradient: GradientProps;
};

export const CountUp: React.FC<CountUpProps> = ({
  durationInFrames,
  from,
  to,
  suffix,
  label,
  countFrames,
  size,
  scaleFrom,
  veil,
  gradient,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames); // shot length is the caller's, not the config's

  // Fitted to the reference: normalising the nine sampled readings and solving
  // 1-(1-t)^p gives p = 2.75, 2.22, 2.19, 1.77 across the shot. Mean 2.2, which
  // is quadratic to within the 1-count quantisation of reading a number off a
  // frame, so this is Easing.quad and not a hand-rolled 2.2.
  const t = enter(frame, 0, countFrames, Easing.out(Easing.quad));
  const value = Math.round(from + (to - from) * t);

  return (
    <AbsoluteFill>
      <Gradient {...gradient} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SANS,
        }}
      >
        <div
          style={{
            position: "absolute",
            color: `rgba(255,255,255,${veil})`,
            fontSize: `${size * 100}vh`,
            fontWeight: 400,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            whiteSpace: "nowrap",
            // The count and the push-in share one curve, so the number stops
            // growing at the same frame it stops counting.
            transform: `scale(${scaleFrom + (1 - scaleFrom) * t})`,
          }}
        >
          {value}
          {suffix}
        </div>
        <div
          style={{
            position: "absolute",
            color: "#fff",
            fontSize: "3.9vh",
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
        >
          {label}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = CountUp;

export const defaultProps: CountUpProps = {
  from: 74,
  to: 100,
  suffix: "%",
  label: "Mind quality",
  countFrames: 68,
  size: 0.7,
  scaleFrom: 0.75,
  veil: 0.33,
  gradient: MESH,
};
