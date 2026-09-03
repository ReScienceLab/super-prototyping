import React from "react";
import { AbsoluteFill, Easing, random, useCurrentFrame } from "remotion";
import { COCOA, PAPER } from "../../lib/palette";
import { SERIF } from "../../lib/fonts";
import { enter, leave, stagger, useDuration } from "../../lib/timing";

/*
 * Card stack: a row of tall cards standing on the floor in perspective, coming
 * up into place one after another, holding, and the sharp one lifting out,
 * with a line of type in front of them.
 *
 * Reference: f38-f81 — a fan of warm rectangles, the nearest one sharp and a
 * little left of centre, "people want" over the top. Measured on the sharp
 * card's left edge and top edge (ink runs at lum>120):
 *
 *   f45-f69   it comes up from below the frame and in from the right:
 *             x 0.345 -> 0.305 -> 0.289 -> 0.280 -> 0.278 of W and top
 *             0.540 -> 0.468 -> 0.454 -> 0.449 -> 0.451 of H at f51/57/61/
 *             65/69 — an ease-out, at rest by f65. The row's x-extent grows
 *             0.24 -> 0.47 -> 0.70 -> 0.88 -> 1.0 of W at f40/42/44/46/48:
 *             the cards come up left to right, about one per 1.5 frames.
 *   f61-f69   nothing moves. The text box is 0.378-0.622 of W at both ends.
 *   f69-f80   the sharp card lifts out, top 0.451 -> 0.262 -> 0.069 of H at
 *             f69/73/77, gone by f80; the text fades over f69-f78. f82 is
 *             the next shot.
 *
 * So the row does not drift. A previous version slid it 0.64 of W, linearly,
 * for the whole shot, on the theory that a fan which stops is a slideshow.
 * It stops.
 *
 * Real 3D, not faked: one `perspective` on the parent and a `translateZ` per
 * card, so the sizes, the spacing and the parallax of the settle are all
 * consequences of one number instead of three curves hand-matched to each
 * other. The sharp card is the nearest and the rest fall away on BOTH sides
 * of it: at f57 it is 0.30 of W wide, its neighbours 0.15, the next pair
 * 0.11-0.15, then 0.10 — scales of 1, 0.5, 0.4, 0.35, which is what
 * z = -depth * sqrt(distance from focus) gives when depth equals the
 * perspective.
 */

export type CardStackProps = {
  durationInFrames?: number;
  text: string;
  count: number;
  /** perspective distance in px; smaller is a wider lens */
  perspective: number;
  /** px of z between the sharp card and its neighbours; the rest go as sqrt */
  depth: number;
  /** horizontal gap between cards as a fraction of card width */
  gapRatio: number;
  /** degrees each card is turned away from the camera */
  turn: number;
  /** where the sharp card's top edge rests, as a fraction of frame height */
  top: number;
  /** px the row settles in from the right while the cards come up */
  slide: number;
  /** frames the settle takes; it outlasts the rise */
  slideFrames: number;
  /** frames a card takes to come up */
  riseFrames: number;
  /** frames between one card starting up and the next */
  step: number;
  /** frames the sharp card takes to lift out at the end */
  leaveFrames: number;
  /** which card is in focus */
  focus: number;
  /** px of defocus per card away from `focus` */
  blur: number;
  cardWidth: number;
  cardHeight: number;
  seed: string;
  size: number;
  color: string;
  background: string;
};

/**
 * Card faces, `swatch 57 --crop` on each: #885017 the card left of the sharp
 * one, #a16836 the one right of it, #a07545 and #986e41 the two beyond,
 * #8c5025 the row at f80. The sharp card is the one standing in the light —
 * #a4876a at its top to #bea894 at its foot (vprof f57), and every card is
 * darker at the top than the foot because the light is the floor glow.
 */
const TONES = ["#885017", "#a16836", "#a07545", "#986e41", "#8c5025"];
const LIT = "#b1927f";
const SHADE = "linear-gradient(rgba(0,0,0,0.12), rgba(255,255,255,0.14))";

