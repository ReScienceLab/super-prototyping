# A board that moves is a CSS timeline, checked by freezing it

2026-09-10. The first animated board: `notion-ios/19-purchase-sheet-motion`, which plays boards
16 → 17 → 18 → 16 as a ten-second loop. The ask was to use an open-source animation library;
this note is why the library is a CSS one and how the board is checked.

## Why not Motion, GSAP or anime.js

The canvas renders every board in `<iframe srcDoc sandbox="">`. An empty `sandbox` runs no
script, and that is the property the canvas relies on: boards are third-party-shaped HTML with
megabytes of inlined data, and the inspector reads them in a *separate* `allow-scripts` frame
precisely so the boards themselves never execute (`2026-09-07-inspector-panel-feasibility.md`).
A JavaScript animation library would play when the file is opened on its own and stand still on
the canvas, which is where the board is looked at. Loosening the sandbox for one board is a
security decision about every board, and not one an animation should make.

So the timeline is CSS animations. What the libraries would have given -- a timeline in
seconds, easings by name, springs -- comes from two things:

- **Open Props** (open-props.style, v1.7.23, MIT) for the easings and the `spin` keyframes,
  copied verbatim into a block on `.phone` and named in `gen.py` as `OPEN_PROPS`. Its springs
  are `linear()` easings, which is the one curve a hand-written `cubic-bezier` cannot express,
  and the alert's entrance uses one.
- `kf()` in `gen.py`, which turns `(seconds, declarations[, easing])` steps into a `@keyframes`
  block. Every element animates over the same `T` with `infinite`, so they share one clock;
  a value held between two steps is written at both; the first step is at 0 and the last at
  `T`, so the loop closes on the resting board.

## The rules that came out of it

- **0% is the resting board.** Every keyframe starts at the state of the static board the loop
  rests on (16 here), and the element's base styles are that state too. `prefers-reduced-motion:
  reduce` drops the animations and the board is 16, not a half state.
- **Reuse the static boards' markup.** The motion board is `paywall()` with every state's
  element present and hidden by opacity, so a measured value moves the static boards and the
  loop together. A state that no capture shows is not in the loop: the selection goes back to
  monthly before the purchase because capture 18 shows it that way.
- **Check it by freezing it.** `animation-play-state: paused` with a negative `animation-delay`
  on every element holds the board at one instant; `refkit shoot` that copy and `refkit diff`
  the frame against the static board it should equal. The held states of 19 read 0.03, 0.11,
  0.10 and 0.23 against 16, 17, 16 and 18. What the diff cannot check is the motion between
  them; a strip of frozen in-between frames is what a reviewer looks at for that.
- Fixed-size stacks for a label that changes: the button holds both labels and the spinner
  as absolutely positioned spans and cross-fades them, so the button's own box is what
  animates (its height), never its text flow.

## Not done

- Nothing in the canvas knows a board moves. Its caption and status tab are the layout's; the
  loop simply runs, in every mounted iframe, all the time. Twenty of these on one page would
  be worth measuring before it is a pattern.
- The timings are chosen to read, not measured: the captures are stills, and a real StoreKit
  sheet's durations are not in them.
