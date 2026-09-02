import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { COCOA, GRADIENT, PAPER } from "../../lib/palette";
import { SERIF } from "../../lib/fonts";
import { enter, useDuration } from "../../lib/timing";

/*
 * Card stack: a row of tall cards standing edge-on in perspective, drifting
 * past the camera, with a line of type sitting in front of them.
 *
 * Reference: f420-500 — a fan of warm rectangles receding to the right, most of
 * them out of focus, one near the middle sharp, "people want" over the top. It
 * reads as a shelf of screens being walked past.
 *
 * Real 3D, not faked: one `perspective` on the parent and a `translateZ` per
 * card, so the sizes, the spacing and the parallax as the row slides are all
 * consequences of one number instead of three curves hand-matched to each
 * other. The cards are laid out in a single row and the row is what moves.
 */

export type CardStackProps = {
  durationInFrames?: number;
  text: string;
  count: number;
  /** perspective distance in px; smaller is a wider lens */
  perspective: number;
  /** how far each card sits back from the one before, in px */
  depth: number;
  /** horizontal gap between cards as a fraction of card width */
  gapRatio: number;
  /** degrees each card is turned away from the camera */
  turn: number;
  /** px the row slides across the shot */
  slide: number;
  /** frames the slide takes */
  slideFrames: number;
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

export const CardStack: React.FC<CardStackProps> = ({
  durationInFrames,
  text,
  count,
  perspective,
  depth,
  gapRatio,
  turn,
  slide,
  slideFrames,
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
  // The row keeps moving for the whole shot — a card fan that eases to a stop
  // stops being a camera move and starts being a slideshow — so this one runs
  // on the shot length rather than on a fixed number of frames.
  const drift = enter(frame, 0, slideFrames || duration, (t) => t);

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
            transform: `translateX(${-slide * drift}px)`,
          }}
        >
          {[...Array(count)].map((_, i) => (
            <div
              key={i}
              style={{
                width: cardWidth,
                height: cardHeight,
                marginRight: cardWidth * gapRatio,
                flex: "none",
                borderRadius: 18,
                // Each card is its own slice of the warm ramp, seeded so the
                // row is uneven the way a real shelf is, but the same unevenness
                // on every worker.
                background:
                  `linear-gradient(160deg, ${GRADIENT[5]}, ` +
                  `${GRADIENT[Math.floor(random(`${seed}-${i}`) * 4) + 2]})`,
                transform:
                  `translateZ(${-i * depth}px) ` +
                  `translateY(${(random(`${seed}-y-${i}`) - 0.5) * 120}px) ` +
                  `rotateY(${turn}deg)`,
                filter: `blur(${Math.abs(i - focus) * blur}px)`,
                opacity: 0.94,
              }}
            />
          ))}
        </div>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SERIF,
          fontSize: `${size * 100}vh`,
          color,
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
  count: 8,
  perspective: 1100,
  depth: 200,
  gapRatio: 0.08,
  turn: -26,
  slide: 900,
  slideFrames: 0,
  focus: 3,
  blur: 7,
  cardWidth: 460,
  cardHeight: 880,
  seed: "shelf",
  size: 0.055,
  color: PAPER,
  background: COCOA,
};
