import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { BONE, INK, ORANGE, PAPER } from "../../lib/palette";
import { SANS } from "../../lib/fonts";
import { enter, useDuration } from "../../lib/timing";

/*
 * Pill expand: a small labelled pill pops in over a paragraph, the paragraph
 * falls out of focus behind it, and the pill opens into a card.
 *
 * Reference f1084-f1150, measured as the white box's bounding rectangle and
 * the ink inside it. Frames below are relative to the pill's first frame
 * (f1088, `at`):
 *
 *   +0..20   pill pops in: 399x107 -> 528x142 at 1920, centre 55 px low and
 *            rising, no fade (it is fully white on its first frame). 0.19,
 *            0.43, 0.66, 0.81, 0.91 of the way at +2, +3, +6, +10, +12: an
 *            ease-out cubic over 20.
 *   +0..12   the paragraph behind defocuses (gradient-fitted sigma 1.5, 3.6,
 *            4.6, 5.3, 5.8 px at +2, +3, +5, +9, +12, then flat to +72) and
 *            dims to about 0.55 of its contrast.
 *   +23..47  the box opens 528x142 -> 821x414 about its centre. Its width is
 *            0.08, 0.36, 0.65, 0.85, 0.95, 0.99 of the way at 0.25, 0.42,
 *            0.54, 0.67, 0.79, 0.92 of the run: an ease-in-out cubic.
 *   +33..36  the pill label is gone (its black ink goes 10800 px to 0 in
 *            three frames).
 *   +41..52  the title and body land together, opacity only, on an
 *            ease-out quad: 0.18, 0.46, 0.73, 0.93, 0.97 of the way at
 *            +42 to +50.
 *   +62..    holds. The card then drifts left from about +77, which a
 *            template that has to settle does not do.
 *
 * The corner radius is one number, 140 (arc fit on the card at f1140). CSS
 * clamps it to half the box height while the box is a pill (69 measured at
 * f1105), so it is the same box all the way through.
 */

export type PillExpandProps = {
  durationInFrames?: number;
  pill: string;
  title: string;
  body: string;
  actions: string[];
  /** the paragraph the pill lands on; newlines are hard line breaks */
  behind: string;
  /** a run of `behind` that stays marked, as text-marker leaves it; "" for none */
  behindMark: string;
  behindMarkColor: string;
  /** frame the pill arrives */
  at: number;
  /** frames the pop takes. 20 in the reference. */
  popFrames: number;
  /** the pill's scale on its first frame */
  popScale: number;
  /** px the pill rises while it pops */
  popRise: number;
  /** frames after `at` that the box starts to open */
  openAt: number;
  /** frames the box takes to open. 24 in the reference. */
  frames: number;
  /** frames after `at` that the pill label goes, and how long it takes */
  labelAt: number;
  labelFrames: number;
  /** frames after `at` that the title and body land, and how long they take */
  typeAt: number;
  typeFrames: number;
  /** px of defocus on `behind` once the pill is in, and frames to get there */
  backdropBlur: number;
  blurFrames: number;
  pillWidth: number;
  pillHeight: number;
  cardWidth: number;
  cardHeight: number;
  /** corner radius; the pill phase clamps it to a half-circle on its own */
  radius: number;
  color: string;
  titleColor: string;
  bodyColor: string;
  card: string;
  accent: string;
  background: string;
};

