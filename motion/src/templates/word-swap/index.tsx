import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { COCOA, PAPER } from "../../lib/palette";
import { Orb } from "../../lib/Orb";
import { SERIF } from "../../lib/fonts";
import { enter, useDuration } from "../../lib/timing";

/*
 * Word swap: a settled line opens a gap, the word beside it changes on a single
 * frame while the gap is still opening, and a sphere grows into the space.
 *
 * Reference: f213-f250, "Your time?" -> "Your (orb) inbox?". Inner edges of
 * the two words as fractions of W (ink runs at lum>150):
 *
 *   f213-f214   settled: "Your" ends at 0.422, "time?" starts at 0.440
 *   f215-f220   "time?" accelerates right, 0.440 -> 0.446 -> 0.454 -> 0.465
 *               -> 0.481 -> 0.505: a quad ease-IN over 6 frames
 *   f220 -> f221  the word changes, on one frame, no crossfade. "inbox?" is
 *               already at 0.540, half the total travel, and from there it
 *               decelerates: 0.568 -> 0.597 -> 0.613 -> 0.625 at f222/225/228/
 *               232, at rest ~0.640 — a cubic ease-OUT over ~20 frames
 *   f216-f240   "Your" drifts LEFT the whole time, but only 0.062 of W to the
 *               right word's 0.200: 0.422 -> 0.409 (the cut) -> 0.385 ->
 *               0.375 -> 0.370 at f221/225/228/232. The line is not centred;
 *               the gap ends up centred on the sphere, which sits at 0.500.
 *   f222-f250   the sphere: bbox 0.042 -> 0.069 -> 0.082 -> 0.091 -> 0.099
 *               -> 0.110 -> 0.126 -> 0.135 -> 0.140 -> 0.144 of W at f222/
 *               223/224/225/226/228/232/236/240/250. A quarter of its rest
 *               size on its first frame, then a long ease-out.
 *
 * The hard cut is the whole effect, and it lands a third of the way into the
 * opening, not at the end of it: the outgoing word is thrown, the incoming one
 * is caught. A crossfade reads as two words dissolving into one another; this
 * reads as the line making room for a different word. The template that blurs
 * words past each other is `word-cascade`; this one is deliberately not that.
 *
 * The default strings here are this repo's, not the film's copy.
 */

/**
 * The gap's floor, as a fraction of frame height: before it opens, the two
 * words are still two words and need the space between them. 0.018 of W at
 * f215, which is 0.032 of H. A gap that starts at zero renders "Yournotes?"
 * for the whole head of the shot.
 */
const SPACE = 0.03;

/**
 * The sphere, sampled at f228: #6b3817 at the centre, #5d3618 at the top,
 * #744320 at the sides, #904d27 at the bottom. A dark matte ball lit from the
 * floor, nothing like the lib Orb's warm highlight — that one is the f1300
 * sphere, a different shot.
 */
const BALL = "radial-gradient(circle at 50% 78%, #904d27 5%, #6b3817 30%, #5d3618 66%)";

export type WordSwapProps = {
  durationInFrames?: number;
  /** the part of the line that never changes; sits left of the gap */
  prefix: string;
  before: string;
  after: string;
  /** frame the gap starts opening */
  at: number;
  /** frames the outgoing word accelerates for. The word cuts on the last */
  gapFrames: number;
  /** frames the incoming word takes to decelerate into place after the cut */
  settleFrames: number;
  /** how wide the gap ends up, as a fraction of frame height */
  gap: number;
  /** frames the sphere takes to grow, starting on the cut */
  orbFrames: number;
  /** sphere diameter as a fraction of frame height. 0 leaves the gap empty */
  orb: number;
  size: number;
  color: string;
  background: string;
};

export const WordSwap: React.FC<WordSwapProps> = ({
  durationInFrames,
  prefix,
  before,
  after,
  at,
  gapFrames,
  settleFrames,
  gap,
  orbFrames,
  orb,
  size,
  color,
  background,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);

  const cut = at + gapFrames;
  const thrown = enter(frame, at, gapFrames, Easing.in(Easing.quad));
  const caught = enter(frame, cut, settleFrames);
  // Not a fade and not an interpolation: the reference changes the word between
  // two adjacent frames, and this is that, spelled out.
  const word = frame >= cut ? after : before;
  const grown = enter(frame, cut, orbFrames);

  // Each word's inner edge, as px from the frame's centre line. The gap opens
  // to `gap` centred on the sphere; the right word does 0.77 of the opening
  // (0.200 of the 0.262 of W measured) and is halfway at the cut, the left word
  // does the rest and is 0.3 of the way at the cut (0.409 of a 0.422 -> 0.360
  // run). Two shares, two eases, and the line's off-centre start (0.328-0.546
  // of W at f213, centred at 0.437) falls out of them.
  const opening = (gap - SPACE) * 1080;
  const left = (gap / 2) * 1080 - 0.23 * opening * (1 - (0.3 * thrown + 0.7 * caught));
  const right = (gap / 2) * 1080 - 0.77 * opening * (1 - (0.5 * thrown + 0.5 * caught));

  const span: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    whiteSpace: "nowrap",
  };

  return (
    <AbsoluteFill style={{ background }}>
      <AbsoluteFill
        style={{
          fontFamily: SERIF,
          fontSize: `${size * 100}vh`,
          color,
        }}
      >
        <span style={{ ...span, right: `calc(50% + ${left}px)` }}>{prefix}</span>
        {orb > 0 && (
          <Orb
            // A quarter of its rest size on the cut's first frame (0.042 of a
            // 0.145 of W bbox at f222), the rest eased in.
            size={orb * 1080 * (0.25 + 0.75 * grown)}
            opacity={enter(frame, cut, 3)}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: BALL,
            }}
          />
        )}
        <span style={{ ...span, left: `calc(50% + ${right}px)` }}>{word}</span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = WordSwap;

export const defaultProps: WordSwapProps = {
  prefix: "Your",
  before: "notes?",
  after: "answers?",
  at: 18,
  gapFrames: 6,
  settleFrames: 20,
  // 0.360 -> 0.640 of W at rest is 0.28 of W: 0.50 of H.
  gap: 0.5,
  orbFrames: 26,
  // 0.144 of W at f250 is 0.256 of H.
  orb: 0.25,
  // "Your" is 0.095 of W wide at f213; 0.115 gave 0.104.
  size: 0.105,
  color: PAPER,
  // The floor glow, the dim one: vprof f228 at x 0.4-0.6 is flat COCOA to
  // 0.72 of H, then #251506 #2b1908 #37200d #3f2611 #4a2c15 at 0.76/0.83/
  // 0.91/0.94/1.0, and #37210d at the bottom corners (9x18 grid, f228).
  background: `radial-gradient(ellipse 105% 26% at 50% 100%, #4a2c15, #2f1c0a 60%, ${COCOA})`,
};
