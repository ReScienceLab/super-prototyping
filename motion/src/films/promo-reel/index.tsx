import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";

import { SANS } from "../../lib/fonts";
import { enter, leave } from "../../lib/timing";

import meta from "./meta.json";
import { ACCENT, DONE, GROUND, INK, INSET, MONO, MUTE, SUBTLE } from "./data";
import {
  End,
  Face,
  Generate,
  Measure,
  OVERLAP,
  Sample,
  TwoRows,
  Verify,
} from "./shots";

/*
 * Promo reel: what this repo does, in ten seconds, on one worked example.
 *
 * The example is `mockups/canvases/duolingo-ios` — eight screens cloned off a
 * capture — and the reel walks its phases in the order the clone actually ran
 * them: grid the capture, sample it region by region, try to name the face,
 * generate the boards from one token block, re-render and diff, park the
 * reference under the replica.
 *
 * It is pitched at someone who has never seen this repo. Six numbered steps,
 * one plain sentence each, and only the handful of measurements that carry a
 * step — the techniques that took them, the token names they land in and the
 * per-screen deltas are all still in `data.ts`, which is where a reader who
 * wants them goes next. Nothing on screen is rounded or invented for the edit;
 * there is simply less of it.
 *
 * THREE THINGS HERE ARE DELIBERATE AND EASY TO UNDO BY ACCIDENT.
 *
 * The phone is not a screenshot. Every board on screen is the artboard's own
 * HTML in an <IFrame>, served out of `mockups/` because that is this project's
 * public dir. So the reel cannot claim a fidelity the boards have since lost:
 * edit a token, and the next render of this film shows the edit. It costs a
 * few seconds of load per shot and it is worth them.
 *
 * The shots overlap by exactly `OVERLAP`, and no more. This started as a dip —
 * each shot fading to nothing inside its own slot, the next arriving on empty
 * ground — on the argument that overlapping two shots of small type would put
 * two sets of numbers on one frame where the reel is asking to be read. The
 * argument was right about the type and wrong about the join: what it actually
 * produced was eight frames of blank white page between every pair of shots,
 * which is more abrupt than a dissolve and not less.
 *
 * So the slots in the cut below are unchanged and each shot's <Sequence> now
 * runs `OVERLAP` frames past its own, spending them getting out of the way.
 * The type problem is handled where it lives — in `useJoin`, which clears the
 * outgoing shot in the first third of its fade, so nothing dense is ever more
 * than a few percent visible under the shot that replaced it.
 *
 * Four of the six joins are not dissolves at all. Screen 01 is in shot 1 and
 * again in shot 2; shot 3's headline is one line off that screen's green card;
 * shot 4's list opens on the stand-in shot 3 settled for; and shot 4's eight
 * boards are shot 5's eight rows. Each of those is carried rather than cut —
 * see the block above `useJoin` in `shots.tsx`, which is also the reason five
 * of the seven shots return two <AbsoluteFill>s instead of one. Reordering the
 * cut below breaks all four, and nothing here will say so: the shots will
 * simply go back to being slides.
 */

/** slug, frames. Sums to `meta.durationInFrames`; the check below says so. */
const CUT = [
  [Measure, 46],
  [Sample, 52],
  [Face, 46],
  [Generate, 46],
  [Verify, 42],
  [TwoRows, 32],
  [End, 36],
] as const;

const starts = CUT.map((_, i) =>
  CUT.slice(0, i).reduce((n, [, frames]) => n + frames, 0),
);
const LENGTH = starts[starts.length - 1] + CUT[CUT.length - 1][1];
if (LENGTH !== meta.durationInFrames) {
  throw new Error(
    `promo-reel: the cut is ${LENGTH} frames, meta.json says ${meta.durationInFrames}.`,
  );
}

/**
 * The stamp each shot flies, top right. Kept out of the shots so the chrome
 * moves as one thing and the shots stay about their own content.
 *
 * These used to be the skill's own phase numbers — `collect · grid · 1a`,
 * `the face · 1c`. They are the right names in `clone-prototype` and the wrong
 * ones here: a viewer meeting this repo for the first time cannot tell whether
 * `1c` is the third of three or the third of thirty. A count they can. The
 * phase each step belongs to is named in the README's cut table.
 */
const STAMPS = [
  "step 1 of 6",
  "step 2 of 6",
  "step 3 of 6",
  "step 4 of 6",
  "step 5 of 6",
  "step 6 of 6",
  "",
] as const;

/**
 * Wordmark, phase stamp and a hairline that fills as the film runs. It sits
 * over every shot and clears off for the end card, which is the only frame
 * that wants to be the only thing on screen.
 */
const Chrome: React.FC = () => {
  const frame = useCurrentFrame();
  const shot = starts.filter((s) => frame >= s).length - 1;
  const off = leave(frame, starts[STAMPS.length - 1] - 6, 10);
  const up = enter(frame, 4, 16);
  // The stamp is the one thing on screen that changes its text without moving,
  // so it changes on its own beat rather than flicking over on the cut frame:
  // out across the eight frames before the join, back in across the eight
  // after. Under a dissolve a hard swap here is the last edge that still reads
  // as a cut.
  const start = starts[Math.max(0, shot)];
  const next = starts[shot + 1] ?? meta.durationInFrames;
  const swap = Math.min(enter(frame, start, 8), leave(frame, next - 8, 8));
  return (
    <AbsoluteFill style={{ opacity: off * up, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 46,
          fontFamily: SANS,
          fontSize: 19,
          fontWeight: 500,
          letterSpacing: "0.02em",
          color: INK,
        }}
      >
        super-prototyping
      </div>
      <div
        style={{
          position: "absolute",
          right: 96,
          top: 48,
          fontFamily: MONO,
          fontSize: 16,
          letterSpacing: "0.18em",
          color: MUTE,
          textTransform: "uppercase",
          opacity: swap,
        }}
      >
        {STAMPS[Math.max(0, shot)]}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 2,
          background: INSET,
        }}
      >
        <div
          style={{
            width: `${(frame / meta.durationInFrames) * 100}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${DONE}, ${ACCENT})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const PromoReel: React.FC = () => (
  <AbsoluteFill style={{ background: GROUND }}>
    {/* GitHub's own ground: white, with the faintest wash under the header
        the way a repo page sits under its nav. Nothing else — a light theme
        that reaches for a gradient stops looking like a light theme. */}
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${SUBTLE}, ${GROUND} 32%)`,
      }}
    />
    {CUT.map(([Shot, frames], i) => (
      <Sequence
        key={i}
        from={starts[i]}
        // Past its slot, not past the film: the last shot has nothing to hand
        // over to and ends where the composition does.
        durationInFrames={frames + (i < CUT.length - 1 ? OVERLAP : 0)}
      >
        <Shot frames={frames} />
      </Sequence>
    ))}
    <Chrome />
  </AbsoluteFill>
);

export { meta };
export const Component = PromoReel;
