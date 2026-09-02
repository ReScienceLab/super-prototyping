---
name: clone-prototype
description: Clone a real app's screens as pixel-accurate, self-contained HTML artboards on the prototype canvas. Overlay a grid on the reference and sample colours visually, derive one measured design-token block, generate one HTML file per screen from a single script, verify by re-rendering, and park the reference underneath its mockup. Use when asked to 100% copy / clone an app's UI, rebuild screens from screenshots or Mobbin, extract a design system from reference images, or check a mockup against its reference.
---

# Clone prototype

Seven phases, in order. **Never skip ahead.** Tokens before HTML, sampling
before tokens. Every colour and every metric in the final HTML must trace
back to a measurement, not to a guess that "looks about right". The one
thing built out of order is Phase 5's reference row: it needs no
measurement, so it goes up first (see Phase 5).

Output lands in `mockups/canvases/<slug>/` and the canvas picks it up
automatically. The `prototype-canvas` skill covers how folders become tldraw
pages and how `layout.json` rows work. Name the folder for the source,
e.g. `notion-ios`.

Toolkit: `tools/refkit.py` (grid / sample / bands / bbox / scan / hairline /
font / shoot / diff / blend / tokens / batch / ink / crops / key /
montage), plus `tools/artgen.py` for the rare asset that has to be drawn.
Needs `pillow` + `numpy`; `shoot` needs Google Chrome. Work in a scratch
directory, not in the repo.

```bash
REPO="$(git rev-parse --show-toplevel)"
python3 "$REPO/tools/refkit.py" --help
```

---

## Phase 0: collect references

Get the highest-resolution capture you can; every later measurement is
capped by it.

- **The user's own screenshot** is usually the authority on *which* screens
  and *which* scroll state. Save each one as its own crop (`p1.png … pN.png`)
  before doing anything else. Image caches rotate and the attachment will
  disappear mid-task.
- **Mobbin MCP** (`mcp__mobbin__search_screens`, `search_flows`), when
  available. Run one search per screen, `platform: "ios"`, and keep
  `task_intent` **identical** across every call in the run. Describe the
  screen in plain language *including its literal on-screen strings*; that is
  what actually matches. Use `exclude_screen_ids` (a JSON array of quoted
  UUID strings) to push past near-misses you already rejected. Download with
  `curl -sL <image_url>`. Results are ~299 × 678 webp, fine for placing on
  the canvas but **too small to be the only sampling source**. Cite results
  as markdown links to their `mobbin_url`.
- **A native-resolution capture of any screen from the same app** (@2x/@3x,
  e.g. 1179 × 2556) settles ink, scrim and accent values that a downscaled
  strip cannot. It does not have to be one of the screens you are cloning.

### Check the colour space before you sample anything

A capture straight off a device is often **untagged Display P3**, and every
tool in this kit reads raw bytes. Sampled as-is, a P3 capture and an sRGB one
of the same screen disagree by 5-10 levels on any saturated colour, and
nothing about either looks wrong on its own. Convert to sRGB first, and
convert the whole set, so one token cannot end up averaging two spaces.

The test is cheap and it is the only thing that finds this: **sample one
element that appears in every capture** (a brand mark, an accent button, the
page ground) and compare across batches. Values that split into two clusters
are two colour spaces, not two colours. The `claude-ios` run had captures
01-07 in sRGB and 08-15 untagged P3; the same brand orange read `#E07A54` on
one half and `#D97757` on the other, and the page ground split with it. One
`sips`/Pillow conversion pass up front collapses both.

Two oranges may still survive the conversion, and then they are real: that
run kept `#D97757` for the star mark and `#CB6442` for the send button, on
the same screen. Convert first, *then* decide what is one token and what is
two.

Record the capture scale once, in **capture px per design pt**, and reuse it
everywhere:

```
scale = screen_inner_width_px / device_pt_width      # e.g. 300 / 393 = 0.7634
```

Cross-check against height (`649 / 852 = 0.7617`). If the two disagree by
more than ~1%, the crop is wrong. Recrop before sampling.

---

## Phase 1: grid on the image, then LOOK

**Draw the grid onto the pixels and read the result with your eyes.** That
is the rule that makes this work. Sampling coordinates blind produces
numbers with no idea which UI element they belong to, and those numbers end
up in the wrong token.

```bash
python3 "$REPO/tools/refkit.py" grid p4.png -o g04.png --zoom 3 --minor 10 --major 50
```

Then **read `g04.png` as an image**. Cyan every 10 source px, red and
labelled every 50. Walk the screen element by element and write down the
region each one occupies in source coordinates. Only then sample.

### Four kinds of colour region, four techniques

**Pass `--pt <scale>` to every region command.** Then the design pt you read
off the grid is the pt you type and the pt that ends up in the CSS, and the
answers come back in pt too. No mental arithmetic between the capture and
the stylesheet, which is where transcription errors get in.

