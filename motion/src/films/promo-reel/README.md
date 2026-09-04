# promo-reel

What this repo does, in ten seconds, on one worked example: the eight-screen
Duolingo iOS clone under `mockups/canvases/duolingo-ios/`.

1920x1080, 30 fps, 300 frames (10.0 s). English throughout.

    ./render.sh promo-reel

Seven shots, in the order the clone actually ran its phases — grid the
capture, sample it region by region, try to name the face, generate the boards
off one token block, re-render and diff, park the reference under the replica.

## The cut

| from | shot       | frames | phase          | what is on screen                                        |
|-----:|------------|-------:|----------------|----------------------------------------------------------|
|    0 | `Measure`  |     46 | 1a, grid       | screen 01 under the refkit grid, three tokens read off it |
|   46 | `Sample`   |     52 | 1b, sample     | three probe boxes, each with the technique that took it   |
|   98 | `Face`     |     46 | 1c, the face   | the candidate list cycling, then the refusal              |
|  144 | `Generate` |     46 | 2 and 3        | the `:root` block scrolling beside all eight boards       |
|  190 | `Verify`   |     42 | 4, verify      | eight per-screen deltas, and their mean                   |
|  232 | `TwoRows`  |     32 | 5, park it     | `assets/workflow/case-duolingo.png`                       |
|  264 | `End`      |     36 |                | wordmark and the line the repo opens with                 |

`index.tsx` throws at import if those lengths do not sum to
`meta.durationInFrames`, so the table above and the file cannot drift apart
without the render failing first.

## Three things here are deliberate

**The phone is not a screenshot.** Every board on screen is the artboard's own
HTML in an `<IFrame>`, served out of `mockups/` because that is this project's
public dir. So the reel cannot claim a fidelity the boards have since lost:
edit a token, and the next render of this film shows the edit. It costs a few
seconds of load per shot and it is worth them. A bare `<iframe>` would not do
— `<IFrame>` is what holds the render open until the board is in.

**The shots do not overlap.** `brand-film` cross-dissolves because its source
does; here each shot fades its own last frames out and the next arrives on the
same black ground, which is a dip and not a mix. Overlapping two shots that
both carry small type would put two sets of numbers on one frame at a point
where the reel is asking to be read. For the same reason every shot's last
element settles at least six frames before that shot's fade begins.

**Every number is in `data.ts`,** copied from that folder's two evidence
boards and its README — the tokens, the three probes and how each was taken,
the refusal score, the eight deltas. Nothing is rounded for the edit or
written to fit a line. If a value looks wrong on screen it is wrong in the
clone, and `data.ts` is where to start.

## One caveat, on this machine

The boards declare `--d-font: ui-rounded`, a stand-in: Duolingo sets Feather
Bold, which is not on this machine and not in any candidate list, so
`refkit font` scored 0.353 and refused to name a lookalike. Headless Chrome
has no `ui-rounded` either and falls back to a grotesk — but it falls back the
same way when it renders the boards themselves, so the type in this film is
the type the boards have here. The `Face` shot says as much on screen.

## Assets

Nothing new is committed for this film. The boards come from `mockups/` at
render time; the comparison figure is `assets/workflow/case-duolingo.png`,
already in the repo as a README figure, reached by a direct `import` — see
`src/env.d.ts` for why that needs a declaration. The capture itself is not
here and never will be.
