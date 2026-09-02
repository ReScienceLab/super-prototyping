import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { GRADIENT, PAPER } from "../../lib/palette";
import { Gradient, type GradientProps, MESH } from "../../lib/Gradient";
import { SERIF } from "../../lib/fonts";
import { enter, useDuration } from "../../lib/timing";

/*
 * Word swap: one word in a settled line is replaced in place. The outgoing word
 * blurs and lifts away, the incoming one blurs and lifts in behind it, and the
 * line around them never moves.
 *
 * Reference: f1700-1730, "So you never miss the conversation" — the swapped-in
 * word arrives italic and in the display serif while the line around it stays
 * roman, which is most of the reason the swap reads at all at 30fps.
 *
 * The line not moving is the constraint. Both words are absolutely positioned
 * over a third, invisible copy of the wider of the two, which is what actually
 * holds the space open. Measuring the two words and interpolating the gap
 * instead gives a line that breathes on every swap.
 */

export type WordSwapProps = {
  durationInFrames?: number;
  prefix: string;
  before: string;
  after: string;
  suffix: string;
  /** frame the swap starts */
  at: number;
  /** frames the swap takes */
  frames: number;
  /** px the words travel; out goes up, in comes up from below */
  rise: number;
  blur: number;
  /** the incoming word in italic, as the reference sets it */
  italic: boolean;
  size: number;
  color: string;
  afterColor: string;
  gradient: GradientProps;
};

export const WordSwap: React.FC<WordSwapProps> = ({
  durationInFrames,
  prefix,
  before,
  after,
  suffix,
  at,
  frames,
  rise,
  blur,
  italic,
  size,
  color,
  afterColor,
  gradient,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);

  const t = enter(frame, at, frames);
  const out = { p: 1 - t, y: -rise * t };
  const inn = { p: t, y: rise * (1 - t) };

  // The longer string holds the slot open. Comparing lengths rather than
  // measuring is crude and exactly right here: both words are set in the same
  // face at the same size, so the wider one is the longer one nearly always,
  // and when it is not the slot is a few pixels generous, which nothing sees.
  const widest = after.length >= before.length ? after : before;

  return (
    <AbsoluteFill>
      <Gradient {...gradient} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SERIF,
          color,
        }}
      >
        <div
          style={{
            fontSize: `${size * 100}vh`,
            lineHeight: 1.15,
            textAlign: "center",
            maxWidth: "80%",
            whiteSpace: "pre-wrap",
          }}
        >
          {prefix}
          <span style={{ position: "relative", display: "inline-block" }}>
            <span style={{ visibility: "hidden" }}>{widest}</span>
            {[
              { word: before, ...out, colour: color, slant: false },
              { word: after, ...inn, colour: afterColor, slant: italic },
            ].map(({ word, p, y, colour, slant }) => (
              <span
                key={word}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  color: colour,
                  fontStyle: slant ? "italic" : "normal",
                  opacity: p,
                  filter: `blur(${(1 - p) * blur}px)`,
                  transform: `translateY(${y}px)`,
                }}
              >
                {word}
              </span>
            ))}
          </span>
          {suffix}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = WordSwap;

export const defaultProps: WordSwapProps = {
  prefix: "So you never miss ",
  before: "a moment",
  after: "the conversation",
  suffix: "",
  at: 18,
  frames: 14,
  rise: 34,
  blur: 16,
  italic: true,
  size: 0.105,
  color: PAPER,
  afterColor: GRADIENT[7],
  gradient: MESH,
};
