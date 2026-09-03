import React from "react";
import { AbsoluteFill, Easing, Sequence, useCurrentFrame } from "remotion";

import { enter } from "../../lib/timing";

import meta from "./meta.json";

import * as wordCascade from "../../templates/word-cascade";
import * as cardStack from "../../templates/card-stack";
import * as wordSwap from "../../templates/word-swap";
import * as bokehOrbit from "../../templates/bokeh-orbit";
import * as textMarker from "../../templates/text-marker";
import * as pillExpand from "../../templates/pill-expand";
import * as countUp from "../../templates/count-up";
import * as orbBloom from "../../templates/orb-bloom";
import * as particleForm from "../../templates/particle-form";
import * as focusPull from "../../templates/focus-pull";
import * as depthFlythrough from "../../templates/depth-flythrough";
import * as lensReveal from "../../templates/lens-reveal";
import * as wordGrid from "../../templates/word-grid";
import * as logoOutro from "../../templates/logo-outro";

/*
 * Brand film: the fifteen templates cut back together into one continuous
 * piece. This folder is the reason the templates have the interface they have,
 * so it is worth saying what is and is not happening here.
 *
 * WHAT THIS FILE CONTAINS is a shot list and nothing else. No animation, no
 * easing, no colour, no copy. Every shot is a template with its own defaults;
 * the only thing the cut overrides is `durationInFrames` -- and, for the one
 * layered shot, the ground it must not repaint. That override is the whole
 * composability claim, made once and checkable:
 *
 *   - Inside a <Sequence>, `useVideoConfig().durationInFrames` still reports
 *     the FILM's length, not the shot's. A template that read it there would
 *     time itself against 1055 frames while occupying 84. `useDuration(prop)`
 *     is what makes the same file work in the studio on its own and in a cut.
 *   - The joins are the film's, not the templates'. Every template still opens
 *     settled and settles before its own last frame; where the source joins
 *     two shots with a cross-dissolve, the cut overlaps them by that many
 *     frames and fades the incoming one in over the outgoing one's own tail.
 *     No template knows it is being dissolved. Where the source cuts, so does
 *     this — the dissolve is never covering for a template that does not end.
 *   - Where the source holds two of these effects in one frame, the cut lays
 *     one over the other rather than playing them in turn. That costs the
 *     template on top one prop — a ground it can be told not to draw — and it
 *     is the only prop besides `durationInFrames` the cut sets. It is not a
 *     transition: both shots are whole, and both play their own clock.
 *
 * THE ONE THING HERE THAT IS NOT A SHOT is the fade up from black, below. It
 * is in this file because it belongs to the film and not to any template: the
 * reference opens on a black frame and rises into `word-cascade`'s ground, and
 * a template that faded up on its own could only ever be the first shot of a
 * cut. `mesh-gradient` is the template that is NOT in this cut, for the
 * matching reason -- it is a ground, and the reference never holds on a bare
 * one. It used to open the film for 72 frames, which put the brightest frame
 * of the whole piece where the source has its darkest, and it was the wrong
 * ground besides: `mesh-gradient` is fitted on f1172-f1280, the crimson second
 * half, while the opening's ground is `word-cascade`'s own cocoa radial. It is
 * still exercised everywhere the crimson shots draw it.
 *
 * THE ORDER IS THE SOURCE FILM'S OWN, by first reference frame — f14 through
 * f2052. The reference cuts to live footage and product UI between these, and
 * none of that is here, so this is the film's animated spine at 38.2s
 * against the original's 68.4s. It is not a frame-for-frame reproduction and
 * could not be; see ./README.md.
 *
 * THE COPY IS EACH TEMPLATE'S OWN DEFAULT, unchanged. That it reads as one
 * script — "You've got knowledge" / "people want" / "Your notes? -> Your
 * answers?" through to the outro — is not luck and not authored here: the
 * fifteen were written off one film, so their placeholder strings already
 * belong to one voice. Overriding them per shot would have hidden that.
 */

/**
 * What a shot needs from a template folder: the component and its defaults.
 * `Component` is typed `FC<never>` for the same reason `Root.tsx` types it
 * that way — fifteen different props types have nothing in common but this,
 * and `never` is the one thing assignable to all of them. It costs one cast at
 * the call site, below, because `FC<never>` cannot be written as JSX.
 */
type Asset = {
  Component: React.FC<never>;
  defaultProps: Record<string, unknown>;
};

/**
 * A shot: a template folder, how long it holds the screen, and how many of its
 * first frames overlap the previous shot's last — a cross-dissolve, the
 * incoming shot fading in over the outgoing one on the film's one curve (the
 * fade-up's ease-in-out cubic). 0, or left out, butts the two together.
 *
 * `layer` spends that same overlap differently: the shot arrives at full
 * opacity and with no ground of its own, so it composites ON TOP of the shot
 * underneath instead of replacing it. It is for the one place the source puts
 * two of our templates in the frame at the same time — see `focus-pull` in
 * the cut. It needs the template to accept a null ground; only `focus-pull`
 * does, because it is the only one that needs to.
 */
type Shot = [
  asset: Asset,
  frames: number,
  overlap?: number,
  layer?: boolean,
];