export const CardStack: React.FC<CardStackProps> = ({
  durationInFrames,
  text,
  count,
  perspective,
  depth,
  gapRatio,
  turn,
  top,
  slide,
  slideFrames,
  riseFrames,
  step,
  leaveFrames,
  focus,
  blur,
  cardWidth,
  cardHeight,
  seed,
  size,
  color,
  background,
}) => {
  const frame = useCurrentFrame();
  const duration = useDuration(durationInFrames);
  // The sharp card is clear of the frame six frames before the shot ends, so
  // a cut lands on a settled row.
  const exitAt = duration - leaveFrames - 6;
  // The row's slide starts on the sharp card's clock but runs longer than its
  // rise: the card's top is at rest by f65 while its left edge is still going
  // at f69. Fitting a cubic ease-out to 0.345/0.305/0.289/0.280 of W at
  // f51/57/61/65 gives 31 frames and 0.172 of W (330 px) of travel.
  const settled = enter(frame, focus * step, slideFrames);
  const lifted = enter(frame, exitAt, leaveFrames, Easing.in(Easing.quad));
  // The text: 8 frames out of focus (f38-f46), and it lands large — its box is
  // 0.275 of W at f46 and 0.237 at f69, an ease-out from 1.16x. No rise: its
  // centre is at 0.50 of H throughout.
  const shown = enter(frame, 0, 8);
  const gone = leave(frame, exitAt, 10);
  const grow = 1 + 0.16 * (1 - enter(frame, 0, 25));

  return (
    <AbsoluteFill style={{ background, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          perspective,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            transformStyle: "preserve-3d",
            display: "flex",
            transform: `translateX(${slide * (1 - settled)}px)`,
          }}
        >
          {[...Array(count)].map((_, i) => {
            const away = Math.abs(i - focus);
            const up = stagger(frame, i, { at: 0, step, frames: riseFrames });
            // At rest the top edge sits at `top` and the foot is below the
            // frame, plus a seeded ±81 px on every card but the sharp one so
            // the tops are uneven the way the reference's are (0.444-0.556
            // of H across the row at f61; the sharp card's is `top` itself).
            const rest =
              top * 1080 -
              540 +
              cardHeight / 2 +
              (i === focus ? 0 : (random(`${seed}-y-${i}`) - 0.5) * 163);
            // The lift has to clear the far corner too, which the turn
            // projects at 0.89 of the near one; 1.1 covers it.
            const y =
              rest +
              (1 - up) * (1 - top) * 1080 -
              (i === focus ? lifted * 1.1 * (top * 1080 + cardHeight) : 0);
            return (
              <div
                key={i}
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  marginRight: cardWidth * gapRatio,
                  flex: "none",
                  borderRadius: 18,
                  // Seeded, so the row is uneven the way a real shelf is, but
                  // the same unevenness on every worker.
                  background:
                    `${SHADE}, ` +
                    (i === focus
                      ? LIT
                      : TONES[
                          Math.floor(random(`${seed}-${i}`) * TONES.length)
                        ]),
                  transform:
                    `translateZ(${-depth * Math.sqrt(away)}px) ` +
                    `translateY(${y}px) ` +
                    `rotateY(${turn}deg)`,
                  filter: `blur(${away * blur}px)`,
                  opacity: 0.94,
                }}
              />
            );
          })}
        </div>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SERIF,
          fontSize: `${size * 100}vh`,
          color,
          opacity: shown * gone,
          filter: `blur(${(1 - shown) * 18}px)`,
          transform: `scale(${grow})`,
        }}
      >
        {text}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = CardStack;

export const defaultProps: CardStackProps = {
  text: "people want",
  count: 7,
  perspective: 1100,
  depth: 1100,
  gapRatio: 0.21,
  turn: -26,
  top: 0.45,
  slide: 330,
  slideFrames: 31,
  // The rise, read off the median of the card row's own top edge. That median
  // travels from below the frame to its rest at 0.459 of H, so normalising it
  // gives a fraction travelled that compares directly across the two clips'
  // different sizes. The reference is 0.68 / 0.85 / 0.94 / 0.98 / 1.00 of the
  // way at +6, +10, +14, +17 and +19 of its shot; 24 and 1.5 rendered 0.59 /
  // 0.74 / 0.88 / 0.91 / 0.96, behind through the whole middle and five frames
  // late to settle. 20 and 1.0 render 0.67 / 0.85 / 0.93 / 0.99 / 1.00 -- one
  // hundredth at every sample.
  riseFrames: 20,
  step: 1.0,
  leaveFrames: 12,
  focus: 3,
  // Defocus, fitted on a 38-row band at 0.72-0.79 of H where the row is all
  // card in both clips. Counting the pixels along it that step more than 4
  // luma finds edges: the reference has 11, which is the sharp card's two and
  // little else, because everything off focus is far enough out to have no
  // edge at all. 7 rendered 35 of them -- every card in the row hard-edged --
  // and 20, 26, 30, 34 render 35, 22, 15, 10.
  blur: 34,
  cardWidth: 640,
  cardHeight: 1550,
  seed: "shelf",
  // "people want" is 0.244 of W wide and 0.093 of H tall at f61; 0.075 gave
  // 0.172 by 0.072.
  size: 0.1,
  color: PAPER,
  // The floor glow under every shot on the dark ground. vprof f40 at x
  // 0.80-0.95: flat COCOA down to 0.63 of H, then #2a1706 #341d09 #45260e
  // #5a3113 #6e3d19 #79431c at 0.67/0.74/0.81/0.89/0.96/1.0 — one ramp,
  // brightest at the bottom centre and only a little dimmer at the corners
  // (#623616 against #75401c across the bottom row of a 9x18 grid at f33).
  background: `radial-gradient(ellipse 200% 33% at 50% 100%, #75401c, ${COCOA})`,
};
