import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { BONE, INK, ORANGE, PAPER } from "../../lib/palette";
import { SANS } from "../../lib/fonts";
import { enter, useDuration } from "../../lib/timing";

/*
 * Pill expand: a small notification pill grows into a full card, and whatever
 * was behind it goes soft.
 *
 * Reference: two places, f1090-1120 ("1 New insight" -> a "Behavioral Edge"
 * card over the blurred paragraph) and f1830-1870 ("1 new notification" -> a
 * card with two buttons). Same mechanic, so one template: the pill's label
 * leaves, the box grows, the card's contents land.
 *
 * The three phases overlap on purpose and the overlap is the whole feel of it.
 * Measured off the reference: the label is gone by the time the box is a third
 * of the way open (16 frames), the box takes 20, and the body starts at 14 —
 * before the box has finished — so the card is already filling as it settles
 * rather than popping its contents in at the end.
 *
 * `borderRadius` interpolates from `999` down to the card's radius, which is
 * what turns a growing rounded rectangle into a pill *becoming* a card.
 */

export type PillExpandProps = {
  durationInFrames?: number;
  /** the pill's own label, before it expands */
  pill: string;
  title: string;
  body: string;
  /** button labels; [] for a card with no buttons */
  actions: string[];
  /** dimmed text behind the card, to have something to defocus */
  behind: string;
  /** frame the expansion starts */
  at: number;
  /** frames the box takes to open. 20 in the reference. */
  frames: number;
  /** frames the pill label takes to leave */
  labelFrames: number;
  /** frames after `at` that the card body starts arriving */
  bodyAt: number;
  bodyFrames: number;
  /** px of defocus applied to `behind` once the card is open */
  backdropBlur: number;
  pillWidth: number;
  pillHeight: number;
  cardWidth: number;
  cardHeight: number;
  cardRadius: number;
  color: string;
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
  at,
  frames,
  labelFrames,
  bodyAt,
  bodyFrames,
  backdropBlur,
  pillWidth,
  pillHeight,
  cardWidth,
  cardHeight,
  cardRadius,
  color,
  card,
  accent,
  background,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);

  const open = enter(frame, at, frames);
  const label = 1 - enter(frame, at, labelFrames);
  const content = enter(frame, at + bodyAt, bodyFrames);

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
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontSize: "3.4vh",
          lineHeight: 1.6,
          textAlign: "center",
          maxWidth: "60%",
          margin: "0 auto",
          whiteSpace: "pre-line",
          // The backdrop's blur tracks the box, so the paragraph is softest
          // exactly when the card is fully open and there is most to read.
          filter: `blur(${open * backdropBlur}px)`,
          opacity: 1 - open * 0.45,
        }}
      >
        {behind}
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          width: lerp(pillWidth, cardWidth),
          height: lerp(pillHeight, cardHeight),
          borderRadius: lerp(999, cardRadius),
          background: card,
          boxShadow: `0 ${lerp(6, 40)}px ${lerp(18, 90)}px rgba(34,19,4,${lerp(0.08, 0.18)})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.4vh",
          padding: "0 3vh",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        {label > 0 ? (
          <span
            style={{
              position: "absolute",
              opacity: label,
              fontSize: "2.1vh",
              fontWeight: 500,
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "0.7em",
            }}
          >
            <span
              style={{
                width: "2.1vh",
                height: "2.1vh",
                borderRadius: "50%",
                background: accent,
                color: PAPER,
                fontSize: "1.3vh",
                display: "grid",
                placeItems: "center",
              }}
            >
              1
            </span>
            {pill}
          </span>
        ) : null}

        <div style={{ opacity: content, display: "grid", gap: "1.4vh" }}>
          <div style={{ fontSize: "3.2vh", fontWeight: 500 }}>{title}</div>
          <div style={{ fontSize: "2vh", lineHeight: 1.5, opacity: 0.72 }}>
            {body}
          </div>
          {actions.length ? (
            <div
              style={{
                display: "flex",
                gap: "1vh",
                justifyContent: "center",
                marginTop: "0.6vh",
              }}
            >
              {actions.map((action, i) => (
                <span
                  key={action}
                  style={{
                    fontSize: "1.8vh",
                    fontWeight: 500,
                    padding: "1vh 1.8vh",
                    borderRadius: 999,
                    background: i === 0 ? accent : "rgba(34,19,4,0.07)",
                    color: i === 0 ? PAPER : color,
                  }}
                >
                  {action}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
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
    "all in real time. Mastering it isn't just about money,\n" +
    "it's about mastering yourself.",
  at: 10,
  frames: 20,
  labelFrames: 16,
  bodyAt: 14,
  bodyFrames: 14,
  backdropBlur: 7,
  pillWidth: 260,
  pillHeight: 62,
  cardWidth: 560,
  cardHeight: 260,
  cardRadius: 34,
  color: INK,
  card: "#ffffff",
  accent: ORANGE,
  background: BONE,
};
