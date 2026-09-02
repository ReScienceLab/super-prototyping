import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COCOA, ORANGE, PAPER } from "../../lib/palette";
import { SANS, SERIF } from "../../lib/fonts";
import { arrive, enter, stagger, useDuration } from "../../lib/timing";

/*
 * Word cascade: a sentence assembling itself a piece at a time, each piece
 * arriving out of focus and settling.
 *
 * The part that is easy to get wrong: a piece that has not arrived yet takes up
 * NO SPACE. The reference centres "You've" alone at f20, then re-centres
 * "You've got" as a pair at f24 — the line shifts left as it grows. Reserving
 * the final width and fading pieces in gives a completely different, much
 * deader, shot. So an unarrived unit is not rendered at all.
 *
 * `unit` is what makes this one template rather than three: the reference does
 * the same entrance per letter on a single word (f176-242), per word on a
 * sentence (f20-36), and per line on a display block ("Your digital mind / is
 * born", f1330-1400). Same curve, same blur, different granularity.
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
  /** px of blur a unit starts with */
  blur: number;
  /** px a unit rises through as it arrives */
  rise: number;
  /** a substring drawn in the accent colour; "" for none */
  accent: string;
  face: "serif" | "sans";
  /** type size as a fraction of the frame height */
  size: number;
  /** the block's push-in across the whole shot */
  scaleFrom: number;
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
  blur,
  rise,
  accent,
  face,
  size,
  scaleFrom,
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
          transform: `scale(${push})`,
        }}
      >
        {laid.map((units, l) => {
          const shown = units.filter(({ i }) => frame >= at + i * step);
          if (!shown.length) return null;
          return (
            <div
              key={l}
              style={{
                display: "flex",
                justifyContent: "center",
                // A word gap has to be a real gap: the pieces are separate
                // elements, so the space between them went away with the split.
                gap: unit === "word" ? "0.26em" : 0,
                whiteSpace: "pre",
              }}
            >
              {shown.map(({ piece, i }) => (
                <span
                  key={i}
                  style={{
                    ...arrive(stagger(frame, i, { at, step, frames }), blur, rise),
                    display: "inline-block",
                    color: accent && piece.includes(accent) ? accentColor : color,
                  }}
                >
                  {piece}
                </span>
              ))}
            </div>
          );
        })}
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
  blur: 18,
  rise: 14,
  accent: "",
  face: "serif",
  size: 0.19,
  scaleFrom: 0.9,
  color: PAPER,
  accentColor: ORANGE,
  background: COCOA,
};