/**
 * The cut. Source order, by the first frame of each template's reference
 * range; the comment on each line is that range, so a shot can be checked
 * against the clip without opening its README.
 *
 * The lengths are the cut's, not the source's. Most of these shots are shorter
 * in the reference than the template that replicates them — `word-swap` is 15
 * frames there and needs about 31 to play its own head and tail — so a cut at
 * the source's lengths would truncate half the set. These are paced to let
 * each effect finish and to give the three long ones (`count-up`,
 * `depth-flythrough`, `logo-outro`) the room the reference gives them.
 *
 * The dissolves are the source's, measured as mean luma across each of its
 * joins — linear in a cross-fade's opacity, so the normalised luma IS the
 * curve — and fitted for length and easing; the fits are in ./README.md.
 * Where the source joins two of these shots directly the number is that
 * join's; where it cuts to footage between them, the nearest join of the
 * same kind:
 *
 *   card-stack -> word-swap          15  f140-f154, card-stack's own fade out
 *   bokeh-orbit -> text-marker       10  no join in the source; dark to bone
 *                                        is f1467-f1477
 *   count-up -> orb-bloom            10  f1274-f1283, the numeral defocuses out
 *   orb-bloom -> particle-form        8  f1336-f1344, ground to red, sphere out
 *   focus-pull -> depth-flythrough   10  f1467-f1477, into depth-flythrough
 *   depth-flythrough -> lens-reveal   9  f1586-f1595, out of depth-flythrough
 *   lens-reveal -> word-grid         15  f1776-f1795, footage into the crimson
 *
 * The other six joins stay cuts. pill-expand -> count-up is the source's one
 * hard cut (f1172, luma 238 -> 136; ours 240 -> 135), and the other five were
 * already continuous — under 9 luma of change across the seam, about what one
 * frame of `card-stack`'s push-in moves.
 */
const CUT: Shot[] = [
  [wordCascade, 90], //          f14-f38    "You've got knowledge"
  [cardStack, 95], //            f38-f80    "people want"
  [wordSwap, 66, 15], //         f213-f228  "Your notes?" -> "Your answers?"
  [bokehOrbit, 80], //           f268-f306  "Chaos"
  [textMarker, 78, 10], //       f1056-f1072
  [pillExpand, 84], //           f1088-f1150  same paragraph, now behind a card
  [countUp, 92], //              f1172-f1280  74% -> 100%
  [orbBloom, 84, 10], //         f1283-f1340  "piece by piece"
  [particleForm, 80, 8], //      f1341-f1400  the figure, under the type
  // Not a cut but a layer: in the source the figure and this type block share
  // the frame, and both templates say so in their own headers -- "beside the
  // type", "beside the particle figure". Cut in sequence they never met: at
  // our f690 the right of the frame was empty and at f760 the left was, where
  // the reference's f1380 carries 3.77% ink on the left and 5.78% on the right
  // at once.
  //
  // They also start together, four frames apart, rather than one landing
  // before the other begins. Excess light over each box's own median, as a
  // fraction of its final: the figure is 0.00 at f1341 and climbs from f1342,
  // the type is 0.00 through f1344 and climbs from f1345. `particle-form`
  // starts its dots at frame 4 of its own run, so an overlap of 72 out of 80
  // starts this one at frame 8 -- four frames later, and the two then run out
  // together at frame 80. The type is gone by frame 66 of its own run, so the
  // last six frames of the shot are the figure alone, which is what the next
  // dissolve lands on.
  [focusPull, 72, 72, true], //  f1345-f1400  "Your digital mind / is born"
  [depthFlythrough, 105, 10], // f1476-f1595
  [lensReveal, 84, 9], //        f1640-f1700  "whatever you want"
  [wordGrid, 84, 15], //         f1875-f1920  "everything"
  [logoOutro, 110], //           f1930-f2052
];

/**
 * Running start frames. Derived rather than written down: a hand-kept `from`
 * column is one edit away from a one-frame overlap or a one-frame hole, and
 * neither is visible in a still. A dissolve is the one overlap that is meant:
 * the next shot starts that many frames before this one ends.
 */
const starts = CUT.reduce<number[]>(
  (at, [, frames], i) => [...at, at[i] + frames - (CUT[i + 1]?.[2] ?? 0)],
  [0],
);

/** What `meta.json` has to say, computed from the same array. */
export const LENGTH = starts[starts.length - 1];

// The sidecar is a static file and the cut is an array, so they drift the
// first time a shot is retimed — and a film one frame too short loses its last
// frame silently, while one too long holds a frozen tail. Cheaper to fail here.
if (meta.durationInFrames !== LENGTH) {
  throw new Error(
    `brand-film/meta.json says durationInFrames ${meta.durationInFrames}, ` +
      `but the cut adds up to ${LENGTH}. Update the sidecar.`,
  );
}

/**
 * The fade up from black. Mean luma of the reference's opening, over the
 * settled ground at f24: 0.00 / 0.10 / 0.41 / 0.85 / 1.00 at f0, f6, f12, f18
 * and f24. An ease-in-out cubic over 24 frames gives 0.00 / 0.06 / 0.50 /
 * 0.94 / 1.00, worst gap 0.09.
 */
const FADE = 24;

const OpenFromBlack: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame >= FADE) return null;
  return (
    <AbsoluteFill
      style={{
        background: "#000",
        opacity: 1 - enter(frame, 0, FADE, Easing.inOut(Easing.cubic)),
      }}
    />
  );
};

export const BrandFilm: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {CUT.map(([{ Component, defaultProps }, frames, overlap = 0, layer], i) => {
        const Shot = Component as React.FC<Record<string, unknown>>;
        return (
          <Sequence key={i} from={starts[i]} durationInFrames={frames}>
            <AbsoluteFill
              style={{
                // A later shot is later in the DOM, so the incoming one is on
                // top and fades in over the outgoing one's tail. A layered
                // shot is on top too, but arrives whole.
                opacity:
                  overlap && !layer
                    ? enter(
                        frame,
                        starts[i],
                        overlap,
                        Easing.inOut(Easing.cubic),
                      )
                    : 1,
              }}
            >
              <Shot
                {...defaultProps}
                durationInFrames={frames}
                {...(layer ? { gradient: null } : {})}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
      <OpenFromBlack />
    </>
  );
};

export { meta };
export const Component = BrandFilm;
