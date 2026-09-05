# promo-reel

What this repo does, in ten seconds, on one worked example: the eight-screen
Duolingo iOS clone under `mockups/canvases/duolingo-ios/`.

1920x1080, 30 fps, 420 frames (14.0 s). English throughout.

    ./render.sh promo-reel

Nine shots, in the order the clone actually ran its phases — grid the capture,
sample it region by region, try to name the face, collapse what was measured
into one block, cut the artwork out of the capture, generate the boards off
those two, re-render and diff, park the reference under the replica.

It is pitched at someone who has never seen this repo. On screen those are
eight numbered steps in plain English; the phase names the skill uses for them
are in the table below and nowhere in the film.

## The cut

| from | shot       | frames | on screen as | phase        | what is on screen                                       |
|-----:|------------|-------:|--------------|--------------|---------------------------------------------------------|
|    0 | `Measure`  |     66 | step 1, measure  | 1a, grid   | screen 01 centre frame, then aside and under the grid    |
|   66 | `Sample`   |     52 | step 2, sample   | 1b, sample | three probe boxes, each with how it was read             |
|  118 | `Face`     |     46 | step 3, typeface | 1c, face   | the card's own headline at 96px, then the refusal        |
|  164 | `System`   |     46 | step 4, system   | 2, tokens  | the face, twelve swatches, nine measurements             |
|  210 | `Art`      |     54 | step 5, artwork  | 3b, source | six `crops.json` boxes, then the six PNGs off the board  |
|  264 | `Generate` |     46 | step 6, build    | 3a, one gen| board 01 flying into a strip the other seven join        |
|  310 | `Verify`   |     42 | step 7, check    | 4, verify  | eight per-screen deltas, and their mean                  |
|  352 | `TwoRows`  |     32 | step 8           | 5, park it | `assets/workflow/case-duolingo.png`                      |
|  384 | `End`      |     36 |                  |            | wordmark and the line the repo opens with                |

`index.tsx` throws at import if those lengths do not sum to
`meta.durationInFrames`, so the table above and the file cannot drift apart
without the render failing first.

## Colour

Primer, GitHub's light theme, by its own token names — see the block at the
top of `data.ts`. White ground, `fg.default` for ink, one `accent.fg` blue for
everything the film points with, one `danger.fg` red for the single refusal.
Boards are Primer cards: a hairline border and a soft resting shadow, no glow.

Two colours are not the theme's and must not be normalised into it. `MINOR`
and `MAJOR` are cyan and red because `refkit grid` draws cyan every 10pt and
red every 50, and the grid the `Measure` shot lays over the phone is that
grid; they are only ever drawn over a board, never over the film's ground.
`DUO_GREEN` is `--d-u-green`, measured off the capture — it is the example's
own colour, and the delta bars carry it for that reason.

## Four things here are deliberate

**The phone is not a screenshot.** Every board on screen is the artboard's own
HTML in an `<IFrame>`, served out of `mockups/` because that is this project's
public dir. So the reel cannot claim a fidelity the boards have since lost:
edit a token, and the next render of this film shows the edit. It costs a few
seconds of load per shot and it is worth them. A bare `<iframe>` would not do
— `<IFrame>` is what holds the render open until the board is in.

**The shots overlap by twelve frames, and by no more.** This began as a dip —
each shot fading to nothing inside its own slot, the next arriving on empty
ground — on the argument that overlapping two shots of small type would put
two sets of numbers on one frame where the reel is asking to be read. The
argument was right about the type and wrong about the join: what it produced
was eight frames of blank white page between every pair of shots, which is
more abrupt than a dissolve and not less.

The slots in the table above are unchanged; each shot's `<Sequence>` simply
runs `OVERLAP` frames past its own and spends them getting out of the way. The
type problem is handled in `useJoin`, in `shots.tsx`, which keeps the two apart
in time rather than dissolving them evenly: the outgoing shot eases *out*, so
it is under a tenth six frames past the cut, and the incoming one waits those
six frames before it starts. They cross at roughly 8% against 40%, which reads
as one shot replacing another rather than as two sentences on one line — every
shot writes its heading at the same 96, 92, so an even dissolve there is the
one thing that cannot work. The outgoing shot also shrinks very slightly, so
it goes behind rather than dissolving in place.

Every shot's last element still settles at least six frames before its fade
begins, and its first now rises rather than appearing — under a dip a shot
with no entrance of its own had nothing to punch through, and three of them
did not have one.

**Six of the eight joins are the same object, not two pictures.** Overlapping
the shots stopped the film flashing white between them, but it left every join
a dissolve, and a dissolve between two unrelated frames is what makes nine
shots read as nine slides. Most of these joins were never two frames.

