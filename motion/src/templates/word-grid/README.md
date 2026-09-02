# word-grid

One word tiled across the frame, the cells lighting up in a scattered order
rather than a sweep.

1920x1080, 30 fps, 90 frames.

    npx remotion render word-grid src/templates/word-grid/out/word-grid.mp4

## Reference

f1875-f1920, "everything" set italic on the gradient, low contrast, filling
the frame.
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- 3 x 3, **5 frames between cells, 14 frames per cell**.
- Cell opacity 0.72 once arrived — the tiling is a texture, not a headline.

## Props

| prop     | default      |
|----------|--------------|
| word     | "everything" |
| columns  | 3            |
| rows     | 3            |
| seed     | "everything" |
| step     | 5            |
| frames   | 14           |
| blur     | 12           |
| rise     | 18           |
| opacity  | 0.72         |
| italic   | true         |
| size     | 0.05         |
| color    | GRADIENT[7]  |
| gradient | MESH         |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

The scatter is a seeded sort, not `Math.random()`: Remotion renders frames out
of order across workers, so an unseeded shuffle gives every worker a different
grid and the render comes out flickering.
