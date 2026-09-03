import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { PAPER } from "../../lib/palette";
import { SERIF } from "../../lib/fonts";
import { enter, stagger, useDuration } from "../../lib/timing";

/*
 * Orb bloom: a huge back-lit sphere slides in from the left over a flat
 * peach ground while a row of serif chips lands on it one at a time; the
 * chips then leave straight up.
 *
 * Reference f1283-f1340, "piece by piece". Measured, the sphere does not
 * bloom from a point: at the cut its dark body already reaches 0.22 of the
 * frame width and its right edge is at 0.33, 0.50, 0.63, 0.72, 0.80, 0.86,
 * 0.90 and 0.93 w at f1285, f1286, f1289, f1292, f1295, f1298, f1303 and
 * f1310, where it stays — an ease-out cubic over 27 frames. At rest (f1310)
 * it is centred at (0.46 w, 0.54 h) with a radius of 0.95 h, so only its
 * top, right and bottom are in frame.
 *
 * Its shading, sampled at f1310 as a fraction of the height from the centre:
 * the body is lit from the lower left — #d25829 at 0.40 h toward 180°,
 * #cb4815 at 0.35-0.45 toward 225°, #bd3d24 at the centre, #b22815 low
 * right, #830816 at the top of the x=0.6 w column and #740210 at 0.60 h
 * toward 45°. A peach rim (#f1b988 at 0.80 h toward 180°, #efac79 at 0.75 h
 * toward 135°, #e5b485 at 0.95 h toward 0°) is wide on the left and upper
 * left and a sliver on the right. A grid fit of a ring gradient to twelve
 * peach-fraction samples of f1310 puts its centre 0.08 R right of the
 * sphere's, level with it, ramping over 0.67-0.87 R; an ellipse fits no
 * better. The ground outside it is flat:
 * #f0aa7b at right-mid f1300, #f1ab7e/#f1b37f/#ee9a6f at the corners.
 *
 * The chips: bullets 79 px across at 1920 — a pink core, palest at its
 * edge, never white (1312 px above luma 225 in a 120 px crop of f1310 and
 * none with a channel minimum above 212), glowing warm into the sphere by
 * 56 px; see BULLET for the profile. Then 29 px of air, then the word. They land at f1283, f1286, f1292 over
 * about five frames each, and from f1316 they leave straight up, no fade,
 * "by" fastest — travel 1 : 1.39 : 0.72 of the first's, ease-in cubic
 * (0.042, 0.138, 0.26, 0.353 h at +10, +16, +20, +22 for the first).
 *
 * After f1326 the reference crossfades the ground to red and drops the
 * sphere out of the bottom of the frame (f1336-f1340) into the next shot;
 * this template holds the sphere instead, so the cut can land anywhere.
 */

export type OrbBloomProps = {
  durationInFrames?: number;
  chips: string[];
  /** sphere centre at rest, as a fraction of the frame */
  x: number;
  y: number;
  /** sphere radius as a fraction of the frame height */
  radius: number;
  /** where the sphere's right edge is on frame `at`, as a fraction of the width */
  from: number;
  /** frame the sphere starts sliding in */
  at: number;
  /** frames the slide takes. 27 in the reference. */
  slideFrames: number;
  chipAt: number;
  chipStep: number;
  chipFrames: number;
  /** frame the chips start leaving, and how long the first takes */
  exitAt: number;
  exitFrames: number;
  /** how far the first chip travels leaving, as a fraction of the height */
  exit: number;
  /** chip type size as a fraction of the frame height */
  size: number;
  color: string;
  background: string;
};

// f1310, see above. Body stops are fractions of the sphere's radius, on an
// ellipse 1 R by 1.5 R centred at 20% 75% of the box; rim stops are on a
// circle of R centred at 54% 50%. The fit said 67-87%; 70-88% puts the dark
// body's right edge at 0.91 w (0.93 measured, 0.98 with the old 80-92%).
const BODY =
  "radial-gradient(ellipse RADpx RAD15px at 20% 75%, #d25829 35%, #bd3d24 68%, #b22815 86%, #830816 112%, #740210 125%)";
