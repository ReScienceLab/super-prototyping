import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COCOA, ORANGE, PAPER } from "../../lib/palette";
import { SANS, SERIF } from "../../lib/fonts";
import { arrive, enter, leave, stagger, useDuration } from "../../lib/timing";

/*
 * Word cascade: a sentence assembling itself a piece at a time, each piece
 * arriving out of focus and settling.
 *
 * The part that is easy to get wrong: where the line sits while it is still
 * short. The reference reserves the finished line's width from the first word
 * — "You've" holds its left edge at 0.263 of W from f17 to f31 while "got"
 * arrives to its right at f21 — and what moves is the whole BLOCK, once,
 * upward: its top runs 0.400 -> 0.294 of H over f18-f31 as the second line's
 * room opens beneath the first. So every unit is laid out from frame 0 (an
 * unarrived one is merely invisible), and the block starts centred on its
 * first line and lifts to centred on the whole. This file used to lay out
 * only the arrived units, which re-centred the flex row in a single frame
 * each time one joined: 163 px sideways at f10, 150 px up at f14.
 *
 * `unit` is what makes this one template rather than three: the reference does
 * the same entrance per letter on a single word ("Gone", f188-212), per word on
 * a sentence ("You've got knowledge", f14-38), and per line on a display block
 * ("So you never miss the conversation / that could change", f1789-1870). Same
 * curve, same blur, different granularity.
 *
 * The block does not push in: its width is 0.518 of W at every frame from f25
 * to f31 (extent). What it does do is leave — from f33 the whole block shrinks,
 * blurs and fades, 0.977 -> 0.956 -> 0.926 -> 0.890 -> 0.832 -> 0.756 of its
 * width at f34-f39, accelerating, and it is gone by f40. That is an ease-in
 * cubic over 7 frames to about 0.6 with the opacity going to zero on the same
 * curve, and it is what `leaveFrames` does at the end of the shot.
 */

export type WordCascadeProps = {
  durationInFrames?: number;
  /** newlines are hard line breaks */
  text: string;
  unit: "letter" | "word" | "line";
  /** frames between one unit starting and the next */
  step: number;
  /** frames a unit takes to arrive */
  frames: number;
  /** frame the first unit starts */
  at: number;
  /** frame the block starts lifting from centred on its first line to centred */
  liftAt: number;
  /** frames the lift takes; ease-out cubic */
  liftFrames: number;
  /** px of blur a unit starts with */
  blur: number;
  /** px a unit rises through as it arrives */
  rise: number;
  /** a substring drawn in the accent colour; "" for none */
  accent: string;
  face: "serif" | "sans";
  /** type size as a fraction of the frame height */
  size: number;
  /** the block's push-in across the whole shot; 1 is none */
  scaleFrom: number;
  /** frames the block takes to shrink and fade out at the end; 0 holds */
  leaveFrames: number;
  color: string;
  accentColor: string;
  background: string;
};

export const WordCascade: React.FC<WordCascadeProps> = ({
  durationInFrames,
  text,
  unit,
  step,
  frames,
  at,
  liftAt,
  liftFrames,
  blur,
  rise,
  accent,
  face,
  size,
  scaleFrom,
  leaveFrames,
  color,
  accentColor,
  background,
}) => {
  const frame = useCurrentFrame();
  const duration = useDuration(durationInFrames);

  // Split into lines, then each line into units. A running index across the
  // whole block is what makes the stagger continue over a line break instead of
  // restarting, which is what the reference does.
  const lines = text.split("\n");
  let index = 0;
  const laid = lines.map((line) =>
    (unit === "line"
      ? [line]
      : unit === "word"
        ? line.split(" ")
        : // a non-breaking space so a letter-by-letter split keeps its gaps
          [...line.replace(/ /g, "\u00a0")]
    ).map((piece) => ({ piece, i: index++ })),
  );

  const push = scaleFrom + (1 - scaleFrom) * enter(frame, 0, duration);
  // The block starts centred on its first line and lifts to centred on all of
  // them: the reference's block top runs 0.400 -> 0.294 of H over f18-f31,
  // decelerating — 0.26 / 0.41 / 0.49 / 0.58 / 0.68 / 0.75 / 0.82 / 0.88 /
  // 0.91 / 0.92 / 0.96 / 0.98 / 1.00 of the way at f19-f31. Ease-out cubic
  // over 16 frames fits that to rmse 0.033 (ease-out quad over 12: 0.046).
  // Half a line box per line below the first: lineHeight 1.12, so 0.56em.
  const lift = enter(frame, liftAt, liftFrames);
  const drop = (1 - lift) * (lines.length - 1) * 0.56;
  // Gone eight frames before the end, so a cut lands on the empty ground.
  const held = leaveFrames
    ? leave(frame, duration - leaveFrames - 8, leaveFrames)
    : 1;

  return (
    <AbsoluteFill
      style={{
        background,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: face === "serif" ? SERIF : SANS,
      }}
    >
      <div
        style={{
          fontSize: `${size * 100}vh`,
          lineHeight: 1.12,
          textAlign: "center",
          color,
          opacity: held,
          filter: `blur(${(1 - held) * blur}px)`,
          transform: `translateY(${drop}em) scale(${push * (0.6 + 0.4 * held)})`,
        }}
      >
        {laid.map((units, l) => (
          <div
            key={l}
            style={{
              display: "flex",
              justifyContent: "center",
              // A word gap has to be a real gap: the pieces are separate
              // elements, so the space between them went away with the split.
              // 0.024 of W ink to ink between "You've" and "got" at f32.
              // 0.26em rendered 0.044 and 0.17em 0.033: the e and the g
              // carry 0.009 of W of side bearing between them.
              gap: unit === "word" ? "0.105em" : 0,
              whiteSpace: "pre",
            }}
          >
            {units.map(({ piece, i }) => (
              <span
                key={i}
                style={{
                  ...arrive(
                    stagger(frame, i, { at, step, frames }),
                    blur,
                    rise,
                  ),
                  display: "inline-block",
                  color: accent && piece.includes(accent) ? accentColor : color,
                }}
              >
                {piece}
              </span>
            ))}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = WordCascade;

export const defaultProps: WordCascadeProps = {
  text: "You've got\nknowledge",
  unit: "word",
  step: 4,
  frames: 8,
  at: 6,
  // The reference's lift starts at f18, four frames after "You've" starts
  // arriving (f14) and one after it first shows ink (f17); with `at` 6 that is
  // 10, and ours first shows ink at 9.
  liftAt: 10,
  liftFrames: 16,
  blur: 18,
  rise: 14,
  accent: "",
  face: "serif",
  size: 0.247,
  scaleFrom: 1,
  leaveFrames: 7,
  color: PAPER,
  accentColor: ORANGE,
  // The floor glow under every shot on the dark ground. vprof f33 at x
  // 0.0-0.1: flat COCOA down to 0.63 of H, then #2a1807 #351d0a #44250e
  // #593114 #643617 at 0.70/0.78/0.85/0.93/1.0; #75401c at the bottom centre
  // and #623616 at the bottom corners (9x18 grid) — one ramp, brightest at
  // the bottom centre, only a little dimmer at the corners.
  background: `radial-gradient(ellipse 200% 33% at 50% 100%, #75401c, ${COCOA})`,
};
