---
name: clone-prototype
description: Clone a real app's screens as pixel-accurate, self-contained HTML artboards on the prototype canvas. Overlay a grid on the reference and sample colours visually, derive one measured design-token block, generate one HTML file per screen from a single script, verify by re-rendering, and park the reference underneath its mockup. Use when asked to 100% copy / clone an app's UI, rebuild screens from screenshots or Mobbin, extract a design system from reference images, or check a mockup against its reference.
---

# Clone Prototype

Three phases, in order. **Never skip ahead** — tokens before HTML, sampling
before tokens. Every colour and every metric in the final HTML must trace
back to a measurement, not to a guess that "looks about right".

Output lands in `mockups/canvases/<slug>/` and the canvas picks it up
automatically — see the `prototype-canvas` skill for how folders become
tldraw pages and how `layout.json` rows work. Name the folder for the source,
e.g. `notion-ios`.

Toolkit: `tools/refkit.py` (grid / sample / bands / bbox / scan / hairline /
shoot / diff / tokens / montage).
Needs `pillow` + `numpy`; `shoot` needs Google Chrome. Work in a scratch
directory, not in the repo.

```bash
REPO="$(git rev-parse --show-toplevel)"
python3 "$REPO/tools/refkit.py" --help
```

---

## Phase 0 — Collect references

Get the highest-resolution capture you can; every later measurement is
capped by it.

- **The user's own screenshot** is usually the authority on *which* screens
  and *which* scroll state. Save each one as its own crop (`p1.png … pN.png`)
  before doing anything else — image caches rotate and the attachment will
  disappear mid-task.
- **Mobbin MCP** (`mcp__mobbin__search_screens`, `search_flows`), when
  available — one search per screen, `platform: "ios"`, and keep
  `task_intent` **identical** across every call in the run. Describe the
  screen in plain language *including its literal on-screen strings*; that is
  what actually matches. Use `exclude_screen_ids` (a JSON array of quoted
  UUID strings) to push past near-misses you already rejected. Download with
  `curl -sL <image_url>`. Results are ~299 × 678 webp — fine for placing on
  the canvas, **too small to be the only sampling source**. Cite results as
  markdown links to their `mobbin_url`.
- **A native-resolution capture of any screen from the same app** (@2x/@3x,
  e.g. 1179 × 2556) settles ink, scrim and accent values that a downscaled
  strip cannot. It does not have to be one of the screens you are cloning.

Record the capture scale once, in **capture px per design pt**, and reuse it
everywhere:

```
scale = screen_inner_width_px / device_pt_width      # e.g. 300 / 393 = 0.7634
```

Cross-check against height (`649 / 852 = 0.7617`). If the two disagree by
more than ~1%, the crop is wrong — recrop before sampling.

---

## Phase 1 — Grid on the image, then LOOK

The rule that makes this work: **draw the grid onto the pixels and read the
result with your eyes.** Sampling coordinates blind produces numbers with no
idea which UI element they belong to, and those numbers end up in the wrong
token.

```bash
python3 "$REPO/tools/refkit.py" grid p4.png -o g04.png --zoom 3 --minor 10 --major 50
```

Then **read `g04.png` as an image**. Cyan every 10 source px, red and
labelled every 50. Walk the screen element by element and write down the
region each one occupies in source coordinates. Only then sample.

### Three measurements, three techniques

**Pass `--pt <scale>` to every region command.** Then you type the same design
pt you read off the grid and that will end up in the CSS, and the answers come
back in pt too — no mental arithmetic between the capture and the stylesheet,
which is where transcription errors get in.

| What | Technique | Command |
|---|---|---|
| Large flat fill (page bg, card, sheet) | flat-neighbour census — a pixel equal to all four neighbours is a real fill, not an antialiased edge | `refkit sample IMG x0 y0 x1 y1 --pt 3` → read **flat fills** |
| Small element (badge, dot, chip, glyph) | mode of the core — no flat interior exists at this size | same command on a core-only crop → read **all pixels**, take the top entry |
| Text ink | mean of the darkest few percent — the mode of any text region returns its *background* | same command → read **ink core** |
| 1pt hairline, divider, card border | coverage solve — a 1pt rule never reaches its true colour in a downscaled capture | `refkit hairline IMG x0 y0 x1 y1 --bg FFFFFF --scale 0.7634` |

The coverage solve sums the ink deficit across the band and divides by the
capture scale, recovering the full-coverage colour a naive pick reports far
too light. **Use the scale of the image you are sampling** — a 3× crop of a
0.7634 strip is `0.7634 × 3 = 2.29`.