export const PillExpand: React.FC<PillExpandProps> = ({
  durationInFrames,
  pill,
  title,
  body,
  actions,
  behind,
  behindMark,
  behindMarkColor,
  at,
  popFrames,
  popScale,
  popRise,
  openAt,
  frames,
  labelAt,
  labelFrames,
  typeAt,
  typeFrames,
  backdropBlur,
  blurFrames,
  pillWidth,
  pillHeight,
  cardWidth,
  cardHeight,
  radius,
  color,
  titleColor,
  bodyColor,
  card,
  accent,
  background,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);

  const popped = enter(frame, at, popFrames);
  const open = enter(frame, at + openAt, frames, Easing.inOut(Easing.cubic));
  const label = 1 - enter(frame, at + labelAt, labelFrames);
  // Title and body land together, on an ease-out quad. Mean luma of each half
  // of the reference card, normalised between the empty card at +40 and the
  // settled one at +60, runs 0.18 / 0.46 / 0.73 / 0.93 / 0.97 at +42 to +50
  // for the title and 0.11 / 0.37 / 0.68 / 0.90 / 0.95 for the body: half a
  // frame apart, which is finer than this template can express. Two earlier
  // passes split them, in opposite directions, off an ink count under luma
  // 160 -- but a count crosses a threshold, it does not ramp, so it reported
  // 35% against 5% where the luma says 18% against 11%.
  const type = enter(frame, at + typeAt, typeFrames, Easing.out(Easing.quad));
  const soft = enter(frame, at, blurFrames);

  const lerp = (a: number, b: number) => interpolate(open, [0, 1], [a, b]);

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
      {/* The paragraph, set exactly as text-marker sets it (5.2vh, 1.5, 90%,
          -0.01em) so the cut from that shot to this one does not reflow a
          single line. */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontSize: "5.2vh",
          lineHeight: 1.5,
          letterSpacing: "-0.01em",
          textAlign: "center",
          filter: `blur(${soft * backdropBlur}px)`,
          opacity: 1 - soft * 0.45,
        }}
      >
        <div style={{ maxWidth: "90%", whiteSpace: "pre-line" }}>
          {(behindMark ? behind.split(behindMark) : [behind]).map((plain, i) => (
            <React.Fragment key={i}>
              {i > 0 ? (
                // The same box text-marker draws: 0.12em past the run each
                // side, 0.06em above and below, 0.12em corners.
                <span
                  style={{
                    background: behindMarkColor,
                    color: accent,
                    borderRadius: "0.12em",
                    padding: "0.06em 0.12em",
                    margin: "0 -0.12em",
                  }}
                >
                  {behindMark}
                </span>
              ) : null}
              {plain}
            </React.Fragment>
          ))}
        </div>
      </AbsoluteFill>

      {frame >= at ? (
        <div
          style={{
            position: "absolute",
            width: lerp(pillWidth, cardWidth),
            height: lerp(pillHeight, cardHeight),
            borderRadius: radius,
            transform: `translateY(${(1 - popped) * popRise}px) scale(${
              popScale + (1 - popScale) * popped
            })`,
            background: card,
            // f1140, bone at 241: 217 three px below the card's edge, back to
            // 241 by 30 px; 225 at three px above, back by 20. One shadow for
            // both phases; the pill's at f1105 reads the same.
            boxShadow: "0 4px 26px rgba(34,19,4,0.22)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 5vh",
            textAlign: "center",
            overflow: "hidden",
          }}
        >
          {label > 0 ? (
            <span
              style={{
                position: "absolute",
                opacity: label,
                // f1105: label ink 57 px tall (5.4vh), strokes 0.10 em, on a
                // 68 px (6.3vh) orange dot with 24 px of air to the ink. The
                // N's side bearing is part of that air: 2.2vh of gap read
                // 30 px, 1.7vh reads 24.
                fontSize: "5.4vh",
                fontWeight: 500,
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "1.7vh",
              }}
            >
              <span
                style={{
                  width: "6.3vh",
                  height: "6.3vh",
                  borderRadius: "50%",
                  background: accent,
                  color: PAPER,
                  // the "1" is 15x37 px in the 68 px dot at f1105; 4.2vh set
                  // it 14x33 in a 63 px dot, 4.5vh keeps the proportion.
                  fontSize: "4.5vh",
                  fontWeight: 600,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                1
              </span>
              {pill}
            </span>
          ) : null}

          <div style={{ display: "grid", gap: "3.2vh" }}>
            <div
              style={{
                opacity: type,
                // f1140: ink 61 px tall (5.8vh), strokes 0.117 em, #524640.
                fontSize: "5.8vh",
                fontWeight: 600,
                lineHeight: 1.2,
                color: titleColor,
              }}
            >
              {title}
            </div>
            <div
              style={{
                opacity: type,
                // f1140: two lines 42 px tall (4vh) on a 59 px pitch (1.38),
                // strokes 0.10 em, #757172; the first line is 697 px wide.
                fontSize: "4vh",
                lineHeight: 1.38,
                color: bodyColor,
              }}
            >
              {body}
            </div>
            {actions.length ? (
              <div
                style={{
                  opacity: type,
                  display: "flex",
                  gap: "1.4vh",
                  justifyContent: "center",
                  marginTop: "0.6vh",
                }}
              >
                {actions.map((a, i) => (
                  <span
                    key={a}
                    style={{
                      fontSize: "2.4vh",
                      fontWeight: 500,
                      padding: "1.2vh 2.6vh",
                      borderRadius: 999,
                      background: i === 0 ? accent : "transparent",
                      color: i === 0 ? PAPER : color,
                      border: i === 0 ? "none" : `1px solid ${color}33`,
                    }}
                  >
                    {a}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = PillExpand;

export const defaultProps: PillExpandProps = {
  pill: "New insight",
  title: "Behavioral Edge",
  body: "Finance is your lens to understand people, not just numbers.",
  actions: [],
  behind:
    "I love that finance is a mirror.\n" +
    "It reflects human behavior, fear, greed, discipline,\n" +
    "all in real time. Mastering it isn’t just about money,\n" +
    "it’s about mastering yourself.",
  // The reference keeps text-marker's highlight under the pill (f1088-f1110);
  // the card covers all four lines once it opens.
  behindMark: "it’s about mastering yourself",
  behindMarkColor: "#f0bead",
  at: 8,
  popFrames: 20,
  popScale: 0.76,
  popRise: 55,
  // Box +23 to +48, from the white card's own pixel width frame by frame:
  // 529 px until +22, then 535 / 545 / 563 / 591 / 635 / 693 / 743 / 776 /
  // 797 / 810 / 817 at +26 to +46, and 821 by +50. That is 0.02 / 0.06 /
  // 0.12 / 0.21 / 0.36 / 0.56 / 0.73 / 0.85 / 0.92 / 0.96 / 0.99 of the way,
  // which is ease-in-out cubic over 25 frames to within a percent.
  openAt: 23,
  frames: 25,
  // Black ink in the card: 4157 px at +32, 6 at +34, and grey traces of the
  // label to +38.
  labelAt: 32,
  labelFrames: 6,
  // The type is not on the heels of the label: the card is open and all but
  // empty from +38 to +40 (21 and 36 px of title ink), the title starts at
  // +41, and both halves are settled by +50.
  typeAt: 41,
  typeFrames: 11,
  // 5.8 px sigma on the 2880 clip, ~10 px true once the estimator is
  // calibrated on known blurs of f1086; 6.7 at 1920.
  backdropBlur: 6.7,
  blurFrames: 12,
  pillWidth: 528,
  pillHeight: 142,
  cardWidth: 821,
  cardHeight: 414,
  radius: 140,
  color: INK,
  // medians of the ink under luma 150 in the f1140 card
  titleColor: "#524640",
  bodyColor: "#757172",
  card: "#ffffff",
  accent: ORANGE,
  background: BONE,
};
