import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COCOA, PAPER } from "../../lib/palette";
import { Orb } from "../../lib/Orb";
import { SERIF } from "../../lib/fonts";
import { enter, useDuration } from "../../lib/timing";

/*
 * Word swap: a settled line opens a gap, the word beside it changes on a single
 * frame, and a sphere drops into the space that just appeared.
 *
 * Reference: f213-f228, "Your time?" -> "Your (orb) inbox?". Sampled one frame
 * per tile, because the part that matters is one frame wide:
 *
 *   f213-f214    the line is settled
 *   f215-f220    a gap opens between the two words. The line stays centred, so
 *                "Your" slides left and "time?" slides right by the same amount
 *   f220 -> f221 the word changes. One frame: no crossfade, no blur, no rise
 *   f222-f228    the sphere fades up in the gap that was made for it
 *
 * The hard cut is the whole effect, and it is why this is not the softer swap
 * it looks like from a distance. A crossfade reads as two words dissolving into
 * one another; a cut on the frame the gap finishes opening reads as the line
 * making room for a different word, which is what the gap was for. The template
 * that blurs words past each other is `word-cascade`; this one is deliberately
 * not that.
 *
 * The default strings here are this repo's, not the film's copy.
 */

/**
 * The gap's floor, as a fraction of frame height: before it opens, the two
 * words are still two words and need the space between them. A gap that starts
 * at zero renders "Yournotes?" for the whole head of the shot, and a trailing
 * space inside the prefix does not survive being a flex item.
 */
const SPACE = 0.03;

export type WordSwapProps = {
  durationInFrames?: number;
  /** the part of the line that never changes; sits left of the gap */
  prefix: string;
  before: string;
  after: string;
  /** frame the gap starts opening */
  at: number;
  /** frames the gap takes to open. The word cuts on the last of them */
  gapFrames: number;
  /** how wide the gap opens, as a fraction of frame height */
  gap: number;
  /** frames the sphere takes to fade up, starting on the cut */
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
  const open = enter(frame, at, gapFrames);
  // Not a fade and not an interpolation: the reference changes the word between
  // two adjacent frames, and this is that, spelled out.
  const word = frame >= cut ? after : before;
  const landed = enter(frame, cut, orbFrames);

  return (
    <AbsoluteFill style={{ background }}>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SERIF,
          fontSize: `${size * 100}vh`,
          color,
        }}
      >
        {/* A centred flex row with a growing spacer in it is the whole
            mechanic: both words are pushed apart by the same amount and the
            line stays centred for free. Absolutely positioning the words and
            interpolating their offsets does the same thing with two more
            numbers to keep in sync. */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <span>{prefix}</span>
          <div
            style={{
              flex: "none",
              width: (SPACE + (gap - SPACE) * open) * 1080,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {orb > 0 && <Orb size={orb * 1080 * landed} opacity={landed} />}
          </div>
          <span>{word}</span>
        </div>
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
  gap: 0.22,
  orbFrames: 7,
  orb: 0.19,
  size: 0.115,
  color: PAPER,
  background: COCOA,
};
