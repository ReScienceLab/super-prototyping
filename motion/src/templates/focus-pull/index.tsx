import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { PAPER } from "../../lib/palette";
import { DIM, Gradient, type GradientProps } from "../../lib/Gradient";
import { SERIF } from "../../lib/fonts";
import { enter, useDuration } from "../../lib/timing";

/*
 * Focus pull: a block of type holds sharp, then the camera pushes through it.
 * It swells, goes soft top line first, and is gone before the push ends,
 * leaving the ground alone for the cut.
 *
 * Reference: f1345-1400 — "Your / digital mind / is born", one white block
 * (#ffffff at f1380) right of centre beside the particle figure, held sharp
 * until f1387 and pushed through over f1387-1400. Measured per frame off
 * f1380-1400 against the empty f1400:
 *
 * The block FADES UP; it is not simply there. This file used to say the shot
 * began at f1372, which is where the push segment was measured from, and it
 * opened with the type already at full strength. Laid over `particle-form` in
 * the cut, where the ground no longer changes under it, that read as the type
 * popping into a still frame in one frame. Mean excess over the block box's
 * own per-frame median -- the median is the ground under the type, which
 * drifts by more across this range than the type itself contributes, so a
 * plain mean of the box measures the ground and not the block -- is flat to
 * f1344, then 0.01 / 0.06 / 0.15 / 0.25 / 0.34 / 0.43 / 0.53 / 0.62 / 0.76 /
 * 0.87 / 1.00 of its final at f1345 / 47 / 49 / 51 / 53 / 55 / 57 / 60 / 65 /
 * 68 / 72. That is a straight line at 0.045 a frame: 22 frames, linear, which
 * is `fadeIn`. Its own area is flat over f1358-1367 while the light is still
 * climbing, so the ramp is opacity and not the block growing.
 *
 *   - Both halves of the block scale the same amount about the frame centre:
 *     1.11 / 1.19 / 1.30 / 1.38 / 1.49 at f1390 / 92 / 94 / 95 / 96, which is
 *     1 + 0.65 * p^1.5 over 13 frames. A constant-speed dolly is 1/(1 - vt),
 *     and over this short a move that is t^1.5 to within the measurement.
 *   - The top two lines lose their bright core within two frames (luminance
 *     > 215 gone at f1389); "is born" keeps its four frames longer (gone at
 *     f1394). The defocus is not one filter on the block.
 *   - Light does not simply blur away: the excess over the empty frame rises
 *     to x2.0 at f1395 with the growth, then falls 0.95 / 0.90 / 0.75 / 0.48 /
 *     0 over f1396-1400. The last five frames are an ease-in fade on top of
 *     the blur. By f1400 the block is gone -- though not the frame: f1400
 *     still carries the block's bloom and a bright glyph of the shot after it,
 *     so it is not a clean plate of this shot's ground.
 *
 * What this used to be was a two-plane rack focus with a peach far plane; the
 * reference has one plane, one colour, and a push. See the README.
 */

export type FocusPullProps = {
  durationInFrames?: number;
  /** the block; newlines are hard breaks. Lines go soft top to bottom. */
  text: string;
  /** frame the push starts; the block holds sharp until then */
  at: number;
  /** frames the push takes; the block is gone at the end of it */
  frames: number;
  /** how much bigger the block is by the end of the push, as a fraction */
  zoom: number;
  /** px of defocus a line carries by the end */
  blur: number;
  /** frames the last line stays sharp after the lines above it have started to go */
  lag: number;
  /** frames of opacity fade at the end of the push */
  fade: number;
  /** frames the block fades up over at the head of the shot; 0 opens settled */
  fadeIn: number;
  /** the block's centre, as fractions of the frame */
  x: number;
  y: number;
  size: number;
  /** line-height, as a multiple of `size` */
  leading: number;
  color: string;
  /**
   * The ground. `null` draws none and leaves the shot transparent, which
   * is what lets a cut lay it over another shot: in the reference this
   * type block shares its frame with `particle-form`'s figure, and the two
   * draw the same `DIM` ground, so the one on top must not repaint it.
   */
  gradient: GradientProps | null;
};

export const FocusPull: React.FC<FocusPullProps> = ({
  durationInFrames,
  text,
  at,
  frames,
  zoom,
  blur,
  lag,
  fade,
  fadeIn,
  x,
  y,
  size,
  leading,
  color,
  gradient,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);
  const lines = text.split("\n");
  const push = enter(frame, at, frames, Easing.poly(1.5));
  const gone = enter(frame, at + frames - fade, fade, Easing.in(Easing.quad));
  // Linear, because the reference's is: see the header.
  const up = fadeIn ? enter(frame, 0, fadeIn, Easing.linear) : 1;

  return (
    <AbsoluteFill>
      {gradient && <Gradient {...gradient} />}
      {/* The push scales about the frame centre, not the block: f1390-1396
          has the block's near and far edges growing by the same factor. */}
      <AbsoluteFill
        style={{
          transform: `scale(${1 + zoom * push})`,
          opacity: up * (1 - gone),
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${x * 100}%`,
            top: `${y * 100}%`,
            transform: "translate(-50%, -50%)",
            // Absolutely positioned, the block's width is what is left of
            // the frame right of `x`; the lines must not wrap into it.
            whiteSpace: "nowrap",
            fontFamily: SERIF,
            fontSize: `${size * 100}vh`,
            lineHeight: leading,
            color,
          }}
        >
          {lines.map((line, i) => {
            const last = i === lines.length - 1;
            const soft = enter(frame, at + (last ? lag : 0), frames - lag);
            return (
              <div key={i} style={{ filter: `blur(${soft * blur}px)` }}>
                {line}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = FocusPull;

export const defaultProps: FocusPullProps = {
  text: "Your\ndigital mind\nis born",
  // f1387 on the f1372 -> frame 0 clock the cut uses is frame 15; the push
  // sits at 53 so the block holds for most of the shot and the empty tail
  // after it (f1400, six frames here) is what the cut lands on. See README.
  at: 53,
  frames: 13,
  zoom: 0.65,
  // Luminance > 215 is gone two frames in: the ease-out default on `enter`
  // puts 40% of this on by then, which is more than a stroke width.
  blur: 60,
  lag: 4,
  fade: 5,
  fadeIn: 22,
  // The block is right of centre beside the particle figure, x 0.503-0.927
  // and y 0.305-0.704 at f1380 (extent at 1920): ink centre (0.715, 0.505).
  // This face's box centre is its ink centre: y 0.47 rendered 0.272-0.672.
  x: 0.715,
  y: 0.505,
  // The block is 0.424 wide by 0.399 tall at f1380 (extent at 1920) and the
  // lines are pitched 0.136 apart (tops at 0.298 / 0.431 / 0.570). At 0.16,
  // which matches "Your"'s cap height, this narrower face rendered 0.356 by
  // 0.367; 0.18 puts both within 5%.
  size: 0.18,
  leading: 0.85,
  color: PAPER,
  // The dimmer, flatter ground of f1344-f1400; see DIM in lib/Gradient.tsx.
  gradient: DIM,
};
