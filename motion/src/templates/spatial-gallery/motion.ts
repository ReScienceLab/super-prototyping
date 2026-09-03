/**
 * Momentum-flick scroll model. Pure functions of the frame index, so Remotion
 * can render frames out of order across workers and always get the same value.
 *
 * velocity(k) is the displacement between frame k and k+1 (px along the pan
 * axis). travel(f) is the position at frame f: the sum of velocity(0..f-1).
 * O(f) per call, f <= a few hundred, so no memo needed.
 */

export type Flick = {
  /** frame the flick starts */
  onset: number;
  /** peak speed, px/frame */
  peak: number;
  /** frames to ramp 0 -> peak (smoothstep) */
  rise: number;
  /** frames held at peak before friction takes over */
  hold: number;
};

export type Motion = {
  flicks: Flick[];
  /** velocity multiplier per frame once a flick decays (0.85 = loses 15%/frame) */
  friction: number;
  /** constant creep, px/frame, present the whole clip */
  drift: number;
};

const smoothstep = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

const flickVelocity = (fl: Flick, friction: number, k: number) => {
  const t = k - fl.onset;
  if (t < 0) return 0;
  if (t < fl.rise) return fl.peak * smoothstep(t / fl.rise);
  const decay = t - fl.rise - fl.hold;
  return decay <= 0 ? fl.peak : fl.peak * Math.pow(friction, decay);
};

export const velocity = (m: Motion, k: number) =>
  m.drift + m.flicks.reduce((v, fl) => v + flickVelocity(fl, m.friction, k), 0);

export const travel = (m: Motion, frame: number) => {
  let s = 0;
  for (let k = 0; k < frame; k++) s += velocity(m, k);
  return s;
};

/** Defaults fitted to the reference clip (see README). */
export const REFERENCE_MOTION: Motion = {
  flicks: [
    { onset: 3, peak: 82, rise: 5, hold: 3 },
    { onset: 51, peak: 80, rise: 3, hold: 3 },
  ],
  friction: 0.82,
  drift: 1.5,
};