| What | Technique | Command |
|---|---|---|
| Large flat fill (page bg, card, sheet) | flat-neighbour census; a pixel equal to all four neighbours is a real fill, not an antialiased edge | `refkit sample IMG x0 y0 x1 y1 --pt 3` → read **flat fills** |
| Small element (badge, dot, chip, glyph) | mode of the core; no flat interior exists at this size | same command on a core-only crop → read **all pixels**, take the top entry |
| Text ink | mean of the darkest few percent; the mode of any text region returns its *background* | same command → read **ink core** |
| 1pt hairline, divider, card border | coverage solve; a 1pt rule never reaches its true colour in a downscaled capture | `refkit hairline IMG x0 y0 x1 y1 --bg FFFFFF --scale 0.7634` |
| Gradient, wash, glow | stop list along one axis; a wash has no flat interior to census and no single value to hold | `refkit scan IMG col 110 545 852 --pt 3` → read the runs as CSS stops |

The coverage solve sums the ink deficit across the band and divides by the
capture scale, recovering the full-coverage colour a naive pick reports far
too light. **Use the scale of the image you are sampling.** A 3× crop of a
0.7634 strip is `0.7634 × 3 = 2.29`.

**A gradient is not a colour, and two flat tokens will not fake it.** Walk
one column through it with `scan`, take the runs as stops, and write them
into the generator as a `linear-gradient` with explicit px positions. A
second axis is a second scan, layered as a masked overlay rather than folded
into the first. Claude's voice screens are a vertical ramp down x = 110 plus
a horizontal white veil masked in over 100px; sampled as two flat tokens,
those screens sat 28-38 levels off across their lower half, and the ramp took
the best of them to 3.61 whole-frame. Keep the ramp's two endpoints as
tokens, because that is what an evidence row can hold, but the stops belong
in the builder.

A solve that lands within ~2 of the page background means the rule is
invisible at this resolution, which usually means the real UI has **no
divider there**, not that the divider is `#FAFAFA`. Check a native capture
before inventing one.

### Metrics come off the same grid

Read gutters, row heights, insets, corner radii and type sizes off the red
labels. Three commands turn "about 64" into a number you can defend:

```bash
refkit bands IMG 30 120 60 780 --pt 3 --thr 170   # ink bands + the pitch between them
refkit bbox  IMG 16 690 380 810 --pt 3            # an element's exact box
refkit bbox  IMG 16 690 380 810 --pt 3 --grow     # ...grown to the ink it touches
refkit scan  IMG col 196 380 410 --pt 3           # colour runs -> the exact edge
```

**Use `--grow` for anything you are going to crop.** Plain `bbox` thresholds
luminance, so it stops at the first low-contrast edge and reports a confident
number for the rest: pale skin on white is under any threshold that does not
also take the page. `--grow` asks the other question, how far does the thing
I am pointing at go, by labelling the ink in a padded window and keeping only
the components the box already sits on. It prints the ground it inferred and
which window sides the answer ran into; a side listed there means the
component escaped `--pad` and probably merged with a neighbour, so widen the
seed or shrink the padding rather than believing it.

`bands` prints a pitch column: a list whose rows land on 62.7 / 62.3 / 64.0 /
61.7 / 64.7 is a **64pt row**, and the spread is glyph height, not layout.
`scan` collapses a row or column into colour runs, so a sheet edge reads as
`#B3B3B3 .. 396.0` then `#F5F5F5 from 397.0`, to the pixel, in one line.

Expect a small vocabulary of repeated numbers (16/20/26 gutters, 44 tap
targets, 8/10/12/14 radii). If every measurement is unique, you are reading
antialiasing, not layout.

### Measure the type face too

`--n-font` is the one token people guess. Do not. The whole board inherits it.

```bash
refkit bands IMG 40 410 420 470 --axis cols --minfrac .01   # where the words break
refkit font  IMG 17.3 139 78.7 152 Libraries --pt 3 \
             --fonts ./brand-fonts                          # rank the candidates
```

Box exactly one word, the biggest on the screen, a title rather than a tab
label, and confirm on a second screen before it becomes a token. Read the
**verdict** line rather than the top row: a "no call" means the ranking
cannot separate the top faces, and promoting its winner invents a fact.

A no call has a bill and it arrives in Phase 3: the stand-in you pick almost
never sets to the same width as the face it replaces. Measure that ratio now,
with `refkit bbox` on one string in both, and put it in the evidence table.

[`references/typeface.md`](references/typeface.md) covers the three verdicts,
brand faces outside the candidate set, why a width matched in PIL is 6% wrong
on the board, and what a stand-in's width ratio predicts about Phase 4.

