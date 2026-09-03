import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { BONE } from "../../lib/palette";
import { SERIF } from "../../lib/fonts";
import { enter, leave, useDuration } from "../../lib/timing";

/*
 * Word grid: one word tiled three by three, the middle row lighting up first
 * left to right and the outer rows together a beat later; a hold; then the
 * cells go out one by one while the ground slides off the bottom of the frame
 * and leaves bone behind for the end card.
 *
 * Reference: f1864-1928, "everything" on a vertical red gradient. Measured off
 * f1866-1924 (cell boxes from a high-pass on f1890; ground as a 12-row column
 * mean at x 0.25-0.38, identical at x 0.62-0.75 and at f1870):
 *
 *   - The ground is a static, purely vertical gradient, #f2b5a9 at the top to
 *     #7f0110 at the bottom — not the film's mesh. Its twelve row means are
 *     the stops in `ground`.
 *   - Cells are centred on x 0.135 / 0.500 / 0.852 and y 0.085 / 0.493 / 0.930
 *     (bbox centres of the word), 0.165 wide by 0.066 tall.
 *   - Arrival is a sweep, not a scatter: the middle row at f1866 / 1867 / 1868
 *     left to right, then the top and bottom rows together at f1869-1870,
 *     each about four frames. The seeded shuffle that used to be here was
 *     never in the reference.
 *   - The text is not one colour at one opacity. Its core is #fefdf9 on the
 *     pale top row, #faaa71 in the middle, #e41229 on the dark bottom row; no
 *     normal blend lifts G from 7 to 27 at the bottom and from 50 to 116 in
 *     the middle at once. Each row gets its measured colour outright, which
 *     reproduces the frame without guessing the compositor's blend mode.
 *   - Exit, f1903-1919: cells go out singly (r2c1 first at f1903, r1c1 last,
 *     f1913-1919) under a wash that is the gradient sliding down out of the
 *     frame with bone above it: the bottom row reads #840410 / #9b1715 /
 *     #c24b3b / #e5a79e / #e7c3be at f1904 / 1912 / 1916 / 1920 / 1924, the
 *     f1890 stops passing through it from the top, and the top row is bone
 *     from f1920. The slide is ease-in, 1.1 frame heights by f1924 and flat
 *     bone by f1930.
 */

export type WordGridProps = {
  durationInFrames?: number;
  word: string;
  /** x of each column's centre, as a fraction of the frame width */
  columns: number[];
  /** y of each row's centre, as a fraction of the frame height */
  rows: number[];
  /** frame each cell lands, row-major, relative to `at` */
  delays: number[];
  at: number;
  /** frames a cell takes to land */
  frames: number;
  blur: number;
  rise: number;
  /** the text's colour on each row, top to bottom */
  colors: string[];
  italic: boolean;
  size: number;
  /** the ground, top to bottom, evenly spaced */
  ground: string[];
  /** what the ground slides off to reveal */
  background: string;
  /** frames the ground takes to slide away */
  wash: number;
  /** frame heights it has slid by then; past 1.5 none of it is left */
  washTo: number;
  /** frames of settled `background` at the end of the shot */
  tail: number;
  /** frame each cell goes out, row-major, relative to the start of the wash */
  leaveDelays: number[];
  leaveFrames: number;
};

export const WordGrid: React.FC<WordGridProps> = ({
  durationInFrames,
  word,
  columns,
  rows,
  delays,
  at,
  frames,
  blur,
  rise,
  colors,
  italic,
  size,
  ground,
  background,
  wash,
  washTo,
  tail,
  leaveDelays,
  leaveFrames,
}) => {
  const frame = useCurrentFrame();
  const duration = useDuration(durationInFrames);

  const washAt = duration - tail - wash;
  const shift = washTo * enter(frame, washAt, wash, Easing.in(Easing.quad));
  // The ground layer is two frames tall: `background` in the top half fading
  // into the gradient's first stop over the last half-frame of it (f1916 has
  // the top row still faintly pink 0.46 frame heights above the first stop),
  // the measured stops in the bottom half. At rest the bottom half is the
  // frame; the wash slides the whole layer down.
  const stops = ground
    .map((c, i) => `${c} ${50 + ((i + 0.5) / ground.length) * 50}%`)
    .join(", ");

  return (
    <AbsoluteFill style={{ background, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          width: "100%",
          top: "-100%",
          height: "200%",
          background: `linear-gradient(180deg, ${background} 0%, ${background} 27%, ${stops})`,
          transform: `translateY(${shift * 50}%)`,
        }}
      />
      {rows.map((y, r) =>
        columns.map((x, c) => {
          const i = r * columns.length + c;
          const p = enter(frame, at + delays[i], frames);
          const out = leave(frame, washAt + leaveDelays[i], leaveFrames);
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                whiteSpace: "nowrap",
                lineHeight: 1,
                fontFamily: SERIF,
                fontStyle: italic ? "italic" : "normal",
                fontSize: `${size * 100}vh`,
                color: colors[r],
                opacity: p * out,
                filter: `blur(${(1 - p) * blur}px)`,
                transform: `translate(-50%, -50%) translateY(${(1 - p) * rise}px)`,
              }}
            >
              {word}
            </span>
          );
        }),
      )}
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = WordGrid;

export const defaultProps: WordGridProps = {
  word: "everything",
  columns: [0.135, 0.5, 0.852],
  rows: [0.085, 0.493, 0.93],
  // Middle row first, left to right, one frame apart; the outer rows three
  // frames after it (f1866 / 1867 / 1868, then f1869-1870).
  delays: [3, 3, 3, 0, 1, 2, 3, 3, 3],
  // f1866 is frame 15 of this shot in the cut (f1910 -> 59).
  at: 15,
  frames: 4,
  blur: 12,
  rise: 18,
  // Text core at f1890, outer cells of each row.
  colors: ["#fefdf9", "#faaa71", "#e41229"],
  italic: false,
  // The cell is 0.165 wide by 0.067 tall at f1890 (ink vs the row median, both
  // clips at 1920). At 0.095 this face rendered 0.198 by 0.092: it runs taller
  // for its width than the reference face, so no one size hits both. 0.074
  // splits the difference, 7% under on width and 7% over on height.
  size: 0.074,
  // f1890, x 0.25-0.38, twelve rows top to bottom.
  ground: [
    "#f2b5a9",
    "#eb9c8c",
    "#e2816d",
    "#da6851",
    "#d05138",
    "#c43d24",
    "#b62c18",
    "#a81e12",
    "#9b130f",
    "#8f0b0f",
    "#850410",
    "#7f0110",
  ],
  background: BONE,
  // f1903-1928: ease-in, 1.1 frame heights by frame 21 of it.
  wash: 25,
  washTo: 1.6,
  tail: 3,
  // r2c1 first (f1903), r0c0 at f1908, four more at f1912, r1c2 / r2c0 at
  // f1914, r1c1 last.
  leaveDelays: [5, 9, 9, 9, 11, 11, 11, 0, 9],
  leaveFrames: 5,
};
