import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { BONE, ORANGE } from "../../lib/palette";
import { Orb } from "../../lib/Orb";
import { SANS } from "../../lib/fonts";
import { arrive, enter, useDuration } from "../../lib/timing";

/*
 * Depth flythrough: a line of spheres receding to a vanishing point right of
 * centre, the camera creeping toward them, and a conversation pinned to the
 * front sphere. When an exchange is over the camera walks up one sphere.
 *
 * Reference: f1470-1595. Measured per frame off f1474-1588 (front orb radius in
 * frame heights, bubble boxes as fractions of the frame):
 *
 *   - The camera barely moves. The front orb is r 0.206 at f1489 and 0.239 at
 *     f1546: 16% in 57 frames, which through a perspective divide is the camera
 *     covering 0.14 of its distance to that orb — 0.0024 per frame. This
 *     template used to run at 0.032 and put a fresh orb through the lens every
 *     20 frames; the reference never lets one past that way.
 *   - What moves the shot is the conversation. Each exchange belongs to one
 *     orb. When it is done the camera either walks one slot (f1510-1518: the
 *     front orb grows x1.4, goes pale and is gone in 8 frames while the chain
 *     steps up and the next orb lands at r 0.207, the same size the first one
 *     started at) or pushes in without passing anything (f1548-1549: the front
 *     orb goes r 0.239 -> 0.279, x1.17, in one frame and stays).
 *   - The bubbles scale with THEIR orb, not with the camera: Q2 is 0.409 of the
 *     frame wide at f1522 and 0.599 at f1549 (x1.46) while its orb went
 *     r 0.216 -> 0.279 (x1.29); they grow more than the orb through a push, so
 *     they sit nearer the camera than it. Not modelled: they take the orb's
 *     scale here. Their column's left edge is 1.02 - 0.555 * scale
 *     (f1504: 0.46 at scale 1.05; f1546: 0.41 at 1.1; f1583: 0.18 at 1.5): a
 *     column anchored just off the right edge, scaling about that anchor.
 *   - A lone bubble sits centred on y 0.5 (f1546: 0.439-0.561). When its reply
 *     lands the pair is centred on the gap between them (f1498: 0.450 / 0.524;
 *     f1585: 0.456 / 0.533), the first lifting to make room.
 */

export type Message = {
  text: string;
  /** the accent bubble (a question) rather than the pale one */
  ask: boolean;
  /** which orb, front to back at frame 0, this belongs to */
  orb: number;
  /** frame it lands; negative means it is there when the shot opens */
  at: number;
};

export type Push = {
  at: number;
  frames: number;
  /** z the camera covers, in units of the front orb's distance at frame 0 */
  z: number;
  /** orbs this move walks past; they fade out over it instead of swelling */
  pass: number;
};

export type DepthFlythroughProps = {
  durationInFrames?: number;
  messages: Message[];
  /** the camera's moves; `gap` here walks the chain up one orb */
  pushes: Push[];
  orbs: number;
  /** z between consecutive orbs; the front one starts at z = 1 */
  gap: number;
  /** z the camera creeps per frame between pushes */
  speed: number;
  /** x the chain converges on, as a fraction of frame width */
  vanish: number;
  /** how far left of `vanish` the front orb sits at z = 1, in frame widths */
  offset: number;
  /** front orb diameter at z = 1, px */
  orb: number;
  /** the orb's surface, a CSS background; the shared Orb is the f1300 sphere */
  sphere: string;
  /** px of softness every orb carries; the reference has no hard edge anywhere */
  soft: number;
  /** px of defocus per z unit behind the front orb */
  blur: number;
  /** frames a reply takes to land and its question to lift */
  frames: number;
  /** bubble type size at scale 1, px */
  size: number;
  color: string;
  bubble: string;
  accent: string;
  accentText: string;
  background: string;
};

/**
 * An orb being walked past fades rather than swelling through the lens:
 * f1513-1517 has it at r 0.246 -> 0.293 (x1.4, not x5) going pale, and it is
 * gone by f1518. Its size is capped at this z. The fade is tied to the walk,
 * not to z: after the push at f1548 the front orb sits at about z 0.74 to the
 * end of the shot, solid, which is closer than the walked one ever got.
 */
const PASS = 0.7;