### Deliverable of this phase

A table with an **evidence** column, one row per token. Anything without
evidence does not become a token.

| token | value | evidence |
|---|---|---|
| `--n-font` | `-apple-system, "SF Pro"…` | `refkit font` on the page title, 0.93 (2nd 0.87) |
| `--n-text` | `#2C2C2C` | H1 core ink @3x, 3 screens |
| `--n-hairline` | `#E9E8E7` | 1pt coverage solve, settings dividers |
| `--n-border` | `#EFEEEC` | card outline solve |

Write the machine half of that table as you measure: `probes.json` in the
scratch dir, one entry per measurement, `{"id", "img", "cmd", "box"}`.
Phase 4 replays it against your renders, so every number that justified a
token is re-checked after the token changes. Without it the evidence
drifts: one finished run shipped three rows still citing an alpha of `.174`
after the token had become `.10`, and `refkit tokens` cannot catch that; it
checks that tokens exist, not that their evidence still agrees with them.

Two things `batch` will not tell you. It compares the **first colour a probe
prints**, and `sample` prints its flat-fill census first, so an ink probe
needs `--only ink` or it silently compares two backgrounds and reports a
perfect Δ 0. And a key starting with `_` in a probe is ignored, which is
where the sanity note below lives.

**Every probe box carries a one-line sanity note** proving the window holds
the element and only it. The window is wrong far more often than the
measurement is: a probe at `cy=681` for a button row that sits at 564, or a
box that catches the neighbouring label instead of the glyph, returns a
confident, plausible number either way.

Re-sample rather than argue. Where the strip and a native capture disagree,
**the native capture wins.**

---

## Phase 2: design system before any screen

Write one `:root` block and inline it, **byte-identically**, into every
artboard. Artboards render in `<iframe srcDoc sandbox="">`, so there is no
shared stylesheet. A single generator script is what keeps them in sync.

Cover, in this order, with a short prefix per app (`--n-` for Notion):

- `font`: the real platform stack, never a webfont, and measured
  with `refkit font` in Phase 1 rather than assumed
- colour: backgrounds → fills → hairline/border/track → text ramp → accents
- radii, one per component class (`field`, `card`, `sheet`, `tile`, `pill`)
- type: **composite `font:` shorthands**, not separate size/weight vars,
  e.g. `--n-t-row: 400 17px/22px var(--n-font)`
- spacing and geometry constants: gutters, row height, tap target, status
  bar, sheet top inset

`mockups/canvases/luma-ios/` is a complete run to copy from: 19 boards (a
token board, two evidence boards, 8 screens, 8 references), a three-row
`layout.json`, a committed `gen.py`, and per-screen mean deltas of 3.47 to
4.50 levels against the captures.

`mockups/canvases/duolingo-ios/` is the second complete run, and the one to
read when the screens are mostly illustration: 58 tokens, 8 screens, 128
pieces of art, and per-screen mean deltas of 1.32 to 2.93, the best
screenshot-sourced numbers in the repo. Every picture on it is a crop of the
capture at a measured box, which is most of why. Its `README.md` carries the
experiment that settled crop against generate, the stand-in face whose cap
ratio is not SF Pro's, and two defects that produced no error message. Board
`00e-art-gen` is the generation result, kept as evidence beside the crops it
loses to.

Start from the skeleton rather than a finished board:
`cp -r mockups/canvases/templates mockups/canvases/<slug>`. Its `gen.py`
builds the `:root` block *and* the evidence table from one `TOKENS` list, so
a value cannot drift from the evidence behind it and a token cannot ship
without one. Change `NAME` and the prefix, then replace every placeholder row
with something you measured.

Build the token board as the **first generated artboard** of the folder (the
reference row is already up). It is the contract. When a screen looks wrong
later, this is what you check it against.

Once the screens exist, `refkit tokens mockups/canvases/<slug>` enforces the two
invariants this phase rests on: that every board inlines the *same* `:root`, and
that nothing references a token that does not exist, in CSS or in the evidence
table. Run it before you call the board done; a `--x-scrim-3` in an evidence row
that never existed as a token is invisible to the eye and obvious to the linter.

When the evidence table outgrows the 478 × 980 box, split it onto its own
`00b-evidence` board rather than trimming it. The evidence is the deliverable.

---

## Phase 3: one generator, N artboards

Write **one** script that emits every `.html` file, and commit it with the
boards it produces: `mockups/canvases/<slug>/gen.py`, plus its asset JSON,
resolving paths relative to `__file__` so
`python3 mockups/canvases/<slug>/gen.py` regenerates the folder in place
(`mockups/canvases/templates/gen.py` is the skeleton,
`mockups/canvases/luma-ios/gen.py` a finished one, and
`mockups/canvases/duolingo-ios/gen.py` a finished one that also cuts and
places its own artwork from a `crops.json`). Do not hand-edit the
artboards afterwards; edit the generator and re-run. That is what keeps
eight files consistent through a dozen correction passes, and it only
outlives the session if the generator is in the repo; a scratch-dir
generator dies with the session and leaves the boards unmaintainable under
this skill's own rules. **A board with no committed generator is
unfinished.**

