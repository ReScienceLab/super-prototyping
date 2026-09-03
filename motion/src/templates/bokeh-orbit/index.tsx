import React from "react";
import { AbsoluteFill, Easing, random, useCurrentFrame } from "remotion";
import { COCOA, PAPER } from "../../lib/palette";
import { Orb } from "../../lib/Orb";
import { SERIF } from "../../lib/fonts";
import { enter, useDuration } from "../../lib/timing";

/*
 * Bokeh orbit: a ring of out-of-focus beads turning around a word, the whole
 * thing pushed in on from small, and lifted out at the end.
 *
 * Reference: f268-f306, "Chaos" on the dark ground with a broken ring of pale
 * defocused beads around it. Measured (bbox of everything brighter than lum
 * 110, and of the word alone):
 *
 *   f267        nothing. f268: the ring is there, 0.30 of W across, the word
 *               a soft blob inside it.
 *   f268-f290   the ring grows 0.30 -> 0.40 -> 0.49 -> 0.56 -> 0.63 -> 0.70
 *               -> 0.75 -> 0.81 -> 0.83 -> 0.85 -> 0.87 of W at f268/270/272/
 *               274/276/278/280/282/284/286/290, and the word 0.258 -> 0.285
 *               -> 0.307 -> 0.325 -> 0.378 at f274/276/278/280/295. Both fit
 *               a quad ease-out over 22 frames from 0.35-0.40 of their rest
 *               size: one push-in, not a ring fading up around a word. The
 *               word is sharp from about f276.
 *   f284        at rest the beads sit on an ellipse centred on the frame,
 *               0.385 of W (0.685 of H) across and 0.57 of H high — the left
 *               arc is at x 0.11 for y 0.32-0.52 and pulls in to 0.17 at
 *               y 0.15 and 0.21 at y 0.85. Top and bottom are off the frame;
 *               left and right are not.
 *   f299-f305   the word lifts and fades: y 0.399 -> 0.388 -> 0.378 -> 0.365
 *               -> 0.350 of H at f295/300/301/302/303, gone by f305, and the
 *               whole scene goes with it (flow: -5, -10, -16, -21, -32, -43,
 *               -53, -75, -112 px/frame at f298-f306, 0.23 of H by f306).
 *
 * The ring is not flat: the beads at the bottom of the frame are bigger than
 * the ones at the top (lum>70 blobs at f280: 282 px median in the bottom third,
 * 165 in the top), so the near half of the ring is the BOTTOM and passes in
 * front of the word.
 *
 * That front/behind split is done by rendering the ring twice with the word
 * between the two passes, rather than by sorting one list by depth — a single
 * sorted list is one stacking context and cannot straddle the text no matter
 * how it sorts.
 */

/**
 * A bead, from a census of every pixel brighter than lum 120 outside the word
 * at f284: #e4ccb4 and #ccb49c in the cores, #b49c84 and #9c846c around them,
 * #9c6c54 where the halo meets the ground. Cream and tan; not the lib Orb's
 * orange, which is the f1300 sphere.
 */
const BEAD =
  "radial-gradient(circle, #e4ccb4, #c8b898 50%, #b49c84 80%, #9c6c54)";

export type BokehOrbitProps = {
  durationInFrames?: number;
  word: string;
  /** beads in the ring */
  count: number;
  /** ring radius as a fraction of frame height */
  radius: number;
  /** how far the ring is tilted away: 0 is edge-on, 1 is face-on */
  tilt: number;
  /** frames for one full turn */
  period: number;
  /** bead diameter as a fraction of frame height, before depth scaling */
  bead: number;
  /** px of defocus on the far side; the near side gets a third of it */
  blur: number;
  /** anything; changes the size jitter per bead */
  seed: string;
  /** scale the whole scene starts at */
  zoomFrom: number;
  /** frames the push-in takes */
  zoomFrames: number;
  /** frames the scene takes to lift out at the end */
  leaveFrames: number;
  size: number;
  color: string;
  background: string;
};

