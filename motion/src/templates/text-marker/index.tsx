import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BONE, INK, ORANGE } from "../../lib/palette";
import { SANS } from "../../lib/fonts";
import { enter, useDuration } from "../../lib/timing";

/*
 * Text marker: a highlight or a strike-through wiping across one run of a
 * paragraph, left to right, the way a person draws it.
 *
 * Measured off the reference at f1056-f1072 — a sliver at the left of the run
 * on f1056, the full run covered by f1072. **16 frames**, and the run stays
 * marked afterwards. The two variants are the same wipe with a different box
 * height and vertical placement, which is why they are one template: swapping
 * `variant` is a one-word edit, and having built both you would only ever
 * change them together.
 *
 * The wipe is a scaleX from the left edge, not a width animation: a width
 * animation reflows the paragraph on every frame, and at 30fps you can see the
 * text under it twitch.
 */

export type TextMarkerProps = {
  durationInFrames?: number;
  /** newlines are hard line breaks */
  text: string;
  /** the run to mark; must appear in `text` verbatim */
  mark: string;
  variant: "highlight" | "strike";
  /** frame the wipe starts */
  at: number;
  /** frames the wipe takes. 16 in the reference. */
  frames: number;
  markColor: string;
  /** the run's own colour once marked; "" leaves it alone */
  markTextColor: string;
  size: number;
  color: string;
  background: string;
};

export const TextMarker: React.FC<TextMarkerProps> = ({
  durationInFrames,
  text,
  mark,
  variant,
  at,
  frames,
  markColor,
  markTextColor,
  size,
  color,
  background,
}) => {
  const frame = useCurrentFrame();
  useDuration(durationInFrames);
  const wipe = enter(frame, at, frames);

  return (
    <AbsoluteFill
      style={{
        background,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: SANS,
        color,
      }}
    >
      <div
        style={{
          fontSize: `${size * 100}vh`,
          lineHeight: 1.5,
          textAlign: "center",
          maxWidth: "62%",
          fontWeight: 400,
          letterSpacing: "-0.01em",
        }}
      >
        {text.split("\n").map((line, l) => (
          <div key={l}>
            {/* Split on the run so it can be its own positioned box. The run
                keeps flowing inline, so the paragraph wraps exactly as it would
                without a mark on it. */}
            {line.split(mark).map((plain, i) => (
              <React.Fragment key={i}>
                {i > 0 ? (
                  // position+zIndex, not position alone: the highlight box sits
                  // at z -1 so the run reads over it, and a bare `relative`
                  // opens no stacking context to hold it — it would fall behind
                  // the page and disappear.
                  <span style={{ position: "relative", zIndex: 0 }}>
                    <span
                      style={{
                        position: "absolute",
                        left: "-0.12em",
                        right: "-0.12em",
                        ...(variant === "highlight"
                          ? { top: "-0.06em", bottom: "-0.06em" }
                          : {
                              top: "50%",
                              height: "0.075em",
                              marginTop: "-0.037em",
                            }),
                        background: markColor,
                        borderRadius: variant === "highlight" ? "0.12em" : 0,
                        transform: `scaleX(${wipe})`,
                        transformOrigin: "left center",
                        zIndex: variant === "highlight" ? -1 : 1,
                      }}
                    />
                    {mark}
                    {/* The marked run recolours WITH the wipe rather than at
                        the end of it: a second copy of the same text in the mark
                        colour, clipped to exactly the box that has been drawn so
                        far. Overlaid rather than swapped, so the two can never
                        disagree about where the words are. */}
                    {markTextColor ? (
                      <span
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          whiteSpace: "pre",
                          color: markTextColor,
                          clipPath: `inset(-0.5em ${(1 - wipe) * 100}% -0.5em -0.2em)`,
                        }}
                      >
                        {mark}
                      </span>
                    ) : null}
                  </span>
                ) : null}
                {plain}
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export { default as meta } from "./meta.json";
export const Component = TextMarker;

export const defaultProps: TextMarkerProps = {
  text:
    "I love that finance is a mirror.\n" +
    "It reflects human behavior, fear, greed, discipline,\n" +
    "all in real time. Mastering it isn't just about money,\n" +
    "it's about mastering yourself.",
  mark: "it's about mastering yourself",
  variant: "highlight",
  at: 12,
  frames: 16,
  markColor: "#f6c0a6",
  markTextColor: ORANGE,
  size: 0.038,
  color: INK,
  background: BONE,
};
