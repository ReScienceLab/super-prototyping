import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";

import { SANS } from "../../lib/fonts";
import { enter, leave } from "../../lib/timing";

import meta from "./meta.json";
import { ACCENT, DONE, GROUND, INK, INSET, MONO, MUTE, SUBTLE } from "./data";
import { End, Face, Generate, Measure, Sample, TwoRows, Verify } from "./shots";

/*
 * Promo reel: what this repo does, in ten seconds, on one worked example.
 *
 * The example is `mockups/canvases/duolingo-ios` — eight screens cloned off a
 * capture — and the reel walks its phases in the order the clone actually ran
 * them: grid the capture, sample it region by region, try to name the face,
 * generate the boards from one token block, re-render and diff, park the
 * reference under the replica. Every number the reel puts on screen is in
 * `data.ts`, copied from that folder's evidence boards and README.
 *
 * TWO THINGS HERE ARE DELIBERATE AND EASY TO UNDO BY ACCIDENT.
 *
 * The phone is not a screenshot. Every board on screen is the artboard's own
 * HTML in an <IFrame>, served out of `mockups/` because that is this project's
 * public dir. So the reel cannot claim a fidelity the boards have since lost:
 * edit a token, and the next render of this film shows the edit. It costs a
 * few seconds of load per shot and it is worth them.
 *
 * The shots do not overlap. `brand-film` cross-dissolves because its source
 * does; here each shot fades its own last frames out and the next arrives on
 * the same white ground, which is a dip and not a mix. Overlapping two shots
 * that both carry small type would put two sets of numbers on one frame at a
 * point where the reel is asking to be read.
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

/** The phase stamp each shot flies, top right. Kept out of the shots so the
 *  chrome moves as one thing and the shots stay about their own content. */
const STAMPS = [
  "collect · grid · 1a",
  "sample · 1b",
  "the face · 1c",
  "generate · 2 · 3",
  "verify · 4",
  "park it · 5",
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
      <Sequence key={i} from={starts[i]} durationInFrames={frames}>
        <Shot frames={frames} />
      </Sequence>
    ))}
    <Chrome />
  </AbsoluteFill>
);

export { meta };
export const Component = PromoReel;