export const BokehOrbit: React.FC<BokehOrbitProps> = ({
  durationInFrames,
  word,
  count,
  radius,
  tilt,
  period,
  bead,
  blur,
  seed,
  zoomFrom,
  zoomFrames,
  leaveFrames,
  size,
  color,
  background,
}) => {
  const frame = useCurrentFrame();
  const duration = useDuration(durationInFrames);
  // No fade-up: f267 is empty ground and f268 has the ring at full strength.
  const zoom =
    zoomFrom +
    (1 - zoomFrom) * enter(frame, 0, zoomFrames, Easing.out(Easing.quad));
  const sharp = enter(frame, 0, 8);
  // Clear of the frame six frames before the end, so a cut lands on the ground.
  const gone = enter(
    frame,
    duration - leaveFrames - 6,
    leaveFrames,
    Easing.in(Easing.quad),
  );

  const beads = [...Array(count)].map((_, i) => {
    // A seeded angular jitter of up to a bead's own spacing: evenly spaced
    // beads read as a bead necklace, and the reference ring is visibly broken
    // and clumped.
    const angle =
      (2 * Math.PI * i) / count +
      (2 * Math.PI * frame) / period +
      ((random(`${seed}-a-${i}`) - 0.5) * 2 * Math.PI) / count;
    // And a radial one: the arcs are 0.06 of W thick at f284 against beads
    // of 0.025-0.035, so the ring is a band about two beads wide.
    const r = radius * (1 + 0.16 * (random(`${seed}-r-${i}`) - 0.5));
    // depth: +1 nearest the camera, -1 furthest. Size, blur, opacity and which
    // pass a bead lands in all hang off this one number.
    const depth = Math.cos(angle);
    const scale = 0.62 + 0.19 * (depth + 1);
    return {
      i,
      near: depth > 0,
      // The 1080/1920 keeps a radius given in frame heights circular once it is
      // written out as a percentage of a 16:9 box's width.
      left: `${50 + Math.sin(angle) * r * (1080 / 1920) * 100}%`,
      // Plus, not minus: the near side is the bottom of the frame.
      top: `${50 + depth * r * tilt * 100}%`,
      // A seeded jitter per bead so the ring is not a bicycle wheel. Seeded,
      // not random: the same bead must be the same size on every worker.
      diameter: bead * 1080 * scale * (0.45 + 1.1 * random(`${seed}-${i}`)),
      blur: blur * (depth > 0 ? 0.34 : 1) * scale,
      // The median of everything brighter than lum 120 at f284 is #ccb49c;
      // 0.35-0.85 rendered #b19e83.
      opacity: 0.5 + 0.25 * (depth + 1),
    };
  });

  const ring = (half: boolean) => (
    <AbsoluteFill>
      {beads
        .filter((b) => b.near === half)
        .map((b) => (
          <Orb
            key={b.i}
            size={b.diameter}
            blur={b.blur}
            opacity={b.opacity}
            style={{
              position: "absolute",
              left: b.left,
              top: b.top,
              transform: "translate(-50%, -50%)",
              background: BEAD,
            }}
          />
        ))}
    </AbsoluteFill>
  );

  return (
    <AbsoluteFill style={{ background }}>
      <AbsoluteFill
        style={{
          opacity: 1 - gone,
          transform: `translateY(${-0.23 * 1080 * gone}px) scale(${zoom})`,
        }}
      >
        {ring(false)}
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            fontFamily: SERIF,
            fontSize: `${size * 100}vh`,
            color,
            filter: `blur(${(1 - sharp) * blur}px)`,
          }}
        >
          {word}
        </AbsoluteFill>
        {ring(true)}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = BokehOrbit;

export const defaultProps: BokehOrbitProps = {
  word: "Chaos",
  // About 20 beads on each visible arc at f284, and the arcs are the frame's
  // middle 60% of the ring.
  count: 64,
  radius: 0.69,
  tilt: 0.83,
  period: 260,
  bead: 0.13,
  blur: 34,
  seed: "chaos",
  zoomFrom: 0.38,
  zoomFrames: 22,
  leaveFrames: 9,
  size: 0.3,
  color: PAPER,
  // The floor glow, the dim one: vprof f295 at x 0.4-0.6 is flat COCOA to
  // 0.72 of H, then #251506 #2b1908 #37200d #3f2611 #4a2c16 at 0.76/0.83/
  // 0.91/0.94/1.0 — the same ramp as f228.
  background: `radial-gradient(ellipse 105% 26% at 50% 100%, #4a2c15, #2f1c0a 60%, ${COCOA})`,
};
