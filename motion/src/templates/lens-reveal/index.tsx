import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { COCOA } from "../../lib/palette";
import { SERIF } from "../../lib/fonts";
import { arrive, enter, useDuration } from "../../lib/timing";

/*
 * Lens reveal: a tall oval aperture with a soft white rim pops open in the
 * middle of the frame, turns as it grows, and swallows the frame in seven
 * frames. A caption then lands inside it a word at a time.
 *
 * Reference: f1632-1700. Off the largest bright connected component per frame
 * (rim luminance > 250) and the f1635-1638 crops:
 *
 *   - Seven frames, f1632-1638, each about x1.4-1.6 the last: the outer
 *     semi-axis is 0.19 / 0.26 / 0.33 / 0.48 of the frame height at
 *     f1634-1637. A geometric ramp that quickens, not an ease.
 *   - The oval is portrait, height/width 1.57 (f1634: 0.377 x 0.243; f1635:
 *     0.523 x 0.332), and it TURNS as it opens: upright at f1634, top leaning
 *     right about 25 deg at f1636, 40 at f1637, 55 at f1638.
 *   - The rim is a soft white band about 0.15 of the oval's width, hard on the
 *     inside and feathered outward, #fefefe at its brightest (f1636).
 *   - The caption is one line, 0.281 of the frame wide at f1685, its three
 *     words landing at f1639 / f1641 / f1645.
 *
 * The rim is the reason this is not just a `clip-path` animation. The aperture
 * is drawn twice: a blurred white oval one rim wider than it, underneath, and
 * the same ellipse as a `clipPath` on the content layer on top, whose hard
 * edge covers the inner half of the blur (hard inside, feathered outward,
 * which is the rim's profile). Both take the same radii, so the rim can never
 * drift off the edge it is supposed to be tracing.
 */

/** The revealed layer is a square the size of the frame diagonal, so no tilt
 * can expose a corner of it. */
const D = Math.hypot(1920, 1080);

export type LensRevealProps = {
  durationInFrames?: number;
  caption: string;
  /** what the lens opens onto; a solid or any CSS background value */
  reveal: string;
  /** frame the aperture pops in */
  at: number;
  /** frames it takes to run off every edge */
  frames: number;
  /** aperture half-width when it pops in, as a fraction of the frame width */
  from: number;
  /** aperture half-width once open; past 0.574 it is off every corner */
  to: number;
  /** height / width of the oval */
  aspect: number;
  /** degrees the oval has turned, top to the right, by the time it is open */
  tilt: number;
  /** rim thickness as a fraction of the oval's width */
  rim: number;
  rimColor: string;
  /** frame the caption's first word lands */
  captionAt: number;
  /** frames between words */
  wordStep: number;
  /** frames a word takes to land */
  wordFrames: number;
  size: number;
  color: string;
  background: string;
};

