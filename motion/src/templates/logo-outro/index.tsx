import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BONE, INK, ORANGE, PAPER } from "../../lib/palette";
import { SANS } from "../../lib/fonts";
import { arrive, enter, stagger, useDuration } from "../../lib/timing";

/*
 * Logo outro: the end card. A mark, a line under it, a call to action, each
 * arriving on the same entrance, one after another, and then it holds.
 *
 * Reference: f1930-2052 (the last four seconds) on the flat bone ground, which
 * is 99.7% of the pixels in f1990 — no gradient at all in the last shot, which
 * is the point of it after sixty seconds of gradient.
 *
 * The mark is the caller's `mark` string set in the UI face. The reference's
 * own wordmark is not reproduced here and this template does not ship a logo:
 * what it replicates is the *arrival*, and a placeholder makes it reusable
 * besides.
 *
 * `holdFrames` is the tail this template is really for. A shot dropped at the
 * end of a cut has to stop moving well before the cut does, or the film ends
 * on something still settling. Everything is landed by `at + 2*step + frames`
 * and the rest of the shot is deliberately still.
 */

export type LogoOutroProps = {
  durationInFrames?: number;
  mark: string;
  tagline: string;
  cta: string;
  /** frame the mark arrives */
  at: number;
  /** frames between the mark, the tagline and the CTA */
  step: number;
  /** frames one line takes to arrive */
  frames: number;
  blur: number;
  rise: number;
  /** the mark's push-in: scale at `at`, reaching 1 as it lands */
  scaleFrom: number;
  markSize: number;
  taglineSize: number;
  color: string;
  accent: string;
  accentText: string;
  background: string;
};

export const LogoOutro: React.FC<LogoOutroProps> = ({
  durationInFrames,
  mark,
  tagline,
  cta,
  at,
  step,
  frames,
  blur,
  rise,
  scaleFrom,
  markSize,
  taglineSize,
  color,
  accent,
  accentText,
  background,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);

  const line = (i: number) => stagger(frame, i, { at, step, frames });
  const push = scaleFrom + (1 - scaleFrom) * enter(frame, at, frames);

  return (
    <AbsoluteFill
      style={{
        background,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: SANS,
        color,
      }}
    >
      <div
        style={{
          display: "grid",
          justifyItems: "center",
          gap: "3.4vh",
          textAlign: "center",
        }}
      >
        <div
          style={{
            ...arrive(line(0), blur, rise),
            fontSize: `${markSize * 100}vh`,
            fontWeight: 600,
            letterSpacing: "-0.035em",
            transform: `translateY(${(1 - line(0)) * rise}px) scale(${push})`,
          }}
        >
          {mark}
        </div>
        <div
          style={{
            ...arrive(line(1), blur, rise),
            fontSize: `${taglineSize * 100}vh`,
            opacity: line(1) * 0.78,
          }}
        >
          {tagline}
        </div>
        <div
          style={{
            ...arrive(line(2), blur, rise),
            marginTop: "1.4vh",
            fontSize: "2vh",
            fontWeight: 500,
            padding: "1.5vh 2.6vh",
            borderRadius: 999,
            background: accent,
            color: accentText,
          }}
        >
          {cta}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = LogoOutro;

export const defaultProps: LogoOutroProps = {
  mark: "Motion",
  tagline: "Your mind, now on demand",
  cta: "Create yours now",
  at: 6,
  step: 10,
  frames: 14,
  blur: 14,
  rise: 16,
  scaleFrom: 0.94,
  markSize: 0.062,
  taglineSize: 0.03,
  color: INK,
  accent: ORANGE,
  accentText: PAPER,
  background: BONE,
};
