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
 * It arrives out of focus and racks sharp while it counts, sits at one size
 * for the whole count, and grows once as the target lands. Every value here is
 * a pure function of the frame.
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
  /** how much the numeral grows as the target lands, as a fraction of itself */
  pop: number;
  /** frame the pop starts */
  popAt: number;
  popFrames: number;
  /** px of defocus on the numeral at frame 0; sharp after `focusFrames` */
  blur: number;
  focusFrames: number;
  /** the same for the label, which racks sharp sooner */
  labelBlur: number;
  labelFocusFrames: number;
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
  pop,
  popAt,
  popFrames,
  blur,
  focusFrames,
  labelBlur,
  labelFocusFrames,
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

  // No push-in with the count: the numeral's rows sit at 0.225-0.757 h from
  // f1178 to f1234 unchanged. It grows once the target lands — 0.531 h at
  // f1234, 0.593 at f1238, 0.615 from f1250 — 16%, three quarters of it in the
  // first four frames, which is the default ease-out cubic over 12.
  const grown = 1 + pop * enter(frame, popAt, popFrames);

  // Rack focus in. A gradient-fitted sigma on the numeral band of the clip
  // scaled to 1920, calibrated against known blurs of f1250 at that size,
  // reads 22 px at f1172, 16.5 at f1176, 11 at f1178-f1180, 7 at f1184, 5.5
  // at f1188, 3.2 at f1192, 1.5 at f1196 and the sharp frame's 1 from f1200:
  // ease-out quad over 30 (16.5, 11.9, 7.9, 4.8, 2.4, 0.9 at +4/8/12/16/20/24).
  // The label is soft too but less, and sooner sharp: 3.0 at f1172, 2.7 at
  // f1174, 2.1 at f1176, 1.15 at f1178, 1.05, 0.85 at f1180, f1182, 0.6 at
  // f1186 — the same curve over 20.
  const focus = (1 - enter(frame, 0, focusFrames, Easing.out(Easing.quad))) * blur;
  const labelFocus =
    (1 - enter(frame, 0, labelFocusFrames, Easing.out(Easing.quad))) * labelBlur;

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
            transform: `scale(${grown})`,
            filter: focus > 0.05 ? `blur(${focus}px)` : undefined,
          }}
        >
          {value}
          {suffix}
        </div>
        <div
          style={{
            position: "absolute",
            color: "#fff",
            // "Mind quality" at f1250: 0.0556 of the frame tall, cap top to
            // descender (5.9vh by height), and 325 px wide at 1920 (5.3vh by
            // width). Inter is wider per height than the reference's face;
            // 5.6vh at -0.03em gives 328 px wide and 5.3% tall, which splits it.
            fontSize: "5.6vh",
            fontWeight: 500,
            letterSpacing: "-0.03em",
            filter: labelFocus > 0.05 ? `blur(${labelFocus}px)` : undefined,
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
  pop: 0.16,
  // f1234: three frames after the count first reads 100 (frame 59).
  popAt: 62,
  popFrames: 12,
  // 22 px sigma at 1920. Chrome's blur(N) measures as a gaussian of N-2 on
  // our own stills (22 -> 20, 30 -> 28), so both are set 8% over the reading.
  blur: 24,
  focusFrames: 30,
  labelBlur: 3.3,
  labelFocusFrames: 20,
  veil: 0.33,
  gradient: MESH,
};
