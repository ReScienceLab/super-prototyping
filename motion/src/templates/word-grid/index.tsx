import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { GRADIENT } from "../../lib/palette";
import { Gradient, type GradientProps, MESH } from "../../lib/Gradient";
import { SERIF } from "../../lib/fonts";
import { enter, useDuration } from "../../lib/timing";

/*
 * Word grid: one word tiled across the frame, the cells lighting up in a
 * scattered order rather than a sweep. Reference: f1740-1800, "everything" set
 * italic on the gradient, low contrast, filling the frame.
 *
 * The scatter has to be seeded, not random: Remotion renders frames out of
 * order across workers, so `Math.random()` gives every worker a different grid
 * and the render comes out flickering. `random(seed)` from remotion is the
 * repo's answer — same seed, same number, every worker, forever.
 */

export type WordGridProps = {
  durationInFrames?: number;
  word: string;
  columns: number;
  rows: number;
  /** anything; change it to reshuffle the order the cells arrive in */
  seed: string;
  /** frames between one cell arriving and the next */
  step: number;
  frames: number;
  blur: number;
  rise: number;
  /** cell opacity once arrived */
  opacity: number;
  italic: boolean;
  size: number;
  color: string;
  gradient: GradientProps;
};

export const WordGrid: React.FC<WordGridProps> = ({
  durationInFrames,
  word,
  columns,
  rows,
  seed,
  step,
  frames,
  blur,
  rise,
  opacity,
  italic,
  size,
  color,
  gradient,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);

  const cells = [...Array(columns * rows)].map((_, i) => i);
  // A seeded key per cell, sorted, is a deterministic shuffle: the sort is the
  // permutation. Cheaper to read than a seeded Fisher-Yates and, at a few dozen
  // cells, the same thing.
  const order = new Map(
    [...cells]
      .sort((a, b) => random(`${seed}-${a}`) - random(`${seed}-${b}`))
      .map((cell, place) => [cell, place]),
  );

  return (
    <AbsoluteFill>
      <Gradient {...gradient} />
      <AbsoluteFill
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          placeItems: "center",
          fontFamily: SERIF,
          fontStyle: italic ? "italic" : "normal",
          fontSize: `${size * 100}vh`,
          color,
        }}
      >
        {cells.map((cell) => {
          const p = enter(frame, (order.get(cell) as number) * step, frames);
          return (
            <span
              key={cell}
              style={{
                opacity: p * opacity,
                filter: `blur(${(1 - p) * blur}px)`,
                transform: `translateY(${(1 - p) * rise}px)`,
              }}
            >
              {word}
            </span>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = WordGrid;

export const defaultProps: WordGridProps = {
  word: "everything",
  columns: 3,
  rows: 3,
  seed: "everything",
  step: 5,
  frames: 14,
  blur: 12,
  rise: 18,
  opacity: 0.72,
  italic: true,
  size: 0.05,
  color: GRADIENT[7],
  gradient: MESH,
};