```python
TOKENS = ":root{...}"          # from Phase 2, one source of truth
BASE   = ".phone{width:393px;height:852px;...}"
SB     = '<div class="sb">...</div>'          # status bar, 54px
def page(title, extra_css, body): ...          # TOKENS + BASE + extra_css + body
def write(name, html): ...
```

Hard constraints from the canvas renderer (also in
`mockups/canvases/README.md`):

- **Fully self-contained.** The iframe is `sandbox=""`. No external CSS,
  JS, fonts or images. Every image is a `data:` URI; icons are inline SVG.
- **Artboard box is 478 × 980.** Overflow clips silently. Do not check
  this by eye; `refkit shoot ... --check-overflow` asks the layout engine and
  exits non-zero with the exact px, so a clipped board fails in Phase 3
  rather than turning up in Phase 4. It also flags elements clipped inside
  their own containers; mark a deliberate clip (a fade, a masked hero) with
  `data-clip-ok`.
- Phone frame is 393 × 852 pt at 1pt = 1px: 54px status bar, 125 × 36
  Dynamic Island, 139 × 5 home indicator.
- **No board background on a screen artboard.** Give `body` no `background`
  at all, so the phone floats on the canvas ground and its drop shadow lands
  on whatever the board is placed over. A cream or grey field behind the
  phone paints one opaque rectangle per artboard, and a row of those reads as
  jarring next to its neighbours. The exceptions are the full-bleed sheets,
  the token board and the evidence boards, which *are* their background and
  keep it.
- Avoid SF Symbols private-use glyphs; they render as tofu without SF Pro
  installed. Inline the SVG, or embed a rasterized symbol as a `data:` URI.
- **Icon size is not a calibration loop.** Set each SVG's `viewBox` to the
  measured ink box, in pt, and give the span the same numbers; scale is then
  1:1 with nothing to converge. The default `preserveAspectRatio`
  (`xMidYMid meet`) means that when the span's aspect ratio disagrees with
  the viewBox's, only one axis binds, and a size loop silently converges on
  the wrong axis and stops improving.

Copy is part of the replica. Transcribe the reference's strings exactly,
**including where each line wraps**. A title that breaks after "iPhone and"
instead of "iPhone and AirPods" is a real defect. Force it with explicit
widths, `<br>`, `&thinsp;` or `<wbr>` rather than hoping the browser agrees.

**When a substituted face fights a measured width, the wrap wins.** A
stand-in that sets wider pushes a string onto a second line inside a
container the capture shows holding one, and two measured rules collide.
Widen the container and record why; never shrink the type to make a measured
width hold. Claude's user bubble measures 302.6 and ships at 316.

### Artwork: crop it, do not draw it and do not generate it

A screen that is mostly illustration is not mostly work. **Every picture on
the capture is cropped out of the capture at its own measured box**, keyed by
id in a `crops.json` the generator reads, cut to `assets/art/<id>.png` and
placed back by an `art()` helper at the same numbers. The asset then cannot
drift from where it was measured, and its pixels are the reference's own.

The rule and the arithmetic behind it: a crop scores **0** by construction,
and the same crop redrawn by `gpt-image-2` scores **38.53**, the same
character with a different head-to-body ratio and the props moved.
So **generate only pixels the capture does not contain**, name those assets
in the folder README, and give each one a probe like any other measurement.

When you do have to generate, the thing that decides the result is the
input's **layout**, not the prompt: pack the assets into a grid, each in its
own cell at the size and position it must come back at, and the model
upscales in place instead of composing. That took this repo's set from 18.41
to **3.96** mean delta, with every cell returning at scale 0.99-1.00. Density
is free (77 assets in one call beat 6), but the asset's native size in the
capture is not: under about 128px, colour does not survive the redraw, so
small icons stay CSS or inline SVG. `tools/artgen.py` runs the whole loop,
including keying the cells back out, solving the fit and scoring each asset
against the crop it came from.

[`references/assets.md`](references/assets.md) has the decision table, the
`crops.json`/`cut()`/`art()` shape, and why `assets/art/` is committed while
`assets/refs/` is not; [`references/generating.md`](references/generating.md)
is the generation procedure end to end, with the key-colour, alpha-ramp and
fit-sign traps that each cost a run.

### Model the line box once, then place by ink

