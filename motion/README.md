# Motion

One subfolder per asset. Drop a folder into `motion/src/templates/<slug>/` or
`motion/src/films/<slug>/`, no code change needed anywhere:

- Each folder becomes one Remotion composition, its id the folder name.
- Discovery lives in `src/Root.tsx` (`require.context`). There is no registry.
- `npx remotion studio` scrubs them all; `npx remotion render <slug> <path>`
  exports one.

This is the video half of what `canvas/` does for the artboards, and it reads
the same source: `remotion.config.ts` points the public dir at `../mockups`, so
a composition reaches a board with `staticFile("canvases/luma-ios/01-guest-top.html")`
and a photo with `staticFile("canvases/apple-photos/assets/photos/01-minerva-1.jpg")`.
That is why `motion/` is a sibling of `mockups/` and not a folder inside it:
motion consumes mockups.

## The two buckets

|              | `templates/`                         | `films/`                          |
|--------------|--------------------------------------|-----------------------------------|
| what it is   | a reusable motion effect             | one finished cut for one product  |
| content      | comes in as props                    | baked in                          |
| grows by     | accumulating effects                 | accumulating launches             |
| example      | `spatial-gallery`                    | none yet                          |

A template is the thing worth having a library of: it takes `cards`, `motion`,
geometry, and does not care whose photos those are. A film picks a template (or
writes its own scene), points it at one product's boards, and is done. The split
mirrors `mockups/canvases/templates/` against a real board folder.

## What an asset folder holds

```
motion/src/templates/spatial-gallery/
  index.tsx        Component, meta, defaultProps  <- the whole contract
  meta.json        fps, width, height, durationInFrames
  motion.ts        supporting modules, as many as it needs
  README.md        what it replicates, the numbers it hits, deviations
  out/<slug>.mp4   the render, committed
  reference/       the evidence: BRIEF.md, motion.txt, flow.py
```

`index.tsx` exports exactly three things:

```tsx
export { default as meta } from "./meta.json";
export const Component = SpatialGallery;
export const defaultProps: SpatialGalleryProps = { ... };  // templates only
```

`meta.json` is a JSON sidecar rather than a field in the TSX so that two
different bundlers can both read it: rspack builds the compositions, and Vite
builds the canvas, which needs the box to size the preview. `motionkit probe`
prints it in exactly this shape.

## Rendering

```bash
cd motion
npx remotion studio                                              # scrub everything
npx remotion render spatial-gallery src/templates/spatial-gallery/out/spatial-gallery.mp4
```

The mp4 in `out/` is committed. It is the only way to see an asset without
running the project, it is what the canvas plays, and it is what makes a diff
reviewable. Re-render it whenever the composition changes; a stale render is
worse than none.

## Every timing traces to a measurement

The repo's rule for artboards — *every colour and every metric traces to a
measurement* — applies here to time. A duration, an easing curve or a friction
constant that "feels about right" is how a replica quietly stops being one.

`tools/motionkit.py` is the motion half of `refkit.py`:

```bash
python3 tools/motionkit.py probe ref.mp4                    # the four meta.json numbers
python3 tools/motionkit.py flow ref.mp4 --out motion.txt    # per-frame px/frame, pan axis
python3 tools/motionkit.py sheet ref.mp4 --out sheet.png    # labelled contact sheet
python3 tools/motionkit.py compare ref.mp4 out/x.mp4        # side by side, one clip
python3 tools/motionkit.py selftest
```

`flow` is the one that earns its keep: it separates a continuous pan from a
flick-and-coast, and reads friction off the decay. `spatial-gallery` looks like
a slow camera move and is in fact two momentum flicks with a dead hold between
them, which is a thing you measure, not a thing you notice.

An asset's `reference/` keeps that evidence next to the code: **the measurements
are committed, the third-party clip they came from is not** — the same split
`.gitignore` already makes for `ref-*.html` boards.

## Determinism

Remotion renders frames statelessly and out of order across parallel workers.
Every value a composition draws must be a pure function of `useCurrentFrame()`:
no CSS transitions or keyframes, no `requestAnimationFrame`, no timers, no
unseeded random. A frame that depends on the frame before it will render
differently depending on which worker got it.

## On the canvas

Rendered assets appear on the canvas's **Motion** page, films then templates,
each playing in a loop at 478pt wide — the artboards' own column pitch, so a
video lines up with the boards it was made from. Deep-link it with
`?canvas=motion`. An asset that has never been rendered is not there; the canvas
plays mp4s, not compositions. See `canvas/src/motionLibrary.ts`.