A solve that lands within ~2 of the page background means the rule is
invisible at this resolution, which usually means the real UI has **no
divider there** — not that the divider is `#FAFAFA`. Check a native capture
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
`#B3B3B3 .. 396.0` then `#F5F5F5 from 397.0` — to the pixel, in one line.

Expect a small vocabulary of repeated numbers (16/20/26 gutters, 44 tap
targets, 8/10/12/14 radii). If every measurement is unique, you are reading
antialiasing, not layout.

### Deliverable of this phase

A table with an **evidence** column, one row per token. Anything without
evidence does not become a token.

| token | value | evidence |
|---|---|---|
| `--n-text` | `#2C2C2C` | H1 core ink @3x, 3 screens |
| `--n-hairline` | `#E9E8E7` | 1pt coverage solve, settings dividers |
| `--n-border` | `#EFEEEC` | card outline solve |

Re-sample rather than argue: where the strip and a native capture disagree,
**the native capture wins.**

---

## Phase 2 — Design system before any screen

Write one `:root` block and inline it, **byte-identically**, into every
artboard. Artboards render in `<iframe srcDoc sandbox="">`, so there is no
shared stylesheet — a single generator script is what keeps them in sync.

Cover, in this order, with a short prefix per app (`--n-` for Notion):

- `font` — the real platform stack, never a webfont
- colour: backgrounds → fills → hairline/border/track → text ramp → accents
- radii, one per component class (`field`, `card`, `sheet`, `tile`, `pill`)
- type: **composite `font:` shorthands**, not separate size/weight vars —
  `--n-t-row: 400 17px/22px var(--n-font)`
- spacing and geometry constants: gutters, row height, tap target, status
  bar, sheet top inset

`mockups/canvases/notion-ios/00-design-tokens.html` is a finished one from a
real run — copy it, change the prefix, replace every value and every evidence
row.

Build the token board as the **first artboard** of the folder. It is the
contract: when a screen looks wrong later, this is what you check it against.

Once the screens exist, `refkit tokens mockups/canvases/<slug>` enforces the two
invariants this phase rests on: that every board inlines the *same* `:root`, and
that nothing references a token that does not exist — in CSS or in the evidence
table. Run it before you call the board done; a `--x-scrim-3` in an evidence row
that never existed as a token is invisible to the eye and obvious to the linter.

When the evidence table outgrows the 478 × 980 box, split it onto its own
`00b-evidence` board rather than trimming it. The evidence is the deliverable.

---

## Phase 3 — One generator, N artboards

Write **one** script (`gen_<app>.py` in the scratch dir) that emits every
`.html` file. Do not hand-edit the artboards afterwards; edit the generator
and re-run. That is the only thing that keeps eight files consistent through
a dozen correction passes.

```python
TOKENS = ":root{...}"          # from Phase 2, one source of truth
BASE   = ".phone{width:393px;height:852px;...}"
SB     = '<div class="sb">...</div>'          # status bar, 54px
def page(title, extra_css, body): ...          # TOKENS + BASE + extra_css + body
def write(name, html): ...
```

Hard constraints from the canvas renderer (also in
`mockups/canvases/README.md`):

- **Fully self-contained** — the iframe is `sandbox=""`. No external CSS,
  JS, fonts or images. Every image is a `data:` URI; icons are inline SVG.
- **Artboard box is 478 × 980.** Overflow is silently clipped. Do not check
  this by eye — `refkit shoot ... --check-overflow` asks the layout engine and
  exits non-zero with the exact px, so a clipped board fails in Phase 3 rather
  than being noticed in Phase 4.
- Phone frame is 393 × 852 pt at 1pt = 1px: 54px status bar, 125 × 36
  Dynamic Island, 139 × 5 home indicator.
- Avoid SF Symbols private-use glyphs; they render as tofu without SF Pro
  installed. Inline the SVG, or embed a rasterized symbol as a `data:` URI.

Copy is part of the replica. Transcribe the reference's strings exactly,
**including where each line wraps** — a title that breaks after "iPhone and"
instead of "iPhone and AirPods" is a real defect. Force it with explicit
widths, `<br>`, `&thinsp;` or `<wbr>` rather than hoping the browser agrees.

Add `layout.json` last, grouping the artboards into rows (`Foundations`, then
the numbered screens).

---

## Phase 4 — Verify by rendering, not by reading

Render at the capture's own scale and cut the screen out of the frame, so your
render and the reference are the same pixel grid and can be compared directly:

```bash
python3 "$REPO/tools/refkit.py" shoot "$REPO/mockups/canvases/<slug>"/[01]*.html \
    -o mine --scale 3 --crop-phone --check-overflow
python3 "$REPO/tools/refkit.py" diff mine/07-models-sheet.png refs/cp7.png \
    --pt 3 -o d07.png --regions regions.json
```