A screen carrying real prose is a dozen placements of the same few numbers,
so measure the block model once with `bands` and let the generator solve the
rest: the line box per level, the margin between each pair of block types,
and the offset from a line box's top to the ink inside it. Then write the
builder to take an **ink top** and solve back to the box, so every call site
is a number read straight off the grid rather than one derived by hand.

```python
K = {"sans": 0.2708, "serif": 0.2240}      # SF Pro, Georgia: cap top within the line
def ct(ink, fs, lh, face="sans"):          # the box top that puts ink where you want it
    return ink - ((lh - fs) / 2 + K[face] * fs)
```

Claude's answer column is one such model: h1 29/36.3, h2 25/31, body
17.8/25.5, margins of 8.4 generic, 5.7 into a heading, 10.3 out of one, 8.2
between list items. Measured once, it placed five long screens to within
0.5pt. The alternative is a hand-tuned `top` per paragraph, which drifts the
moment any string above it changes.

**Never let content you invented carry a measured element into position.**
Where a composer, a fade or a scroll edge hides part of a block, the hidden
span is not on the capture and cannot be transcribed. Filling it with
plausible prose so that the flow pushes the visible remainder down makes that
remainder's position an invention, and it will read as measurement to
everyone after you. Place what you can see as its own absolutely-positioned
block on its own measured ink top, and treat the gap as a line *count* or as
nothing at all. Say so in the folder README.

`layout.json` already holds the reference row (Phase 5 builds it first). Add
the `Foundations` row and the numbered-screens row as the boards land.

---

## Phase 4: verify by rendering, not by reading

Render at the capture's own scale and cut the screen out of the frame, so
your render and the reference share one pixel grid, then replay Phase 1's
probes against the renders before anything else:

```bash
python3 "$REPO/tools/refkit.py" shoot "$REPO/mockups/canvases/<slug>"/[01]*.html \
    -o mine --scale 3 --crop-phone --check-overflow
python3 "$REPO/tools/refkit.py" batch probes.json --against mine
python3 "$REPO/tools/refkit.py" diff mine/07-models-sheet.png refs/cp7.png \
    --pt 3 -o d07.png --regions regions.json
```

**`--scale` takes an integer, and your capture's scale is not one.** A
2.2417 px/pt capture against a 3× render is a shape mismatch and `diff`
refuses it. Shoot at the nearest integer and downscale each render to the
capture's own pixel size (Pillow, LANCZOS) before diffing. Put the whole
chain, regenerate to shoot to downscale to diff all N, in one scratch script
on the first iteration; you will run it thirty times.

`batch` re-runs every measurement that justified a token, reference against
render, in one table. `crops probes.json --against mine -o crops/` writes a
paired NEAREST-upscaled crop per probe. Size is a numbers problem, shape is
a picture problem: the crops are what find "too small, too small, and
rotated 10 degrees" while the numbers read fine.

`--crop-phone` removes the crop step from every iteration; it also masks the
52pt corners, so a cropped screen composites onto any ground without the
four black wedges of bezel a rectangular crop keeps. A bare capture has
square corners full of real content, so `diff` and `blend` score only where
both images have ink and say what fraction they dropped; without that the
four wedges quietly add a level or two to every number you publish. `diff`
writes the
side-by-side **and** prints the numbers behind it. With `--regions` (inline
`{"name": [x0,y0,x1,y1]}`, or a file you write once and reuse for the run) it
tables mine-vs-ref per region with a Δ column; with no regions it ranks the
bands where the two disagree most, which is how you find a defect you have not
thought to look for yet.

Then read the side-by-side image, in this order:

1. Nothing clipped; `--check-overflow` has already answered this.
2. Line wraps match the reference, string for string.
3. Structure: what sits inside the card vs. outside it; which insets differ
   between header and body.
4. Colour: the `diff` table. Trust it over your eye. A defect described as
   "~4 levels dark in one band" turned out, measured, to be a whole backdrop
   desaturated (mean chroma 2.0 vs 5.9) at matching luminance.

Re-render after every correction pass. A correction you have not re-rendered
is not a correction.

### Subtract, and fit what you cannot sample

A side-by-side answers "is this the right colour". It is bad at "is this the
right colour in the wrong place", which is most of what is actually wrong.
Blend the two instead, the way a difference layer works: your render into
red, the reference into green and blue. Agreement goes grey, reference-only
ink goes red, yours goes cyan, and a red edge above a cyan edge is one
element sitting a point too low.

```bash
python3 "$REPO/tools/refkit.py" blend mine/10-home.png refs/h2.png \
    --pt 3 --y0 760 --y1 852 --zoom 2 -o tab.png
```

A material is the other half of this. A translucent bar over blurred content
has no pixel holding its fill or its blur radius, so it has to be fitted by
sweeping the generator over a grid, not sampled. Record the sweep as
evidence: "minimum at 40px/.48, and 24px/.78 costs 10 levels".

