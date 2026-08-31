---
name: clone-prototype
description: Clone a real app's screens as pixel-accurate, self-contained HTML artboards on the prototype canvas. Overlay a grid on the reference and sample colours visually, derive one measured design-token block, generate one HTML file per screen from a single script, verify by re-rendering, and park the reference underneath its mockup. Use when asked to 100% copy / clone an app's UI, rebuild screens from screenshots or Mobbin, extract a design system from reference images, or check a mockup against its reference.
---

# Clone prototype

Six phases, in order. **Never skip ahead.** Tokens before HTML, sampling
before tokens. Every colour and every metric in the final HTML must trace
back to a measurement, not to a guess that "looks about right". The one
thing built out of order is Phase 5's reference row: it needs no
measurement, so it goes up first (see Phase 5).

Output lands in `mockups/canvases/<slug>/` and the canvas picks it up
automatically. The `prototype-canvas` skill covers how folders become tldraw
pages and how `layout.json` rows work. Name the folder for the source,
e.g. `notion-ios`.

Toolkit: `tools/refkit.py` (grid / sample / bands / bbox / scan / hairline /
font / shoot / diff / blend / tokens / batch / ink / crops / montage).
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

The coverage solve sums the ink deficit across the band and divides by the
capture scale, recovering the full-coverage colour a naive pick reports far
too light. **Use the scale of the image you are sampling.** A 3× crop of a
0.7634 strip is `0.7634 × 3 = 2.29`.

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
refkit scan  IMG col 196 380 410 --pt 3           # colour runs -> the exact edge
```

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

`font` renders your word in every candidate face and ranks the letterforms at a
common cap height, searching weight and tracking. The system UI faces are always
in the set; `--fonts DIR` adds any `.ttf`/`.otf`/`.ttc` you have, and is what you
need for a brand face. Closed-set matching is the point. The published
classifiers pick from ~3,000 Google Fonts and **cannot return "SF Pro"** at all
(`docs/font-identification.md` has the measurements).

Read the verdict line, not just the ranking:

- **call.** One face clears the next by the margin. Write it down with its
  score.
- **no call.** The top faces are inside the margin. Either they are
  indistinguishable at this size (SF Pro vs SF Pro Rounded differ only in
  corner rounding) or the real face is outside your candidate set. Record the
  *family*, or go find the font file. Never promote the top row of a no call.
- **weak.** Top score under 0.80. First check the box holds exactly the word
  you named and nothing else. One clipped leading glyph took a real run from
  0.93 to 0.49. Then re-run on the largest instance of the same face.

Pick the biggest word on the screen, a title rather than a tab label, and
confirm on a second screen before it becomes a token.

`font` names the face; calibrate *size* against the engine that ships the
pixels. PIL renders SFNS about 6% narrower than Chrome renders
`-apple-system`, so a width matched in PIL is wrong on the board. Check
sizes on `shoot` output, or you discover the 6% three phases later. And
read a residual before correcting it: +4.7pt of width over 29 characters of
nav title is tracking (`letter-spacing:-.16px`), not a size error.

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
`mockups/canvases/notion-ios/00-design-tokens.html` is a smaller
single-board example. Copy one, change the prefix, replace every value and
every evidence row.

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
(`mockups/canvases/luma-ios/gen.py` is the shape). Do not hand-edit the
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
  jarring next to its neighbours. The exceptions are the full-bleed sheets —
  the token board and the evidence boards — which *are* their background and
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

### Subtract, do not squint

A side-by-side answers "is this the right colour". It is bad at "is this the
right colour in the wrong place", which is most of what is actually wrong.
Blend the two instead, the way a difference layer works: your render into
red, the reference into green and blue. Agreement goes grey, reference-only
ink goes red, yours goes cyan.

```bash
python3 "$REPO/tools/refkit.py" blend mine/10-home.png refs/h2.png \
    --pt 3 --y0 760 --y1 852 --zoom 2 -o tab.png
```

Every element then reads at a glance. A red edge above a cyan edge is one
element a point too low. A red halo all the way round is a glyph rendering
small. An all-red word is a word you did not draw. Six cover crops in the
luma home run sat a couple of points off their boxes and had each passed a
side-by-side; the blend showed all six in one look.

`blend` also shifts the reference against your render a capture pixel at a
time and prints the mean Δ per offset. A clean V centred on zero means the
band is placed right and whatever Δ is left is colour. A V centred on -1.0
means a one-point layout drift and no colour problem at all, so chasing it
through the tokens would have wasted the pass. That probe found a 17.6pt
gap that should have been 16.6, on all three of a screen's row breaks
at once.

### Some values cannot be read off a pixel

A translucent bar over blurred content has no pixel that holds its fill or
its blur radius: every pixel is a mix of both, plus whatever is behind.
Sampling harder will not help. Fit instead. Put candidate values through the
generator, render, score the band against the capture, and walk a grid.

```bash
for blur in 12 20 28 40 56; do for alpha in .35 .50 .65; do
    sed -i '' "s/--x-hdr-blur:blur([0-9]*px)/--x-hdr-blur:blur(${blur}px)/" gen.py
    python3 gen.py && refkit shoot ... && score_the_band