Screen 01 is on screen continuously from frame 0 to frame 282 — six shots, five
placements, no cut in any of them. It arrives centre frame at 0.95, walks left
to be gridded, walks smaller to be probed, sits out shot 3 while its own
headline is on screen instead, comes back at 0.48 beside the block that
describes it, grows to 0.78 to be cut up, and flies into the first slot of the
strip. That is also why shot 1 opens on it rather than starting it parked: the
film's first second is the thing the film is about.

The other two carried pictures are shot 3's headline — `.card .u` on that
screen, "Order food and drink", the largest piece of type on it, at 96px
instead of 19.4 — and the eight boards shot 6 lines up, which are the eight
rows shot 7 measures. One more is a sentence rather than a picture: shot 3 ends
on the stand-in the tool declared, and `RECIPE` opens on `typeface
ui-rounded`, which is where it opens in the board's own `:root` too.

So on each of those the object moves instead of cross-fading. The shot taking
over renders it where the shot handing it over left it, and both run the same
ramp on their own clocks: a shot's `<Sequence>` opens `OVERLAP` frames before
its slot ends, and the join starts two frames before that, so the incoming shot
picks the motion up at `frame + 2` and the two agree to the pixel on the frame
they share. `Verify`'s strip and `Generate`'s were measured at 0.38 MSE across
the handover frame, which is the h.264 noise floor and not a seam.

The mechanism is `useJoin(frames, "in" | "out")` in `shots.tsx`. A carried
layer skips the fade on the side it is being handed across — and skips the
shrink in both directions, because the shrink exists to put a *dissolving* shot
behind the one replacing it, and a 1.5% wobble is exactly what gives a
match-move away. That splits six of the nine shots into two `AbsoluteFill`s:
the carried object in one, everything that belongs to the shot alone in the
other. `Generate` also stops drawing its strip on the exact frame `Verify`
starts drawing it, so the flight never has a ghost under it.

Two joins are left as dissolves on purpose. `Verify` to `TwoRows` and `TwoRows`
to `End` have no honest object in common — the comparison figure is a bitmap
whose top row would need 0.80 horizontally against 1.04 vertically to line up
with the strip, and a match-move that has to stretch to land is a worse lie
than a cut.

**Every number is in `data.ts`, and most of them stay there.** The file holds
what the clone measured, copied from that folder's two evidence boards and its
README — the tokens, the three probes and the technique each was taken with,
the refusal score, the eight deltas. Nothing in it is rounded for the edit or
written to fit a line, and if a value looks wrong on screen it is wrong in the
clone.

What reaches the screen is a subset, and deliberately a small one. Fourteen
seconds is not enough to teach anyone what a least-squares corner fit is, and a
viewer
who cannot read `--d-r-card 13.5pt · rms 0.20` reads it as decoration — which
is worse than not showing it, because a film that looks like it is proving
something without being legible is exactly the thing this repo is against. So
each step keeps one or two measurements with a plain gloss and drops the rest:
`Measure` shows three sizes and not the scans that took them, `Sample` names
what was read rather than the token it lands in, `Face` draws the score as a
bar and never prints it, `System` shows the `:root` block under the film's own
names for its values, `Art` shows the count and none of the four scores behind
it, and `Verify` prints one mean instead of nine numbers. Every dropped value
is still in `data.ts`, one comment away from the board it came off.

`Art` is the one that gave up the most. The honest version of that shot is
`art-gen.json`: a crop scores 0 mean delta by construction, a naive
`gpt-image-2` edit of the same six scores 38.53, one-at-a-time on a key colour
and fitted back scores 18.41, and all six redrawn in one geometry-anchored grid
scores 3.96 — with the score tracking native size, 3.42 at 256-400px against
10.57 below 64px, which is why the canvas keeps icons in CSS. On screen that is
one sentence: cut, they are the original's own pixels; redrawn, the best
attempt still moves things. The four numbers are in `data.ts` above `CROPS`.

## One caveat, on this machine

The boards declare `--d-font: ui-rounded`, a stand-in: Duolingo sets Feather
Bold, which is not on this machine and not in any candidate list, so
`refkit font` scored 0.353 and refused to name a lookalike. Headless Chrome
has no `ui-rounded` either and falls back to a grotesk — but it falls back the
same way when it renders the boards themselves, so the type in this film is
the type the boards have here. The `Face` shot says on screen that a stand-in
was declared; it does not go into which grotesk then stood in for the stand-in,
and at this length it should not.

## Assets

Nothing new is committed for this film. The boards come from `mockups/` at
render time, and so do the six crops in `Art` — `assets/art/` is committed
(every piece of it is a measured crop, and without it the boards have no
artwork at all), so `staticFile` reaches them the same way it reaches an
artboard. The comparison figure is `assets/workflow/case-duolingo.png`,
already in the repo as a README figure, reached by a direct `import` — see
`src/env.d.ts` for why that needs a declaration. The capture itself is not
here and never will be.