[`references/comparing.md`](references/comparing.md) has both in full: how to
read red and cyan edges, how `blend`'s offset probe separates a placement
error from a colour one, and how to run a sweep and read one that refuses to
settle.

### Call it

Refinement has a floor, and you reach it long before the deltas reach zero.
Stop when any of these is true:

- the worst remaining bands are ones you cannot fix: the Dynamic Island the
  capture does not show, a watermark strip, a photograph you re-encoded;
- a full sweep of a parameter moves the number by less than a level;
- the blend is grey everywhere except sub-pixel fringing on glyph edges.

What counts as inside depends on the source, and on one substitution:

| Source | Expected mean absolute delta |
|---|---|
| Figma export, real type styles | 0.2-1.9 |
| Screen capture, faces you could name | 3-7 |
| Screen capture, a brand face you had to stand in for | 3-7 on chrome, 10-25 on the screens carrying prose |

A screen at 23 is not automatically broken. Before treating a number as a
defect, ask **where** the delta sits: `--regions` on a body-text screen that
scores 17 overall and 3 on its chrome is a face-width result, and no amount
of geometry work will move it. `claude-ios` reads 3.4-7.1 on its nine
chrome-led screens and 10.0-23.2 on the six carrying serif prose, from one
substitution, with the whole set structurally clean. Tuning positions to
chase that second column moves correct elements off their measured
coordinates.

Any screen inside its row of that table, with no structural defect left in
the blend, is a finished run. Write the numbers into the folder's README,
state the substitution beside them, and stop. Another pass costs a session
and buys a level.

### Fan out the looking, not the editing

Verification is per-screen, read-only and embarrassingly parallel; the
expensive resource is *attention on images*. Once the boards render, dispatch
one subagent per screen, up to about 8-10 before fan-in costs more than the
parallel looking saves. Each reviewer gets absolute paths to `mine/NN.png`,
its reference, `probes.json` and the regions file, tools Bash and Read only,
and returns `{"screen", "defects": [{"id", "severity", "claim", "probe",
"box_sanity", "mine", "ref"}], "clean": [...]}`. **A defect without a probe
is a rumour**: re-run every claimed probe yourself and discard what does not
reproduce, and reject any probe box missing its sanity line. Reviewers
report deltas, never token values and never fixes. The rumour rule pays:
"text leaks past the fade at y798" survived several turns until `refkit ink`
showed the reference holds the same 8.3 levels of ink there; the real
difference was the tail, 6.3 vs 1.0 at y800+. Ten screens verify in the
time of one.

**Only the looking parallelises.** You stay the single writer. Collect every
defect list, then make the fixes yourself in the one generator. Never let
subagents edit. Two agents in `gen.py` will clobber each other, and the
next regeneration silently reverts whatever an agent "fixed" in an artboard
directly.

Do **not** fan out Phase 1 or Phase 2. Token decisions need one eye and one
vocabulary; five agents sampling five screens independently return five
slightly different greys and a `--x-fill-4` that is two levels off
`--x-fill-3`.

---

## Phase 5: park the reference under the mockup

**Build these boards at the start of the run, not the end.** The captures
need no measurement and exist at t = 0; embedding them puts the source of
truth on the canvas within two minutes and gives the user something real to
look at while the replica is measured. The section sits here because the
row is only *finished* when every mockup stands over its capture.

The replica is only auditable next to its source. Embed each capture as a
base64 `data:` URI in its own `ref-NN-<slug>.html`, listed as a **third
row** in `layout.json` **in the same order as the mockup row**. The canvas
lays rows out at `index * (w + gap)` from x = 0, so item N of row 3 lands
directly under item N of row 2.

```json
{ "title": "Source of truth: captures",
  "numbered": true,
  "files": [{ "file": "ref-01-splash", "label": "Splash" }] }
```

Keep the source's attribution watermark in the image. Caption each one with
its screen id, and state in your report where a reference is a *near*-match
rather than the exact frame (a toast, a different scroll position, one row
label off). Never let a near-match pass as exact.

Three mismatches are by design; name them in the report as expected, not as
defects: Mobbin composites out the Dynamic Island while the frame spec draws
it; `--crop-phone` masks the 52pt corners, so crops show rounded corners
where raw captures are square; and hero, map and avatar bitmaps are crops of
the capture itself.

**Restart the dev server before you open the canvas.** `canvasLibrary.ts`
globs outside the canvas app's Vite root, so a running server does not
reliably notice a folder created after it booted, and `?canvas=<slug>` then
opens whichever board tldraw last persisted: right URL, no error, wrong
board. The `prototype-canvas` skill has the tmux invocation and the two flags
it needs; a boot is ~150 ms, so do it before debugging artboards you cannot
see.

