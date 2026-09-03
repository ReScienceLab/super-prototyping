import React from "react";
import { Sequence } from "remotion";

import meta from "./meta.json";

import * as meshGradient from "../../templates/mesh-gradient";
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
 * the only thing the cut overrides is `durationInFrames`, and that one
 * override is the whole composability claim, made once and checkable:
 *
 *   - Inside a <Sequence>, `useVideoConfig().durationInFrames` still reports
 *     the FILM's length, not the shot's. A template that read it there would
 *     time itself against 1296 frames while occupying 84. `useDuration(prop)`
 *     is what makes the same file work in the studio on its own and in a cut.
 *   - Nothing dissolves. Every template settles well before its own last frame
 *     and opens on a settled state, so shots butt straight against each other
 *     with nothing hiding the seam. A cross-fade here would be covering for a
 *     template that does not end, and none of them need it.
 *
 * THE ORDER IS THE SOURCE FILM'S OWN, by first reference frame — f14 through
 * f2052. The reference cuts to live footage and product UI between these, and
 * none of that is here, so this is the film's animated spine at about 43s
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

/** A shot: a template folder and how long it holds the screen. */
type Shot = [asset: Asset, frames: number];

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
 */
const CUT: Shot[] = [
  [meshGradient, 72], //     the ground, before anything is on it
  [wordCascade, 90], //      f14-f38    "You've got knowledge"
  [cardStack, 95], //        f38-f80    "people want"
  [wordSwap, 66], //         f213-f228  "Your notes?" -> "Your answers?"
  [bokehOrbit, 80], //       f268-f306  "Chaos"
  [textMarker, 78], //       f1056-f1072
  [pillExpand, 84], //       f1088-f1150  same paragraph, now behind a card
  [countUp, 92], //          f1172-f1280  74% -> 100%
  [orbBloom, 84], //         f1283-f1340  "piece by piece"
  [particleForm, 100], //    f1352-f1400
  [focusPull, 72], //        f1372-f1400  "Your digital mind / is born"
  [depthFlythrough, 105], // f1476-f1595
  [lensReveal, 84], //       f1640-f1700  "whatever you want"
  [wordGrid, 84], //         f1875-f1920  "everything"
  [logoOutro, 110], //       f1930-f2052
];

/**
 * Running start frames. Derived rather than written down: a hand-kept `from`
 * column is one edit away from a one-frame overlap or a one-frame hole, and
 * neither is visible in a still.
 */
const starts = CUT.reduce<number[]>(
  (at, [, frames], i) => [...at, at[i] + frames],
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

export const BrandFilm: React.FC = () => (
  <>
    {CUT.map(([{ Component, defaultProps }, frames], i) => {
      const Shot = Component as React.FC<Record<string, unknown>>;
      return (
        <Sequence key={i} from={starts[i]} durationInFrames={frames}>
          <Shot {...defaultProps} durationInFrames={frames} />
        </Sequence>
      );
    })}
  </>
);

export { meta };
export const Component = BrandFilm;
