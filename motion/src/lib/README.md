# src/lib

Shared by the fifteen templates in the Delphi set. Deliberately **outside** the
`require.context` pattern in `src/Root.tsx`
(`/^(?:\.\/)?(?:templates|films)\/[^/]+\/index\.tsx$/`), so a module in here
never turns into an empty entry in the studio sidebar.

| file          | what                                                             |
|---------------|------------------------------------------------------------------|
| `palette.ts`  | the reference film's colours, each with the frame it came off     |
| `fonts.ts`    | the two faces, and the substitution note                          |
| `timing.ts`   | `useDuration`, `enter`, `leave`, `arrive`, `stagger`              |
| `Gradient.tsx`| the warm ground: `MESH` with its band, `DIM` without one          |
| `Orb.tsx`     | the film's soft warm sphere                                       |

## The reference

Everything here was measured off `7481_0.mp4`, a 2880x1620 / 30 fps / 2052
frame (68.4 s) brand film. The clip is **not committed** — the repo `.gitignore`
allowlists what may enter `reference/`, and a third-party finished film is not
on it. What is committed is the numbers taken off it, and every one of them can
be reproduced from a local copy:

    python3 tools/motionkit.py sheet   7481_0.mp4 sheet.png --from 1140 --to 1320
    python3 tools/motionkit.py swatch  7481_0.mp4 1180 --grid 16x9
    python3 tools/motionkit.py swatch  7481_0.mp4 2040 --crop 600:130:1150:880

The templates are 1920x1080, which is the source at exactly 2/3, so a pixel
measurement off the clip is a template pixel times 1.5.

### What is reproduced, and what is not

The **motion** is reproduced: timings, easings, geometry, palette, type scale.
The film's **wordmark and its ad copy are not**. Templates carry this repo's own
placeholder strings, and `logo-outro` sets the mark to "Motion". That is partly
a rights line and partly the point of the exercise — a template with someone
else's copy baked into it is a screenshot, not a template.

The display face is substituted for the same reason; `fonts.ts` says which face
and why.

## Composability

This set exists to be cut together, so every template follows one interface:

- **`durationInFrames` is a prop**, never read from `useVideoConfig`. Inside a
  `<Sequence>`, `useVideoConfig().durationInFrames` still reports the
  *composition's* length, so a template that trusts it stretches wrong the
  moment it is placed in a cut. `useDuration(override?)` takes the prop and
  falls back to the composition, which keeps the template scrubbable on its own
  in the studio.
- **Clean head and tail.** A template is fully settled well before its last
  frame, and starts from nothing on frame 0, so two of them can butt up against
  each other without a hold or a fade to hide the seam.
- **Every drawn value is a pure function of `useCurrentFrame()`.** No CSS
  transitions or keyframes, no `requestAnimationFrame`, no timers, no unseeded
  `Math.random()` — Remotion renders frames statelessly and out of order across
  workers, and any of those makes two workers disagree. Where a template needs
  scatter it uses `random(seed)` from `remotion`.
- **One `index.tsx` exporting exactly `Component`, `meta`, `defaultProps`**, and
  a `meta.json` sidecar next to it because rspack (compositions) and Vite (the
  canvas) both have to read it.