`--crop-phone` removes the crop step from every iteration; it also masks the
52pt corners, so a cropped screen composites onto any ground without the
four black wedges of bezel a rectangular crop keeps. `diff` writes the
side-by-side **and** prints the numbers behind it: with `--regions` (inline
`{"name": [x0,y0,x1,y1]}`, or a file you write once and reuse for the run) it
tables mine-vs-ref per region with a Δ column; with no regions it ranks the
bands where the two disagree most, which is how you find a defect you have not
thought to look for yet.

Then read the side-by-side image, in this order:

1. Nothing clipped — `--check-overflow` has already answered this.
2. Line wraps match the reference, string for string.
3. Structure: what sits inside the card vs. outside it; which insets differ
   between header and body.
4. Colour: the `diff` table. Trust it over your eye — a defect described as
   "~4 levels dark in one band" turned out, measured, to be a whole backdrop
   desaturated (mean chroma 2.0 vs 5.9) at matching luminance.

Re-render after every correction pass. A correction you have not re-rendered
is not a correction.

### Fan out the looking, not the editing

Verification is per-screen, read-only and embarrassingly parallel; the
expensive resource is *attention on images*. Once the boards render, dispatch
one subagent per screen — each gets `mine/NN.png`, its reference, and the
`--regions` file, and returns a defect list with measured deltas. Ten screens
verify in the time of one.

**Only the looking parallelises.** You stay the single writer: collect every
defect list, then make the fixes yourself in the one generator. Never let
subagents edit — two agents in `gen_<app>.py` will clobber each other, and an
agent that "fixes" an artboard directly has its work silently reverted by the
next regeneration.

Do **not** fan out Phase 1 or Phase 2. Token decisions need one eye and one
vocabulary; five agents sampling five screens independently return five
slightly different greys and a `--x-fill-4` that is two levels off
`--x-fill-3`.

---

## Phase 5 — Park the reference under the mockup

The replica is only auditable next to its source. Embed each capture as a
base64 `data:` URI in its own `ref-NN-<slug>.html`, then add a **third row**
to `layout.json` listing them **in the same order as the mockup row** — rows
are laid out `index * (w + gap)` from x = 0, so item N of row 3 lands
directly under item N of row 2.

```json
{ "title": "Source of truth — captures",
  "numbered": true,
  "files": [{ "file": "ref-01-splash", "label": "Splash" }] }
```

Keep the source's attribution watermark in the image. Caption each one with
its screen id, and state in your report where a reference is a *near*-match
rather than the exact frame (a toast, a different scroll position, one row
label off) — never let a near-match pass as exact.

Then open it: `open "http://127.0.0.1:<port>/?canvas=<slug>"`.

---

## Pitfalls

- **Sampling without looking.** Numbers with no element attached land in the
  wrong token. Grid, read, *then* sample.
- **Trusting a downscaled capture for thin ink.** Hairlines, scrims and small
  accents need the coverage solve or a native capture.
- **Hand-editing a generated artboard.** The next regeneration silently
  reverts it. Edit `gen_<app>.py`.
- **Unbalanced `<div>`s after a structural edit.** Count them
  (`grep -o '<div' | wc -l` vs `</div>`) before rendering.
- **`.replace(old, new, 1)`** when the string occurs twice — bounded replaces
  are how one of two identical paragraphs stays broken.
- **A stray character before a CSS selector** (`; .metrics{...}`) invalidates
  the whole rule with no error. If one block renders in the wrong font, check
  the character in front of its selector.
- **Overflow after adding a row** to a fixed-size board — tighten the padding
  or switch a stacked flex column to a grid; do not just let it clip. Run
  `shoot --check-overflow` after any board grows.
- **Measuring a render's height in pixels.** A card's `box-shadow` paints ~60px
  below its own bottom edge, so a pixel probe reports overflow that is not
  there. Ask the layout engine (`--check-overflow` does).
- **Brand marks.** Third-party logos come from
  `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/<name>.svg` (24×24,
  `currentColor`) — strip the `<svg>` wrapper and the `<title>`, and recolour
  from a sample off the capture. Check the glyph against the capture before
  trusting the file name: lobehub's `grok` is the swirl, while the mark in a
  2025 iOS capture is the xAI "X" (`xai.svg`). A path that fills a hole it
  should leave open (simple-icons' Raycast) needs an SVG `<mask>`, not a
  different fill rule.
- **Image caches rotate mid-task.** Save every reference to the scratch dir
  the moment you receive it.
