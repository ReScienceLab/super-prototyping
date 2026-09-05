---
name: clone-prototype
description: Clone a real app's screens as pixel-accurate, self-contained HTML artboards on the prototype canvas. Overlay a grid on the reference and sample colours visually, derive one measured design-token block, generate one HTML file per screen from a single script, verify by re-rendering, and park the reference underneath its mockup. Use when asked to 100% copy / clone an app's UI, rebuild screens from screenshots or Mobbin, extract a design system from reference images, or check a mockup against its reference.
license: Apache-2.0
compatibility: Requires the refkit and artgen commands from super-prototyping-tools, plus Google Chrome for the shoot subcommand. Reference captures are supplied by you; nothing is fetched.
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

Toolkit: `refkit` (grid / sample / bands / bbox / scan / hairline / font /
shoot / diff / blend / tokens / batch / ink / crops / key / montage), plus
`artgen` for the rare asset that has to be drawn. Both are commands on your
PATH, installed with this plugin; `shoot` additionally needs Google Chrome.
Work in `mockups/canvases/<slug>/scratch/`, which is gitignored at any depth.

```bash
refkit --help
```

Worked examples ship with the plugin, alongside the folder skeleton this
skill copies. They live wherever the plugin is installed, not in your
project, so address them through the kit root:

```bash
KIT="$(sp-canvas root)"
ls "$KIT/mockups/canvases"
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
refkit grid p4.png -o g04.png --zoom 3 --minor 10 --major 50
```

Then **read `g04.png` as an image**. Cyan every 10 source px, red and
labelled every 50. Walk the screen element by element and write down the
region each one occupies in source coordinates. Only then sample.

[`references/measuring.md`](references/measuring.md) is the technique: the
four kinds of colour region and the command each one needs, how gutters, row
heights and radii come off the same grid, and how to measure the type face
instead of guessing it. Read it before you sample anything.

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
canvas folder, committed with the boards, one entry per measurement, `{"id", "img", "cmd", "box"}`.
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

`$KIT/mockups/canvases/luma-ios/` is a complete run to copy from: 19 boards (a
token board, two evidence boards, 8 screens, 8 references), a three-row
`layout.json`, a committed `gen.py`, and per-screen mean deltas of 3.47 to
4.50 levels against the captures.

`$KIT/mockups/canvases/duolingo-ios/` is the second complete run, and the one
to read when the screens are mostly illustration: 58 tokens, 8 screens, 128
pieces of art, and per-screen mean deltas of 1.32 to 2.93, the best
screenshot-sourced numbers in the repo. Every picture on it is a crop of the
capture at a measured box, which is most of why. Its `README.md` carries the
experiment that settled crop against generate, the stand-in face whose cap
ratio is not SF Pro's, and two defects that produced no error message. Board
`00e-art-gen` is the generation result, kept as evidence beside the crops it
loses to.

Start from the skeleton rather than a finished board:
`cp -r "$KIT/mockups/canvases/templates" mockups/canvases/<slug>`. Its `gen.py`
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
(`$KIT/mockups/canvases/templates/gen.py` is the skeleton,
`$KIT/mockups/canvases/luma-ios/gen.py` a finished one, and
`$KIT/mockups/canvases/duolingo-ios/gen.py` a finished one that also cuts and
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
small icons stay CSS or inline SVG. `artgen` runs the whole loop,
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
refkit shoot mockups/canvases/<slug>/[01]*.html \
    -o mine --scale 3 --crop-phone --check-overflow
refkit batch probes.json --against mine
refkit diff mine/07-models-sheet.png refs/cp7.png \
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

### Going deeper

[`references/comparing.md`](references/comparing.md) covers subtraction (the
blend that finds "right colour, wrong place"), the offset probe that
separates placement error from colour error, fitting a material you cannot
sample, when a run is actually done, and how to fan out the looking without
fanning out the editing.

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

**Open the board as soon as its first HTML file lands.** The dev server
watches the boards directory and picks up a folder created after it booted,
so there is nothing to restart. If `?canvas=<slug>` opens the wrong board
anyway — right URL, no error — the folder holds no `.html` file yet, and an
empty folder is not a board.

```bash
open "http://127.0.0.1:<port>/?canvas=<slug>"
```

---

## Phase 6: the folder documents itself

A board nobody can audit in six months is not finished, and the canvas shows
pixels rather than reasoning. Three files, all of them small:

**`mockups/canvases/<slug>/README.md`.** Copy the shape from
`$KIT/mockups/canvases/apple-settings/README.md`.

[`references/documenting.md`](references/documenting.md) lists what it has to
carry past a list of screens: the delta table, every substitution and its
consequence, the defects that are the source's rather than yours, and which
assets were generated rather than cropped.

**No folder-level `.gitignore`.** `ref-*.html`, `assets/refs/` and `scratch/`
belong in the project's root `.gitignore`, once, not in a rule per board
folder. Say in the README how many boards a fresh clone builds without the
captures. **`assets/art/` is the exception
and stays committed**: cropped component art is what the boards are made of,
and without it a fresh clone renders empty frames. Say that in the README,
because the surrounding rule points the other way.

**A bullet in the boards directory's own `README.md`**, if it has one: board
count, row structure, the delta range, and the one thing this folder teaches
that the others do not.

Then check the run is reproducible from what you committed:

```bash
python3 mockups/canvases/<slug>/gen.py            # byte-identical, no scratch dir
refkit tokens mockups/canvases/<slug>
```

---

## Pitfalls

[`references/pitfalls.md`](references/pitfalls.md) collects every trap that
has cost a real run time: colour-space surprises, probe windows that miss,
caches that rotate, and the shell mistakes that corrupt a board. Read it
before Phase 1, and again whenever a number will not converge.
