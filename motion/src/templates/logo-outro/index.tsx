import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BONE, ORANGE, PAPER } from "../../lib/palette";
import { SANS } from "../../lib/fonts";
import { arrive, enter, useDuration } from "../../lib/timing";

/*
 * Logo outro: the end card. The mark is already there, centred, when the shot
 * opens; it lifts to make room, the tagline lands under it a word at a time
 * with a breath at the comma, the call to action drops in last, and then it
 * holds.
 *
 * Reference: f1921-2052 on the flat bone ground, which is 99.7% of the pixels
 * in f1990 — no gradient at all in the last shot, which is the point of it
 * after sixty seconds of gradient. Measured off f1917-2052 (dark-row runs and
 * darkest-percentile colours at 2880 wide):
 *
 *   - The mark cuts in at f1921, nine frames before the previous shot's wash
 *     has finished, with no entrance of its own. On this shot's clock (f1930
 *     is frame 0) it is simply there.
 *   - Its centre sits on y 0.500 until f1953, then lifts to 0.392 over twenty
 *     frames, ease-out. The tagline lands with its centre on 0.523 and drifts
 *     up to 0.498 over sixteen frames; the CTA's box is y 0.577-0.667.
 *   - Words: "Your" f1959, "mind," f1962, "now" f1981, "on" f1985, "demand"
 *     f1990 — four frames apart, and fifteen more after the comma. The CTA is
 *     in over f1999-2005 and nothing moves after that.
 *   - Cap height of the mark is 0.052 of the frame (f1940, rows 0.467-0.519);
 *     the tagline's ascender-to-descender band is 0.048 (f2040), which is what
 *     0.052 of the frame renders as in Inter.
 *   - The ink is #361f11 (mark, f1940) and #361e0f (tagline, f2040): one warm
 *     brown at full opacity, not the palette's near-black INK. CTA fill
 *     #f04a07 with #fefdf6 text (f2040).
 *
 * The mark is the caller's `mark` string set in the UI face. The reference's
 * own wordmark is not reproduced here and this template does not ship a logo:
 * what it replicates is the choreography, and a placeholder makes it reusable
 * besides. Everything has landed by `ctaAt + ctaFrames` and the rest of the
 * shot is deliberately still, because a film must not end on something that
 * is still settling.
 */

export type LogoOutroProps = {
  durationInFrames?: number;
  mark: string;
  tagline: string;
  cta: string;
  /** frame the mark starts lifting off the centre */
  liftAt: number;
  liftFrames: number;
  /** the mark's centre once lifted, as a fraction of the frame height */
  markY: number;
  /** frame the tagline's first word lands */
  taglineAt: number;
  /** frames between words */
  wordStep: number;
  /** extra frames before the word after a comma */
  pause: number;
  /** frames a word takes to fade in */
  wordFrames: number;
  /** frames the line takes to drift up onto `taglineY` */
  settle: number;
  /** px the line lands below its resting place */
  rise: number;
  taglineY: number;
  ctaAt: number;
  ctaFrames: number;
  /** the CTA's centre, as a fraction of the frame height */
  ctaY: number;
  blur: number;
  markSize: number;
  taglineSize: number;
  color: string;
  accent: string;
  accentText: string;
  background: string;
};

const centred = (y: number): React.CSSProperties => ({
  position: "absolute",
  left: "50%",
  top: `${y * 100}%`,
  whiteSpace: "nowrap",
});

export const LogoOutro: React.FC<LogoOutroProps> = ({
  durationInFrames,
  mark,
  tagline,
  cta,
  liftAt,
  liftFrames,
  markY,
  taglineAt,
  wordStep,
  pause,
  wordFrames,
  settle,
  rise,
  taglineY,
  ctaAt,
  ctaFrames,
  ctaY,
  blur,
  markSize,
  taglineSize,
  color,
  accent,
  accentText,
  background,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);

  const lift = enter(frame, liftAt, liftFrames);
  const words = tagline.split(" ");
  // The frame each word lands: `wordStep` apart, plus `pause` for every comma
  // before it.
  const lands = words.map(
    (_, i) =>
      taglineAt +
      i * wordStep +
      pause * words.slice(0, i).filter((w) => w.endsWith(",")).length,
  );
  const ctaIn = enter(frame, ctaAt, ctaFrames);

  return (
    <AbsoluteFill style={{ background, fontFamily: SANS, color }}>
      <div
        style={{
          ...centred(0.5 + (markY - 0.5) * lift),
          transform: "translate(-50%, -50%)",
          fontSize: `${markSize * 100}vh`,
          fontWeight: 600,
          letterSpacing: "-0.035em",
        }}
      >
        {mark}
      </div>
      <div
        style={{
          ...centred(taglineY),
          transform: "translate(-50%, -50%)",
          fontSize: `${taglineSize * 100}vh`,
        }}
      >
        {words.map((word, i) => (
          <React.Fragment key={i}>
            {i ? " " : null}
            <span
              style={{
                display: "inline-block",
                ...arrive(enter(frame, lands[i], wordFrames), blur, 0),
                transform: `translateY(${(1 - enter(frame, lands[i], settle)) * rise}px)`,
              }}
            >
              {word}
            </span>
          </React.Fragment>
        ))}
      </div>
      <div
        style={{
          ...centred(ctaY),
          ...arrive(ctaIn, blur, 0),
          transform: `translate(-50%, -50%) translateY(${(1 - ctaIn) * rise}px)`,
          fontSize: "3.4vh",
          fontWeight: 500,
          padding: "2.6vh 4.5vh",
          borderRadius: 999,
          background: accent,
          color: accentText,
        }}
      >
        {cta}
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
  // f1930 is frame 0.
  liftAt: 23,
  liftFrames: 20,
  markY: 0.392,
  taglineAt: 29,
  wordStep: 4,
  pause: 15,
  wordFrames: 6,
  settle: 16,
  // 0.025 of the frame: the line lands on 0.523 and rests on 0.498.
  rise: 27,
  taglineY: 0.498,
  ctaAt: 69,
  ctaFrames: 6,
  ctaY: 0.622,
  blur: 14,
  // Cap height 0.052 of the frame at f1940; Inter's cap is 0.727 em.
  markSize: 0.071,
  taglineSize: 0.052,
  // Darkest 0.5% of the mark at f1940 (#361f11) and of the tagline at f2040
  // (#361e0f). INK is #1c1613 and is not what this card is set in.
  color: "#361f11",
  accent: ORANGE,
  // #fefdf6 at f2040; PAPER is within four units of it.
  accentText: PAPER,
  background: BONE,
};
