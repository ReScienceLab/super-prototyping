import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { COCOA, GRADIENT, PAPER } from "../../lib/palette";
import { SERIF } from "../../lib/fonts";
import { enter, useDuration } from "../../lib/timing";

/*
 * Lens reveal: a tilted oval aperture with a bright rim opens out of nothing
 * and swallows the frame, with a caption sitting inside it.
 *
 * Reference: f1640-1700 — a white lens shape over a portrait, tipped maybe 20
 * degrees off horizontal, growing until its rim runs off every edge and the
 * shot behind it is simply the shot.
 *
 * The rim is the reason this is not just a `clip-path` animation. The aperture
 * is drawn twice: an oval div carrying the rim as a very large `box-shadow`
 * spread (which is what darkens everything outside it in one property), and the
 * same ellipse as a `clipPath` on the content layer. Both take the same `open`,
 * so the rim can never drift off the edge it is supposed to be tracing.
 *
 * `clipPath` with an `ellipse()` rather than a mask image: it is the one
 * clipping primitive Chrome composites on the GPU at 1080p without a per-frame
 * raster, and this shot is 90 frames of nothing but a growing ellipse.
 */

/** How much bigger than the frame the rotated layer is drawn. sec(18deg) +
 * tan(18deg) is about 1.38 for a 16:9 box; 1.5 covers any tilt this shot uses. */
const COVER = 1.5;

export type LensRevealProps = {
  durationInFrames?: number;
  caption: string;
  /** what the lens opens onto; a solid or any CSS background value */
  reveal: string;
  /** frames the aperture takes to open */
  frames: number;
  /** aperture width at frame 0, as a fraction of the frame width */
  from: number;
  /** aperture width once open; over 1 runs it off the edges */
  to: number;
  /** height / width of the oval */
  aspect: number;
  /** degrees the oval is tipped */
  tilt: number;
  /** px of the bright rim */
  rim: number;
  rimColor: string;
  /** frame the caption arrives */
  captionAt: number;
  captionFrames: number;
  size: number;
  color: string;
  background: string;
};

export const LensReveal: React.FC<LensRevealProps> = ({
  durationInFrames,
  caption,
  reveal,
  frames,
  from,
  to,
  aspect,
  tilt,
  rim,
  rimColor,
  captionAt,
  captionFrames,
  size,
  color,
  background,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);

  // Ease IN, not the repo's usual ease-out: an aperture that opens fast and
  // creeps to a halt spends five sixths of the shot as a full-frame wash with
  // no lens in it. The reference holds a readable oval for most of the move and
  // then lets it accelerate off every edge at the end, which is ease-in.
  const open = enter(frame, 0, frames, Easing.in(Easing.quad));
  const w = (from + (to - from) * open) * 100;
  const h = w * aspect * (1920 / 1080);
  const text = enter(frame, captionAt, captionFrames);

  return (
    <AbsoluteFill style={{ background, overflow: "hidden" }}>
      {/* The revealed layer, clipped to the aperture. `rotate` on a wrapper
          rather than inside `ellipse()`, which takes no angle. `scale(COVER)`
          with the radii divided back out is not a no-op: a full-frame box
          rotated 18 degrees no longer covers the frame's own corners, so
          without it the end of the reveal is a wash with four dark triangles
          in it. The scale grows the box, the division keeps the aperture the
          same size on screen. */}
      <AbsoluteFill style={{ transform: `rotate(${tilt}deg) scale(${COVER})` }}>
        <AbsoluteFill
          style={{
            background: reveal,
            clipPath: `ellipse(${w / COVER}% ${h / COVER}% at 50% 50%)`,
          }}
        />
      </AbsoluteFill>

      {/* The rim, on the same numbers. A huge spread shadow is what puts an
          even glow all the way round an ellipse; a border cannot, because a
          border follows the box and this shape is a radius, not a box. */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: `rotate(${tilt}deg)`,
        }}
      >
        <div
          style={{
            width: `${w * 2}%`,
            height: `${h * 2}%`,
            borderRadius: "50%",
            boxShadow: `0 0 ${rim * 2}px ${rim}px ${rimColor}`,
            opacity: 1 - open * 0.35,
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SERIF,
          fontSize: `${size * 100}vh`,
          color,
          opacity: text,
          filter: `blur(${(1 - text) * 12}px)`,
        }}
      >
        {caption}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = LensReveal;

export const defaultProps: LensRevealProps = {
  caption: "whatever you want",
  reveal: `linear-gradient(150deg, ${GRADIENT[4]}, ${GRADIENT[2]} 60%, ${GRADIENT[0]})`,
  frames: 54,
  from: 0.06,
  to: 1.15,
  aspect: 0.62,
  tilt: -18,
  rim: 40,
  rimColor: "rgba(255,255,255,0.9)",
  captionAt: 34,
  captionFrames: 16,
  size: 0.055,
  color: PAPER,
  background: COCOA,
};
