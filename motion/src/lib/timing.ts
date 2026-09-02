import { Easing, interpolate, useVideoConfig } from "remotion";

/**
 * Timing helpers shared by the templates. Every one is a pure function of the
 * frame, because Remotion renders frames out of order across workers.
 */

/**
 * How long this shot runs. A template reads its length from a prop, never from
 * `useVideoConfig`, because the point of the library is that a film drops the
 * same template into a `<Sequence>` of whatever length the cut wants —
 * and inside a Sequence `useVideoConfig().durationInFrames` still reports the
 * composition's length, not the sequence's. Left undefined (which is what the
 * studio does when you scrub the template on its own) it falls back to the
 * composition, so a template is playable both ways.
 */
export const useDuration = (override?: number) => {
  const { durationInFrames } = useVideoConfig();
  return override ?? durationInFrames;
};

/** 0 -> 1 over `frames` starting at `at`. Ease-out cubic unless told otherwise. */
export const enter = (
  frame: number,
  at: number,
  frames: number,
  easing = Easing.out(Easing.cubic),
) =>
  interpolate(frame, [at, at + Math.max(1, frames)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

/** 1 -> 0 over `frames` starting at `at`, the mirror of `enter`. */
export const leave = (frame: number, at: number, frames: number) =>
  1 - enter(frame, at, frames, Easing.in(Easing.cubic));

/**
 * The film's entrance, which every template that reveals something uses: a unit
 * arrives out of focus and slightly low, and settles. Returns the three values
 * a style needs. `rise` is in whatever unit the caller writes it out in.
 */
export const arrive = (progress: number, blur: number, rise: number) => ({
  opacity: progress,
  filter: `blur(${(1 - progress) * blur}px)`,
  transform: `translateY(${(1 - progress) * rise}px)`,
});

/**
 * Where item `i` of `count` is in its own entrance at `frame`: each starts
 * `step` frames after the one before, and takes `frames` to arrive.
 */
export const stagger = (
  frame: number,
  i: number,
  { at = 0, step = 4, frames = 12 } = {},
) => enter(frame, at + i * step, frames);