const RIM = "radial-gradient(circle RADpx at 54% 50%, #f1b98800 70%, #f1b988 88%)";

// f1310, chip 0's bullet: mean colour by radius from its centre, at 1920 —
// #f57873 at 0, #f58780 at 13 px, #f69990 at 20, #f7a79d at 24, #f8b2a6 at
// 28 (the palest ring), #ee9d88 at 32, #e79177 at 36, #e68d6e at 40,
// #df825c at 47, and the body (#d1592b) by 56. In em of the 0.077 h chip
// (83 px at 1920). Drawn on a 1.4em box pulled back to 0.96em by its margin
// so the glow is part of the gradient and the word still sits 29 px off the
// 79 px disc. `closest-side` so 1em is 1em; the default farthest-corner made
// the old stops 1.41x too wide.
const BULLET =
  "radial-gradient(circle closest-side, #f57873 0, #f58780 0.156em, #f69990 0.24em, #f7a79d 0.29em, #f8b2a6 0.34em, #ee9d88 0.385em, #e79177 0.43em, #e68d6e 0.48em, #df825c 0.565em, #d1592b00 0.67em)";

export const OrbBloom: React.FC<OrbBloomProps> = ({
  durationInFrames,
  chips,
  x,
  y,
  radius,
  from,
  at,
  slideFrames,
  chipAt,
  chipStep,
  chipFrames,
  exitAt,
  exitFrames,
  exit,
  size,
  color,
  background,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);

  const R = radius * 1080;
  const slide = enter(frame, at, slideFrames);
  const start = from * 1920 - R;
  const cx = start + (x * 1920 - start) * slide;
  const sphere = [RIM, BODY]
    .join(", ")
    .replace(/RAD15/g, String(1.5 * R))
    .replace(/RAD/g, String(R));

  return (
    <AbsoluteFill style={{ background }}>
      <div
        style={{
          position: "absolute",
          left: cx - R,
          top: y * 1080 - R,
          width: 2 * R,
          height: 2 * R,
          borderRadius: "50%",
          background: sphere,
        }}
      />

      <AbsoluteFill
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          // chip centres 0.275, 0.509, 0.75 w at f1310: 240 px between chips
          gap: "2.9em",
          fontFamily: SERIF,
          fontSize: `${size * 100}vh`,
          color,
        }}
      >
        {chips.map((chip, i) => {
          const landed = stagger(frame, i, {
            at: chipAt,
            step: chipStep,
            frames: chipFrames,
          });
          const away = enter(frame, exitAt, exitFrames, Easing.in(Easing.cubic));
          const speed = [1, 1.39, 0.72][i % 3];
          return (
            <span
              key={chip + i}
              style={{
                opacity: landed,
                filter: `blur(${(1 - landed) * 10}px)`,
                transform: `translateY(${
                  (1 - landed) * 12 - exit * speed * away * 1080
                }px)`,
                display: "flex",
                alignItems: "center",
                gap: "0.35em",
              }}
            >
              <span
                style={{
                  width: "1.4em",
                  height: "1.4em",
                  margin: "-0.22em",
                  flex: "none",
                  background: BULLET,
                }}
              />
              {chip}
            </span>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = OrbBloom;

export const defaultProps: OrbBloomProps = {
  chips: ["piece", "by", "piece"],
  x: 0.46,
  y: 0.54,
  radius: 0.95,
  // geometric edge; the dark body ends 0.06 w inside it (0.932 w at rest for
  // a geometric 0.994), so this puts it at the 0.22 measured on f1283
  from: 0.28,
  at: 0,
  slideFrames: 27,
  chipAt: 0,
  chipStep: 4,
  chipFrames: 6,
  // 0.46 h in the 24 frames measured, so 0.9 h in 30 clears the frame
  exitAt: 33,
  exitFrames: 30,
  exit: 0.9,
  // "piece" is 141 px wide at f1310 against 163 at 0.09: match the width,
  // the reference's serif runs 20% shorter per width than Instrument Serif
  size: 0.077,
  color: PAPER,
  background: "#f0aa7b",
};