export const DepthFlythrough: React.FC<DepthFlythroughProps> = ({
  durationInFrames,
  messages,
  pushes,
  orbs,
  gap,
  speed,
  vanish,
  offset,
  orb,
  sphere,
  soft,
  blur,
  frames,
  size,
  color,
  bubble,
  accent,
  accentText,
  background,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);

  let camera = frame * speed;
  // Orb index -> what is left of it, for the orbs a walk passes. Pushes are
  // in time order, so the orbs they pass are the front ones in that order.
  // Ease-in: the bubbles hold until the last frames of the walk (f1517-1518).
  const passing = new Map<number, number>();
  for (const p of pushes) {
    const t = enter(frame, p.at, p.frames, Easing.in(Easing.quad));
    camera += p.z * t;
    for (let j = 0; j < p.pass; j++) passing.set(passing.size, 1 - t);
  }

  const shots = [...Array(orbs)]
    .map((_, i) => {
      const z = 1 + i * gap - camera;
      const opacity = passing.get(i) ?? 1;
      if (z <= 0 || opacity <= 0) return null;
      const k = 1 / (passing.has(i) ? Math.max(z, PASS) : z);
      return {
        i,
        z,
        k,
        // The same divide as the size: one line of orbs left of the camera
        // axis, the near end swung wide, the far end piled on the vanishing
        // point.
        x: vanish - offset * k,
        opacity,
        blur: soft + Math.max(0, z - 1) * blur,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    // Painter's algorithm: React renders in array order, so the sort is the
    // z-sort.
    .sort((a, b) => b.z - a.z);

  return (
    <AbsoluteFill style={{ background, fontFamily: SANS }}>
      {shots.map((s) => (
        <Orb
          key={s.i}
          size={orb * s.k}
          blur={s.blur}
          opacity={s.opacity}
          style={{
            position: "absolute",
            left: `${s.x * 100}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            background: sphere,
          }}
        />
      ))}

      {shots.map((s) => {
        const own = messages.filter((m) => m.orb === s.i && frame >= m.at);
        if (own.length === 0) return null;
        const [first, second] = own;
        // The reply landing is what lifts the question: both run on one clock.
        const p = second ? enter(frame, second.at, frames) : 0;
        const pill = (m: Message): React.CSSProperties => ({
          position: "absolute",
          left: m.ask ? "2.5em" : 0,
          fontSize: size,
          // Line pitch 39px and a one-line bubble 88px at f1489 / f1522, both
          // at scale 1: 1.2 and 0.73em of padding at 33px. Horizontal padding
          // is not measured. Q2 wraps to two lines inside 786px at scale
          // 1.05 (f1522), 22.7em.
          lineHeight: 1.2,
          padding: "0.73em 0.9em",
          borderRadius: "1.2em",
          maxWidth: "22.7em",
          width: "max-content",
          background: m.ask ? accent : bubble,
          color: m.ask ? accentText : color,
        });
        return (
          <div
            key={`chat-${s.i}`}
            style={{
              position: "absolute",
              right: "-2%",
              width: "55.5%",
              top: "50%",
              height: 0,
              transformOrigin: "right center",
              transform: `scale(${s.k})`,
              opacity: s.opacity,
            }}
          >
            <div
              style={{
                ...pill(first),
                ...arrive(enter(frame, first.at, frames), 12, 16),
                bottom: 0,
                // Alone: hangs half its own height below the centre line, so
                // it is centred. Paired: its bottom edge sits half a gap
                // above it, the gap being 0.029 of the frame at f1504 and
                // 0.049 at f1560 (both at scale 1), 1.2em. Percent in a
                // translate is of the element itself, which is what lets
                // this not know the bubble's height.
                transform: `translateY(calc(${(1 - p) * 50}% - ${p * 0.6}em))`,
              }}
            >
              {first.text}
            </div>
            {second ? (
              <div
                style={{
                  ...pill(second),
                  ...arrive(p, 12, 16),
                  top: 0,
                  transform: `translateY(calc(0.6em + ${(1 - p) * 16}px))`,
                }}
              >
                {second.text}
              </div>
            ) : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = DepthFlythrough;

export const defaultProps: DepthFlythroughProps = {
  // Two exchanges, one orb each, on the reference's clock with frame 0 at
  // f1489 (the shot's own settle-in, f1470-1489, is not reproduced: a template
  // opens settled). The first pair is already there when the shot opens.
  messages: [
    { text: "Hi, what do you want to know?", ask: false, orb: 0, at: -20 },
    { text: "How do I read a balance sheet?", ask: true, orb: 0, at: -12 },
    {
      text: "And how do I tell if a company is actually healthy?",
      ask: true,
      orb: 1,
      at: 28,
    },
    {
      text: "Start with what it owes, then what it owns, and the gap between.",
      ask: false,
      orb: 1,
      at: 60,
    },
  ],
  // f1510-1518: walk up one orb. f1548-1549: push in and stay; r 0.239 ->
  // 0.279 is x1.17, which from z 0.86 is 0.125. (0.2 rendered r 0.319.)
  pushes: [
    { at: 21, frames: 8, z: 0.6, pass: 1 },
    { at: 58, frames: 1, z: 0.125, pass: 0 },
  ],
  orbs: 6,
  // Each orb back is 0.63 the size of the one in front (f1508: r 0.21, 0.13,
  // 0.08), which is 1 / (1 + gap) with the front orb at z = 1.
  gap: 0.6,
  speed: 0.0024,
  // The front orb's centre is at x 0.29 (f1489) and the chain converges on
  // x 0.56; the second orb lands on 0.39 and the third on 0.44 with these two.
  vanish: 0.56,
  offset: 0.27,
  // r 0.206 of the frame height at f1489.
  orb: 445,
  // This shot's sphere is not the shared Orb's orange: at f1504 its disc mean
  // is #df6f67 against the Orb's #ed7540, pink-white in the upper left
  // (#de9893) going to deep red at the lower right (#cb2936) with an orange
  // rim light on that edge (#ed5e42). Sampled along that axis, with the
  // stops at their distance from a point 35% in from the top left.
  sphere:
    "radial-gradient(circle at 35% 35%, #e8a09b, #e5928f 25%, #dc6b64 45%, " +
    "#cb2936 65%, #ed5e42 75%)",
  // Edge transition of about 14px at 1920 on the f1504 crop.
  soft: 5,
  blur: 6,
  // f1486-1498 for the lift, f1549-1555 for a reply's fade.
  frames: 12,
  // The glyph run of a line with a descender is 33px at f1489 and f1522
  // (both at 1920, scale 1.0 / 1.05), which for Inter's cap height plus
  // descender (0.97em) is 33-34px. With the 39px pitch and 0.73em padding
  // a one-line bubble is 88px (f1489: 0.081 of the frame) and a two-line one
  // 127px (f1522: 133px at 1.05). 38 was the same 88px at 1.3 / 0.5em and
  // put two lines at 137.
  size: 33,
  // Measured off the bubbles at f1504: pale fill #fafafa with #3d251a text
  // (warmer and lighter than INK), accent fill #ef4a06 with #fff9e8 text.
  color: "#3d251a",
  bubble: "#fafafa",
  accent: ORANGE,
  accentText: "#fff9e8",
  background: BONE,
};
