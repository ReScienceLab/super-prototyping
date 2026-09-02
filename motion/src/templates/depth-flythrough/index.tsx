import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BONE, INK, ORANGE, PAPER } from "../../lib/palette";
import { Orb } from "../../lib/Orb";
import { SANS } from "../../lib/fonts";
import { useDuration } from "../../lib/timing";

/*
 * Depth flythrough: a queue of spheres strung out along the z axis with the
 * camera walking forward past them, each one growing, swinging out to the left
 * and off the edge of the frame.
 *
 * Reference: f1470-1595. Measured off f1480/f1500/f1520/f1545:
 *
 *   - The orbs are on ONE STRAIGHT LINE that passes to the LEFT of the camera,
 *     and they converge on a vanishing point at about x 0.56, y 0.50. They do
 *     not scatter. That line is the whole shot: it is what makes a handful of
 *     circles read as a corridor.
 *   - The nearest orb sits at about x 0.28, about 0.4 of the frame height
 *     across, and each one back is about 0.63 the size of the one in front —
 *     which is a uniform z spacing seen through a perspective divide, not a
 *     ratio anyone chose.
 *   - Centre-to-centre spacing down the chain is about one near-orb radius, so
 *     consecutive spheres overlap by half and the far tail packs into a smear.
 *   - A bubble hangs to the RIGHT of its orb, about a near-orb radius clear of
 *     it, and is roughly one and a half orbs wide. Two on screen at once stack
 *     either side of the line: the question above it, the answer below.
 *   - Orbs leave by the left edge, not by swelling through the lens. By the
 *     time one is dropped it is most of a frame height across and mostly out.
 *
 * The projection is the real perspective divide, `focal / z`, in both axes: it
 * sets the size AND the swing out to the left, off one camera position. A lerp
 * between two sizes makes the far orbs approach at the same rate as the near
 * ones and the shot goes flat.
 */

export type DepthFlythroughProps = {
  durationInFrames?: number;
  /** one label per orb; "" for a bare orb */
  labels: string[];
  /** z gap between consecutive orbs, in the same units as `focal` */
  gap: number;
  /** z units the camera covers per frame */
  speed: number;
  /** the perspective constant: bigger is a longer lens, flatter depth */
  focal: number;
  /** x the chain converges on, as a fraction of frame width */
  vanish: number;
  /** how far left of the camera the line of orbs runs, in frame widths at z = focal */
  offset: number;
  /** z the camera drops an orb at; this is what sets how big the nearest gets */
  near: number;
  /** z distance in front of the camera that is in focus */
  focus: number;
  /** px of defocus per z unit away from the focal plane */
  blur: number;
  /** orb diameter at z = focal, in px */
  orb: number;
  size: number;
  color: string;
  bubble: string;
  accent: string;
  background: string;
};

