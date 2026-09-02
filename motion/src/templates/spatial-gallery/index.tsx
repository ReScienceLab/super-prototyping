import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { type Motion, REFERENCE_MOTION, travel } from "./motion";

/*
 * Spatial gallery: photo cards on a HELIX around a vertical axis, camera
 * outside. The near side reads as a convex cylinder (frontal card largest and
 * brightest, neighbours yaw away). The rise per card is what tilts the pan
 * axis below horizontal; it also puts the far side of the helix half a turn
 * up and half a turn down, where it shows through as the dim, half-scale rows
 * above and below the near row, moving the opposite way. Flicking the wall
 * screws the helix past the camera.
 *
 * Every number below is a pure function of the frame. No transitions, no
 * timers, no randomness.
 */

export type Card = {
  /** image URL (absolute, or a staticFile()) */
  src?: string;
  /** CSS background used when there is no src */
  background?: string;
};

export type SpatialGalleryProps = {
  cards: Card[];
  /** flick schedule; px along the pan axis, measured at the frontal card */
  motion: Motion;
  /** pan axis, degrees below horizontal */
  tiltDeg: number;
  cardWidth: number;
  cardHeight: number;
  cornerRadius: number;
  /** centre-to-centre distance between neighbouring cards along the helix */
  pitch: number;
  /** helix radius; cards per turn = 2*pi*radius / pitch */
  radius: number;
  /** camera distance to the frontal card (CSS perspective) */
  perspective: number;
  /** brightness = (perspective / distance-to-camera) ^ falloff */
  falloff: number;
  /** peak opacity of the grazing-angle sheen */
  sheen: number;
  /** drop shadow opacity */
  shadow: number;
  background: string;
};

const RAD = Math.PI / 180;
const TWO_PI = Math.PI * 2;

/** wrap to (-pi, pi] */
const wrap = (a: number) => a - TWO_PI * Math.round(a / TWO_PI);

export const SpatialGallery: React.FC<SpatialGalleryProps> = ({
  cards,
  motion,
  tiltDeg,
  cardWidth,
  cardHeight,
  cornerRadius,
  pitch,
  radius,
  perspective,
  falloff,
  sheen,
  shadow,
  background,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const tan = Math.tan(tiltDeg * RAD);
  const cos = Math.cos(tiltDeg * RAD);
  const alpha = pitch / radius; // helix angle per card
  const rise = radius * tan; // helix rise per radian

  // helix angle the frontal card has scrolled through, now and at the end
  const theta = (travel(motion, frame) * cos) / radius;
  const thetaEnd = (travel(motion, durationInFrames) * cos) / radius;

  // cards whose angle can land within a full turn of the front at any time
  const first = Math.floor((-TWO_PI - thetaEnd) / alpha);
  const last = Math.ceil(TWO_PI / alpha);

  const items: React.ReactNode[] = [];
  for (let i = first; i <= last; i++) {
    const phi = i * alpha + theta; // angle from the frontal position, +x right; grows as content pans right
    if (Math.abs(phi) > TWO_PI) continue;

    const x = radius * Math.sin(phi);
    const y = phi * rise; // helix: right of centre is lower
    const z = radius * (Math.cos(phi) - 1); // 0 at the front, -2R at the back

    // face outward on the near side, inward on the far side, so the
    // artwork always looks at the camera (a real double-sided card would)
    const w = wrap(phi);
    const yaw = Math.abs(w) <= Math.PI / 2 ? w : wrap(w + Math.PI);

    const dist = Math.hypot(x, y, perspective - z);
    const brightness = Math.pow(perspective / dist, falloff);
    const grazing = Math.abs(Math.sin(yaw));
    const band = 50 - 30 * Math.sin(yaw); // reflection slides with the yaw

    const card = cards[((i % cards.length) + cards.length) % cards.length];

    items.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: cardWidth,
          height: cardHeight,
          marginLeft: -cardWidth / 2,
          marginTop: -cardHeight / 2,
          borderRadius: cornerRadius,
          overflow: "hidden",
          transform: `translate3d(${x}px, ${y}px, ${z}px) rotateY(${yaw}rad)`,
          boxShadow: `0 ${cardHeight * 0.08}px ${cardHeight * 0.2}px rgba(0,0,0,${shadow})`,
          background: card.background ?? "#333",
        }}
      >
        {card.src ? (
          <Img
            src={card.src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#000",
            opacity: 1 - brightness,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: sheen * grazing,
            background: `linear-gradient(110deg, transparent ${band - 36}%, rgba(255,255,255,0.7) ${band - 6}%, rgba(255,255,255,0.4) ${band + 6}%, transparent ${band + 34}%)`,
          }}
        />
      </div>,
    );
  }

  return (
    <AbsoluteFill
      style={{ background, perspective, perspectiveOrigin: "50% 50%" }}
    >
      <AbsoluteFill style={{ transformStyle: "preserve-3d" }}>
        {items}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * Real photographs from the repo's apple-photos artboard, so the template
 * demonstrates itself on actual images. Card i sits at helix index i, so the
 * list runs left-to-right along the pan direction: cards[1] is to the right of
 * cards[0] at frame 0, cards[n-1] to its left.
 *
 * Swap this out via the `cards` prop; each entry is {src} or {background}.
 */
const photo = (f: string): Card => ({
  src: staticFile(`canvases/apple-photos/assets/photos/${f}`),
});

export const DEFAULT_CARDS: Card[] = [
  photo("01-minerva-1.jpg"),
  photo("02-beach-1.jpg"),
  photo("11-food-1.jpg"),
  photo("06-minerva-2.jpg"),
  photo("05-ice-cream-1.jpg"),
  photo("07-perigueux-1.jpg"),
  photo("03-beach-2.jpg"),
  photo("09-ice-cream-3.jpg"),
  photo("08-perigueux-2.jpg"),
  photo("04-beach-3.jpg"),
  photo("10-ice-cream-2.jpg"),
];

// The asset contract, read by src/Root.tsx: Component, meta, defaultProps.
export { default as meta } from "./meta.json";
export const Component = SpatialGallery;

export const defaultProps: SpatialGalleryProps = {
  cards: DEFAULT_CARDS,
  motion: REFERENCE_MOTION,
  tiltDeg: 19.7,
  cardWidth: 205,
  cardHeight: 260,
  cornerRadius: 15,
  pitch: 214,
  radius: 409,
  perspective: 920,
  falloff: 2,
  sheen: 0.5,
  shadow: 0.7,
  background: "#000",
};