done; done
```

Coarse grid, one refinement pass around the minimum, then stop. Luma's tab
bar went from `blur(24px)` at `.78` to `blur(40px)` at `.48` this way, 45.5
to 35.0 summed over three screens, with one clean minimum in each axis.
Record it: "swept, minimum at 40px/.48, and 24px/.78 costs 10 levels" is
evidence. "Looks about right" is not.

The same fit tells you when two things you assumed were one token are two.
Luma's tab bar and sticky header share a blur but not a fill: over the plain
page the header leaves the ground untouched while the bar takes it three
levels down. No single fill satisfies both, and the sweep says so by
refusing to settle.

### Call it

Refinement has a floor, and you reach it long before the deltas reach zero.
Stop when any of these is true:

- the worst remaining bands are ones you cannot fix: the Dynamic Island the
  capture does not show, a watermark strip, a photograph you re-encoded;
- a full sweep of a parameter moves the number by less than a level;
- the blend is grey everywhere except sub-pixel fringing on glyph edges.

Every screen inside roughly 4-7 levels mean absolute delta over the body,
with no structural defect left in the blend, is a finished run. Write the
numbers into the folder's README and stop. Another pass there costs a
session and buys a level.

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
globs `mockups/canvases/*/*.html`, which sits outside the canvas app's Vite
root, and a running server does not reliably notice a folder created after it
booted. When it does not, `?canvas=<slug>` matches no page,
`applyCanvasFromUrl` returns silently, and the canvas opens on whichever
board tldraw last persisted — right URL, no error, wrong board. A boot is
~150 ms; do not start debugging artboards you cannot see until you have done
it.

The server runs under tmux, so restart it there rather than backgrounding it
from a tool call. Three details, each of which costs a confusing round trip
when missed: a bare `npm run dev` is blocked by a hook and **the whole shell
command must start with `tmux`** (a leading `cd` trips the same hook, so pass
the directory with `-c` and an absolute path); pass **`--host 127.0.0.1`** or
Vite binds `localhost` only, which resolves to `::1` here and makes every
`127.0.0.1` request fail with a bare connection error; and read the pane back,
because `--strictPort` fails loudly rather than drifting to 5174.

```bash
tmux kill-session -t canvas 2>/dev/null
tmux new-session -d -s canvas -c "$PWD/canvas" \
     "npm run dev -- --host 127.0.0.1 --port <port> --strictPort"
tmux capture-pane -p -t canvas | tail -5      # confirm it bound
open "http://127.0.0.1:<port>/?canvas=<slug>"
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
- **Brand marks.** Third-party logos come from
  `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/<name>.svg` (24×24,
  `currentColor`). Strip the `<svg>` wrapper and the `<title>`, and recolour
  from a sample off the capture. Check the glyph against the capture before
  trusting the file name: lobehub's `grok` is the swirl, while the mark in a
  2025 iOS capture is the xAI "X" (`xai.svg`). A path that fills a hole it
  should leave open (simple-icons' Raycast) needs an SVG `<mask>`, not a
  different fill rule.
- **Thresholding luminance to find an element's extent.** A near-white band
  (243,245,247) on a near-white page (245,245,247) is invisible to any fixed
  threshold, so the element reads as ending early and you "fix" a layout that
  was already right. Probe each row against the page gutter beside it, not
  against an absolute value. This cost two wrong diagnoses in one session: an
  80pt cover measured as 63.7, and a row top declared 5.3pt late when the
  layout was inside a point.
- **Cropping an asset by eye instead of at its measured box.** Take the
  element's own box (`refkit bbox` gives it) out of the capture at the
  capture's own scale. Then the capture's rounded corners land under your CSS
  radius and the art registers 1:1. Every offset cover in the luma home run
  was a crop carrying a strip of page, not a layout error.
- **Comparing against a capture you have not trimmed.** Mobbin exports carry
  a watermark strip below the screen, so a 2676px capture of an 852pt screen
  is 40pt of someone else's branding. Crop to the device height before
  `diff`, or it exits on a shape mismatch and you start doubting the render.
- **Assuming a floating pill because the icons are inset.** Read the gutter
  columns, x 6 and x 386, straight down through the bar. Luma's tab bar is a
  full-width material with a hairline at its top edge and the home indicator
  inside it; the replica drew a 353pt pill and let sharp page content show
  through the 84pt below it for four screens before anyone measured x 6.
- **Image caches rotate mid-task.** Save every reference to the scratch dir
  the moment you receive it.