```bash
open "http://127.0.0.1:<port>/?canvas=<slug>"
```

---

## Phase 6: the folder documents itself

A board nobody can audit in six months is not finished, and the canvas shows
pixels rather than reasoning. Three files, all of them small:

**`mockups/canvases/<slug>/README.md`.** Copy the shape from
`mockups/canvases/apple-settings/README.md`. What it has to carry, past a
list of screens:

- **How close it lands**: the per-screen delta table from Phase 4, with the
  crop and the units named, and one sentence explaining the spread rather
  than apologising for it.
- **Every substitution and its consequence**: the faces you could not name,
  the width ratio, the containers you widened because of it.
- **What the source itself gets wrong.** A capture is a state of a real app,
  and some of those states are defects: a partial markdown stream that runs
  two labels together, a component left on its unfilled default, a missing
  Dynamic Island. Transcribed faithfully, they look like *your* bugs. Name
  them as the source's.
- **Anything a reader would otherwise mistake for measurement**: line counts
  standing in for text you could not see, a fitted material, a gradient
  rebuilt from stops.

- **Which assets are generated rather than cropped**, if any, with the probe
  that says how close each one lands. A reader assumes the artwork is the
  source's until told otherwise. Keep those deltas in a manifest the
  generator reads, next to `crops.json` and in the same shape, holding the
  shipped Δ *and* the runs behind it, so "it scored 3.88" can be read as
  "any run of this lands near 4.5" rather than as one lucky draw:

  ```json
  "03-char": {"delta": 3.88, "from": "white/high", "scale": 1.0,
              "dx": 0, "dy": 0, "runs": [4.31, 4.28, 5.81, 3.88]}
  ```

  If the generated set is not what the screens ship, it still belongs on a
  board of its own, including the part that failed. A negative result you
  measured is cheaper for the next reader than the experiment they will
  otherwise repeat.

**`mockups/canvases/<slug>/.gitignore`.** Whole app screens are not component
art. Ignore `ref-*.html` and `assets/refs/`, and say in the README how many
boards a fresh clone builds without them. **`assets/art/` is the exception
and stays committed**: cropped component art is what the boards are made of,
and without it a fresh clone renders empty frames. Say that in the file, in a
comment, because the surrounding rule points the other way.

**A bullet in `mockups/canvases/README.md`**, under Examples: board count,
row structure, the delta range, and the one thing this folder teaches that
the others do not.

Then check the run is reproducible from what you committed:

```bash
python3 mockups/canvases/<slug>/gen.py            # byte-identical, no scratch dir
python3 tools/refkit.py tokens mockups/canvases/<slug>
```

---

## Pitfalls

- **Sampling without looking.** Numbers with no element attached land in the
  wrong token. Grid, read, *then* sample.
- **Naming a face off a box that holds more than the word.** A clipped leading
  glyph, or a neighbouring word inside the region, quietly halves the score.
  `bands --axis cols` gives you the word gaps; box one word.
- **Trusting a downscaled capture for thin ink.** Hairlines, scrims and small
  accents need the coverage solve or a native capture.
- **Hand-editing a generated artboard.** The next regeneration silently
  reverts it. Edit `gen.py` and re-run.
- **Unbalanced `<div>`s after a structural edit.** Count them
  (`grep -o '<div' | wc -l` vs `</div>`) before rendering.
- **`.replace(old, new, 1)`** when the string occurs twice. Bounded replaces
  are how one of two identical paragraphs stays broken.
- **A glob that pairs the wrong files.** `glob('mine/0*.png')` swept up
  `00-design-tokens.png` and shifted every mine-vs-reference pairing by one:
  true means of 3.5-4.5 levels read as 20-115. When every screen regresses
  at once, check the pairing before touching a board.
- **A stray character before a CSS selector** (`; .metrics{...}`) invalidates
  the whole rule with no error. If one block renders in the wrong font, check
  the character in front of its selector.
- **Overflow after adding a row** to a fixed-size board. Tighten the padding
  or switch a stacked flex column to a grid; do not just let it clip. Run
  `shoot --check-overflow` after any board grows.
- **Measuring a render's height in pixels.** A card's `box-shadow` paints ~60px
  below its own bottom edge, so a pixel probe reports overflow that is not
  there. Ask the layout engine (`--check-overflow` does).
- **Redrawing a third-party logo by hand.** Pull the real one; see
  [`references/brand-marks.md`](references/brand-marks.md) for the source, and
  for why you check the glyph against the capture before trusting a file name.
- **Thresholding luminance to find an element's extent.** A near-white band
  (243,245,247) on a near-white page (245,245,247) is invisible to any fixed
  threshold, so the element reads as ending early and you "fix" a layout that
  was already right. Probe each row against the page gutter beside it, not
  against an absolute value. This cost two wrong diagnoses in one session: an
  80pt cover measured as 63.7, and a row top declared 5.3pt late when the
  layout was inside a point.