export const LensReveal: React.FC<LensRevealProps> = ({
  durationInFrames,
  caption,
  reveal,
  at,
  frames,
  from,
  to,
  aspect,
  tilt,
  rim,
  rimColor,
  captionAt,
  wordStep,
  wordFrames,
  size,
  color,
  background,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);

  // Geometric in size, and quickening: f1634-1638 step x1.37 / 1.27 / 1.45 /
  // 1.46 / 1.57. A constant ratio lands 30% too big mid-reveal; t^1.5 on the
  // exponent is within 20% at every measured frame and still covers at the end.
  const open = enter(frame, at, frames, Easing.poly(1.5));
  const rx = from * Math.pow(to / from, open) * 1920;
  const ry = rx * aspect;
  const turn = tilt * open;
  const rimPx = rx * 2 * rim;
  const words = caption.split(" ");
  const centred: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: `translate(-50%, -50%) rotate(${turn}deg)`,
  };

  return (
    <AbsoluteFill style={{ background, overflow: "hidden" }}>
      {frame >= at ? (
        <>
          {/* The rim: a solid oval one rim wider than the aperture, blurred,
              under the reveal. The reveal's hard edge covers the inner half
              of the feather, which is the rim's profile: hard inside,
              feathered out. (A `box-shadow` spread would be the obvious way
              and is what this was; Chrome tiles a shadow blurred by hundreds
              of px into a visible checkerboard.) Not drawn once its inner
              edge is past every corner. */}
          {rx < D / 2 ? (
            <div
              style={{
                ...centred,
                width: (rx + rimPx) * 2,
                height: (ry + rimPx) * 2,
                borderRadius: "50%",
                background: rimColor,
                filter: `blur(${rimPx * 0.75}px)`,
              }}
            />
          ) : null}

          {/* The revealed layer, clipped to the aperture. `rotate` on the
              layer rather than inside `ellipse()`, which takes no angle. */}
          <div
            style={{
              ...centred,
              width: D,
              height: D,
              background: reveal,
              clipPath: `ellipse(${rx}px ${ry}px at 50% 50%)`,
            }}
          />
        </>
      ) : null}

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SERIF,
          fontSize: `${size * 100}vh`,
          whiteSpace: "nowrap",
          color,
        }}
      >
        <div>
          {words.map((word, i) => (
            <React.Fragment key={i}>
              {i ? " " : null}
              <span
                style={{
                  display: "inline-block",
                  ...arrive(
                    enter(frame, captionAt + i * wordStep, wordFrames),
                    12,
                    8,
                  ),
                }}
              >
                {word}
              </span>
            </React.Fragment>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = LensReveal;

export const defaultProps: LensRevealProps = {
  caption: "whatever you want",
  // Stand-in for the footage the lens opens onto, sampled where the caption
  // is settled and the cut is measured, f1685: centre #dfa49d, the top
  // corners #d9bab2 / #f2dfd6, the bottom ones #d88171 / #de8d79. The footage
  // is brown before that (mean #745036 at f1645, #90592f at f1660) and goes
  // pink between f1670 and f1685; a static stand-in can be one or the other.
  reveal: "linear-gradient(180deg, #e5ccc4, #dfa49d 45%, #db8775)",
  // f1685 is frame 59 of this shot in the cut, which puts f1632 at 6.
  at: 6,
  frames: 7,
  // Semi-major 0.097 of the frame height at f1632 (0.19 at f1634, two x1.4
  // steps later), so semi-minor 0.062 of the height, 0.035 of the width.
  from: 0.035,
  // Past every corner: the half-diagonal is 0.574 of the width.
  to: 0.62,
  aspect: 1.57,
  tilt: 60,
  rim: 0.15,
  rimColor: "#fefefe",
  captionAt: 13,
  wordStep: 3,
  wordFrames: 4,
  // 0.271 of the frame wide at f1685 (extent, both clips at 1920); 0.085
  // rendered 0.295. Height is not matched: the reference line is 0.035 tall
  // for that width and this face is 0.067, see the README.
  size: 0.078,
  // The caption's core at f1685 is #f5c4c5 on a #e4aba5 ground: pale pink,
  // not paper. It is not white at some opacity either; the channels would
  // need three different alphas (0.63 / 0.31 / 0.37).
  color: "#f5c4c5",
  // The dark ground has a floor glow, brightest at bottom centre and flat above
  // y 0.6. Column means at f1630, x 0.30-0.40 (the centre column carries the
  // previous shot's text), y 0.995 / 0.924 / 0.852 / 0.78 / 0.708 / 0.60, and
  // #997656 at the bottom corners, which puts the horizontal radius at 1.04
  // widths. Same profile at f1626 and outside the oval at f1634.
  background:
    "radial-gradient(ellipse 104% 37% at 50% 100%, #deab7d, #c79870 20%, " +
    `#a07a58 40%, #6c5036 60%, #402b18 80%, ${COCOA})`,
};
