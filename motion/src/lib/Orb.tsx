import React from "react";
import { GRADIENT, ORANGE } from "./palette";

/**
 * The film's sphere: a soft warm orb, lit from the upper left, with no hard
 * edge anywhere on it. It shows up in three shots — blooming on its own behind
 * a line of chips, orbiting in a defocused ring, and queued up receding into
 * depth — so it lives here rather than in whichever template got written first.
 *
 * Drawn as a radial gradient on a round div rather than as an SVG or a canvas:
 * the highlight, the body and the dark rim are three stops, and a `filter:
 * blur()` on top of that is what the out-of-focus copies need anyway.
 */

export type OrbProps = {
  /** diameter in px */
  size: number;
  /** px of defocus */
  blur?: number;
  opacity?: number;
  /** where the specular sits, as a fraction of the diameter */
  lightX?: number;
  lightY?: number;
  style?: React.CSSProperties;
};

export const Orb: React.FC<OrbProps> = ({
  size,
  blur = 0,
  opacity = 1,
  lightX = 0.36,
  lightY = 0.3,
  style,
}) => (
  <div
    style={{
      width: size,
      height: size,
      // An orb is a circle in every shot that uses one, and a bare width/height
      // does not survive being a flex item next to something wide — it shrinks
      // on the cross axis and the sphere comes out an egg.
      flex: "none",
      borderRadius: "50%",
      background:
        `radial-gradient(circle at ${lightX * 100}% ${lightY * 100}%, ` +
        `${GRADIENT[7]} 0%, ${GRADIENT[5]} 22%, ${ORANGE} 55%, ` +
        `${GRADIENT[0]} 100%)`,
      filter: blur ? `blur(${blur}px)` : undefined,
      opacity,
      ...style,
    }}
  />
);