export const DepthFlythrough: React.FC<DepthFlythroughProps> = ({
  durationInFrames,
  labels,
  gap,
  speed,
  focal,
  vanish,
  offset,
  near,
  focus,
  blur,
  orb,
  size,
  color,
  bubble,
  accent,
  background,
}) => {
  const frame = useCurrentFrame();
  const duration = useDuration(durationInFrames);
  // Half a gap back, so frame 0 lands mid-cycle instead of on the near plane
  // with an orb fading in across half the frame. A template opens settled.
  const camera = frame * speed - gap * 0.5;

  // How far down the row you can see. Off `focus` rather than off `gap`,
  // because it is a property of the lens and the haze, not of the spacing:
  // tied to `gap` it shrinks every time the row is packed tighter, and packing
  // the row tighter is exactly how the reference gets its overlapping crowd.
  const far = focus * 2.2;

  // The row is as long as the shot needs, not as long as `labels` happens to
  // be: the camera covers `duration * speed` and `far` more has to still be in
  // front of it on the last frame, or the film ends walking into an empty
  // room. Labels repeat around the row, which is also what lets one template
  // take a two-second cut and a ten-second one.
  const count = Math.ceil((duration * speed + far) / gap);

  const shots = [...Array(count)]
    .map((_, i) => {
      const z = (i + 1) * gap - camera;
      // Past the camera, or so far off it is a sub-pixel speck. Dropping them
      // rather than rendering them at scale ~0 keeps the DOM to a dozen nodes.
      // `near` is the measurement, not a clipping plane for its own sake: it
      // decides how big the biggest orb in frame gets (`orb * focal / near`),
      // and it is set where the reference's nearest orb has swung far enough
      // left to be mostly out of frame anyway.
      if (z < near || z > far) return null;
      const k = focal / z;
      return {
        i,
        // Depth culls the text before it culls the orb. Below about 20px of
        // type a bubble is litter rather than distance — the reference never
        // shows a third one, however many spheres are on screen.
        label: size * k >= 20 ? labels[i % labels.length] : "",
        k,
        // The bubble stops growing before the orb does. A sphere 1.4 frame
        // heights across is a wash of colour off the left edge and reads fine;
        // a sentence at that scale is a grey smear across the whole frame.
        bk: Math.min(k, 2.4),
        // Which side of the conversation this one is. Off the label's index and
        // not the orb's: the labelled orbs are every other one, so `i % 2` puts
        // every single bubble on the same side and the alternation never fires.
        answer: Math.floor(i / 2) % 2 === 1,
        // Painter's algorithm: far orbs must be painted first. React renders in
        // array order, so sorting the array IS the z-sort.
        z,
        // The same divide as the size. One line of orbs offset to the left of
        // the camera axis: the near end swings wide, the far end piles onto the
        // vanishing point.
        x: vanish - offset * k,
        blur: Math.abs(z - focus) * blur,
        // Fade the last stretch out over half a gap rather than letting an orb
        // vanish mid-frame at full opacity, which pops.
        opacity: Math.min(1, (z - near) / (gap * 0.5)),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => b.z - a.z);

  return (
    <AbsoluteFill style={{ background, fontFamily: SANS }}>
      {shots.map((s) => (
        <div
          key={s.i}
          style={{
            position: "absolute",
            left: `${s.x * 100}%`,
            top: "50%",
            display: "flex",
            alignItems: "center",
            // An absolutely positioned box with no width shrink-wraps to the
            // room left of the frame's right edge, so a near orb 800px across
            // leaves the bubble beside it a hundred pixels and its text comes
            // out one word per line. `max-content` sizes the row to the row.
            width: "max-content",
            gap: orb * s.k * 0.25,
            // The ORB's centre goes on `x`, not the row's: a row centred on `x`
            // would kink the chain sideways at every orb that carries a label,
            // by half a bubble.
            transform: `translate(${(-orb * s.k) / 2}px, -50%)`,
            filter: s.blur ? `blur(${s.blur}px)` : undefined,
            opacity: s.opacity,
            whiteSpace: "nowrap",
          }}
        >
          <Orb size={orb * s.k} />
          {s.label ? (
            <span
              style={{
                fontSize: size * s.bk,
                lineHeight: 1.35,
                // In em, so the padding scales once with the type. In px * k it
                // scales twice, and the near bubble comes out all padding.
                padding: "0.55em 0.9em",
                borderRadius: 26 * s.bk,
                // A bubble has to wrap, or a long line walks off the frame the
                // moment its orb gets close. The parent sets `nowrap` to keep
                // the orb and the bubble on one line; the bubble overrides it.
                maxWidth: 300 * s.bk,
                whiteSpace: "normal",
                display: "inline-block",
                // Stacked either side of the line of orbs, as the reference
                // stacks a question over its answer. Off the orb's scale, not
                // the clamped one: this is clearance from the sphere.
                transform: `translateY(${(s.answer ? 1 : -1) * orb * s.k * 0.2}px)`,
                // Alternating fills: the reference answers in the accent and
                // asks in the pale bubble, which is what makes a row of orbs
                // read as a conversation rather than as decoration.
                background: s.answer ? accent : bubble,
                color: s.answer ? PAPER : color,
              }}
            >
              {s.label}
            </span>
          ) : null}
        </div>
      ))}
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = DepthFlythrough;

export const defaultProps: DepthFlythroughProps = {
  // Every other one bare. The reference's chain is denser than its conversation
  // is: most of what recedes down the corridor is spheres, and only the two or
  // three near the camera are carrying anything to read.
  labels: [
    "Hi, what do you want to know?",
    "",
    "How do I read a balance sheet?",
    "",
    "Start with what it owes.",
    "",
    "And then?",
    "",
    "Then what it owns, and the gap.",
    "",
  ],
  gap: 0.63,
  speed: 0.032,
  focal: 2.2,
  vanish: 0.56,
  offset: 0.135,
  near: 0.55,
  focus: 2.6,
  blur: 3.4,
  orb: 210,
  size: 21,
  color: INK,
  bubble: "#ffffff",
  accent: ORANGE,
  background: BONE,
};
