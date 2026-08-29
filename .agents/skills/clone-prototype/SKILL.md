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

Toolkit: `tools/refkit.py` (grid / sample / hairline / shoot / montage).
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

| What | Technique | Command |
|---|---|---|
| Large flat fill (page bg, card, sheet) | flat-neighbour census — a pixel equal to all four neighbours is a real fill, not an antialiased edge | `refkit sample IMG x0 y0 x1 y1` → read **flat fills** |
| Small element (badge, dot, chip, glyph) | mode of the core — no flat interior exists at this size | same command on a core-only crop → read **all pixels**, take the top entry |
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
labels, divide by the scale, round to the nearest sensible pt. Expect a small
vocabulary of repeated numbers (16/20/26 gutters, 44 tap targets, 8/10/12/14
radii). If every measurement is unique, you are reading antialiasing, not
layout.

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

`mockups/canvases/example-app/00-design-tokens.html` is a working template —
copy it, change the prefix, replace every value and every evidence row.

Build the token board as the **first artboard** of the folder. It is the
contract: when a screen looks wrong later, this is what you check it against.

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
- **Artboard box is 478 × 980.** Overflow is silently clipped — check every
  fixed-height board.
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

```bash
python3 "$REPO/tools/refkit.py" shoot "$REPO/mockups/canvases/<slug>"/*.html -o shots --scale 2
python3 "$REPO/tools/refkit.py" montage shots/0*.png -o mine.png --height 520
python3 "$REPO/tools/refkit.py" montage refs/p*.png  -o ref.png  --height 520
```

Read both montages and diff them by eye, in this order:

1. Nothing clipped — every fixed-size board fits 478 × 980.
2. Line wraps match the reference, string for string.
3. Structure: what sits inside the card vs. outside it; which insets differ
   between header and body.
4. Colour: re-run `refkit sample` on your own render and compare the census
   against the reference's, region for region.

Re-render after every correction pass. A correction you have not re-rendered
is not a correction.

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
  or switch a stacked flex column to a grid; do not just let it clip.
- **Image caches rotate mid-task.** Save every reference to the scratch dir
  the moment you receive it.