- **Generating an asset the capture already contains.** A crop of the
  reference is exact; a redraw of the same thing scores 38.53 levels against
  it and quietly becomes the largest error on the screen. Reach for
  `gpt-image` only for pixels no capture holds, and probe the result.
- **Generating one asset at a time, or generating a small one at all.** When
  you do have to draw something, a single asset in a single call is the worst
  version of the method: it composes rather than copies, and no prompt wording
  recovers what the input's geometry would have given for free. Pack the set
  into one grid at target size and position (18.41 → 3.96), and leave anything
  under ~128px of capture as CSS or SVG, because at that size the shape comes
  back and the colour does not. See
  [`references/generating.md`](references/generating.md).
- **Reusing a threshold that was measured on a different asset.** `refkit key
  --hi 110` is not a constant; it was set just below one character's closest
  pixel to magenta. On an icon whose own colour sits 83 from the ground, the
  same 110 keys the *artwork* to partial alpha, the unpremultiply divides by
  it, and grey comes back. That asset scored 48 and the drawing was fine.
  Any threshold named after a measurement has to be re-derived per asset, and
  a printed warning when the art is close to the key is cheaper than the
  re-run.
- **An unquoted `$VAR` of ids in zsh.** zsh does not word-split unquoted
  parameters, so `cmd $IDS` passes all 77 ids as one argument and you get
  `OSError: File name too long` rather than a usage error. `${=IDS}` splits.
  This one is free if it crashes before the API call and expensive if it does
  not.
- **A stand-in face whose cap ratio is not SF Pro's.** Sizes derived as
  `cap ÷ 0.714` are ~6% wrong the moment the board ships a rounded or a
  brand-adjacent stack; one run measured 0.762em. `ct()`'s K moves with it
  (0.115, not 0.2708). K solves in closed form from two renders,
  `K_needed = K_used − (ref_ink − mine_ink) / fs`, which is worth doing,
  because guessing its sign is a coin flip and the wrong guess pushes text
  clean out of the measurement window, where it reads as a clipped glyph
  rather than as a bad constant.
- **A `z-index` painting over text that is perfectly correct.** A card or
  sheet body at `z-index:1` covers every sibling left at `z-index:auto`, with
  no error and no clipping warning, and the screens whose text vanished can
  even *improve* in the diff. Colour, font shorthand and overflow all look
  fine; reading the **generated CSS** is what finds it.
- **Drawing the frame the templates draw instead of the frame the capture
  shows.** Check for the Dynamic Island and the home indicator on every
  capture before trusting either. A rendered island over captures that have
  none put a 103-level band across the top of eight screens. While you are
  there, check the status bar is *one* status bar: two capture sessions in one
  set can carry different cellular glyphs, 9pt apart.
- **Cropping an asset by eye instead of at its measured box.** Take the
  element's own box (`refkit bbox --grow` gives it) out of the capture at the
  capture's own scale. Then the capture's rounded corners land under your CSS
  radius and the art registers 1:1. Every offset cover in the luma home run
  was a crop carrying a strip of page, not a layout error. The other half of
  this is a box that is too *small*: plain `bbox` cut both ears off the
  duolingo avatar and a whole-frame delta moved by 0.04 levels, because a
  clipped ear is a few hundred pixels of 1.7 million. Nothing but looking at
  the crop, or `--grow`, finds that.
- **Comparing against a capture you have not trimmed.** Mobbin exports carry
  a watermark strip below the screen, so a 2676px capture of an 852pt screen
  is 40pt of someone else's branding. Crop to the device height before
  `diff`, or it exits on a shape mismatch and you start doubting the render.
- **Assuming a floating pill because the icons are inset.** Read the gutter
  columns, x 6 and x 386, straight down through the bar. Luma's tab bar is a
  full-width material with a hairline at its top edge and the home indicator
  inside it; the replica drew a 353pt pill and let sharp page content show
  through the 84pt below it for four screens before anyone measured x 6.
- **A re-shoot that silently did not happen.** "A correction you have not
  re-rendered is not a correction" has no teeth if the render command failed
  and you did not notice. Two ways it happens: a zsh brace-glob
  (`{05,11,15}-*.html`) aborts the whole command when any one branch matches
  nothing, and a relative `tools/refkit.py` resolves to nothing after a cwd
  change. Both exit non-zero and both look like success if stderr went to
  `/dev/null`. **Re-shoot the whole folder, never a subset.** 18 boards is a
  few seconds and it cannot be mis-globbed. And never send a render's stderr
  to `/dev/null`; put warning filters inside the script instead.
- **Image caches rotate mid-task.** Save every reference to the scratch dir
  the moment you receive it.
