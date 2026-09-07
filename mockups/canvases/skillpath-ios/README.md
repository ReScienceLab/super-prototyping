# Skill Path

Five screens of an unnamed gamified self-improvement app, rebuilt from a nine
second screen recording posted by
[@BreejeAnadkat](https://x.com/BreejeAnadkat/status/2096553815071993964). The
clip pans and zooms across three iPhone 17 Pro simulator windows; two of them
hold this app. A Home tab with a streak card, a level bar and a quest list, and
a Path tab with a serpentine road of lessons. The folder is named for the Path
tab's own title, because the app never names itself.

23 boards, five of which park the source frame under its replica.

| # | Board | What it shows |
| --- | --- | --- |
| 01 | `home` | Home, no quest cleared, "0/5 completed" |
| 02 | `home-quest-done` | the same screen one quest later, row 1 ticked |
| 03 | `path` | the Path tab at the top of its scroll |
| 04 | `path-scrolled` | the same content 184.3pt further down |
| 05 | `lesson-sheet` | the Barrier Repair sheet over a scrimmed Path |
| 00, 00b–00f | `design-tokens 1/6` … `6/6` | the 73 tokens, 13/12/12/12/12/12 to a board, one `:root` shared by every one of the 23 |
| 00g–00m | `evidence 1/7` … `7/7` | what each of those 73 was measured on, 11/11/11/10/10/10/10 to a board |

A fresh clone builds the first 18. The five `ref-*` boards hold third-party
video frames, so they are gitignored and `gen.py` skips them when
`assets/refs/` is absent. `layout.json` names them either way — the canvas
drops a row entry whose file it cannot find, so a committed layout that
mentions the references does not go dirty on a capture-less regeneration.

### Why the foundation boards are plural

73 tokens and 73 evidence rows are about 4000px of table, and the artboard is
980px tall, so a single pair of boards showed roughly a quarter of itself and
clipped the rest in silence. The fix is to split, never to trim — the evidence
is the deliverable — so `gen.py` chunks both tables at `TOK_ROWS` and
`EV_ROWS`, and both numbers are measured rather than eyeballed: the tallest
chunk of each candidate is rendered on its own and put to

```bash
refkit shoot ./0*.html -o scratch/ovf --scale 2 --check-overflow
```

14 token rows fit and 15 overflow by 10px — and it is the one chunk that
carries `--sp-font`'s 107-character stack that decides it, not the row count on
its own. 11 evidence rows fit and 12 overflow by 5px. `TOK_ROWS` and `EV_ROWS`
are then read as caps rather than as slice sizes: six boards of
13/12/12/12/12/12 rather than five of 14 and a three-row stub, every chunk
still under the count that was measured. Two things about that check are worth
knowing, because both of them hid this:

- **Do not pass `--crop-phone`.** With it a full-bleed board is cropped to the
  phone rect before the check runs, and a table 3000px past the bottom never
  shows up at all. That is why the five screen boards, which are checked with
  the crop, were fine and these two were not.
- **It does not see horizontal overrun.** The probe flags an element whose own
  `overflow` is `hidden` and scrolls, not the page running wider than the
  board. The token table had sized itself to `--sp-font`'s 107-character stack:
  its row dividers measure 1033px across, starting at the 24px body padding and
  ending 579px past the right edge of a 478px artboard, so the entire value
  column was off the board — and `--check-overflow` reported `fits` on every
  run. It was found by looking at the render. Both tables are now pinned to
  `TW = 430px`, which is 478 less the 2 × 24px body padding, with
  `table-layout: fixed` and `overflow-wrap: anywhere` so a long value wraps
  down the column instead of stretching the board sideways.

## How close it lands

Mean absolute delta against the source frames, whole 402 × 874 frame, phone
crop, in levels of 255:

| Board | frame | Δ | Board | frame | Δ |
| --- | --- | --- | --- | --- | --- |
| 01 Home | c1 | 9.04 | 04 Path scrolled | c3 | 7.95 |
| 02 Home, one cleared | c2 | 8.11 | 05 Lesson sheet | c5 | 5.88 |
| 03 Skill Path | c4 | 6.88 | | | |

`refkit batch probes.json --against scratch/mine` replays all **59 Phase-1
probes** against the renders:

- **21 box probes** — every string whose size is a token — at a mean |dw| of
  **0.62pt** and a mean |dh| of 0.81pt. Eleven of the 21 match the capture's ink
  width exactly; the worst is `t-date`, the two-glyph "12" of the selected
  weekday, at 5.7%, and the worst on a whole string is `t-h2` at 1.9%.
- **7 edge scans** — both card gutters, both road verticals, the button lip,
  the sheet top and the tab bar top — all within **1.9pt**, five of them within
  1.0.
- **31 colour probes**, mean Δmax 9.1. All 11 flat-fill probes are exact
  matches. All 9.1 of the mean lives in the ink cores, and it is one
  systematic effect, described below.

These numbers sit alongside `flashcard-onboarding`'s 6.17–7.05, the repo's
other canvas cloned from a video, and well above `duolingo-ios`'s 1.32–2.93,
which was cloned from stills. **A video frame is not a screenshot.** At 1.01 to
1.08 capture px per design pt a 12px label is eleven pixels tall through an
H.264 encoder, and a sharp render diffed against a soft frame scores an error
the geometry does not contain.

What the residual is made of, measured rather than assumed:

| | c1 | c2 | c3 | c4 | c5 |
| --- | --- | --- | --- | --- | --- |
| whole frame | 9.04 | 8.11 | 7.95 | 6.88 | 5.88 |
| excluding the four 60pt corners | −0.81 | −0.88 | −0.91 | −0.96 | −0.72 |
| best whole-frame shift within ±2px | −0.79 | −0.28 | −0.11 | −0.05 | −0.00 |
| Gaussian blur on the render, best radius | −0.64 | −0.61 | −0.33 | −0.29 | −0.27 |

The corners differ because the capture keeps whatever was outside the device's
rounded corner and the board shows the artboard's page. The shift column says
registration is right to within a pixel on four of the five. The blur column is
the price of a sharp render against a soft source and it is not payable — the
rest is glyph antialiasing across the whole frame.

The one band that is worse than the frame on every screen is **y 0–40, at
Δ 24–33**. That is the status bar, and it is deliberate; see below.

## The face is not called

`refkit font` returns **"no call, weak"** twice: on the largest glyph on Home
(the "3" of 3 Days, 0.721 SF Pro) and on the Path title (the "S" of Skill Path,
0.510 SF Pro Rounded). A 1.01× video frame of a 24pt cap cannot separate SF Pro
from SF Pro Rounded, and the ranking is not promoted into a claim. The source
is a simulator build with no custom face in it, so `--sp-font` is the platform
stack and the cut is not stated.

**The stand-in's bill arrives as width, and every size in the file was fitted
to it.** SF Pro is not installed in this renderer either — a probe of eight
stacks (`-apple-system`, `BlinkMacSystemFont`, `SF Pro Text`, `SF Pro Display`,
`SF Compact Text`, `Helvetica Neue`, `Helvetica`, `Arial`) came back
byte-identical — so the boards are set in the platform fallback. The 20 rows of
`TYPE` in `gen.py` each carry the reference's ink width, the board's ink width
and the probe id that measures both, and `refkit batch` re-runs all 20 on
demand. Nothing in the ramp was read off a cap height, because a cap measured
through H.264 blur is 1–2pt taller than the glyph: `CURRENT STREAK` read as
14px that way and set 18% too wide, and `1/5 completed` read as 14px and set
26% too wide.

### The renderer's metrics, not SF Pro's

`tx()` places a run by the cap top the grid actually shows, which means
inverting the font's own metrics. Using SF Pro's nominal 0.714 em cap put every
run on the board low by 0.105 × font-size — 3.3pt on the 31.5px "3 Days".
`scratch/met.html` renders `HXE` at 12 / 18 / 25 / 31.5 / 40px inside a block
of known top: the fallback's cap top lands at `lh/2 − 0.350·fs` below the block
top, to ±0.008 across all five sizes, and its cap measures **0.733 em**. That
one constant is worth **1.50 on c1 and 1.31 on c2**, and 0.2–0.3 on the
three Path screens, which carry less type: putting `CAP_TOP` back to the
0.245 that SF Pro's metrics imply takes the five screens to
10.53/9.40/8.19/7.11/6.20.

## The chrome is the repo's, not the source's

The phone frame and the status bar both come from this repo, not from the
recording, on the same principle: standard chrome wins, so that a board reads
next to the other canvases in this folder.

- **The phone frame** is `--sp-r-phone: 55px`, a circular stand-in for the 17
  Pro's continuous display corner, and the same number `refkit --crop-phone`
  masks.
- **The status bar** is `statusbar()`, the `.sb` / `.sb .time` / `.sb .island`
  rules and the `SB_ICONS` inline-SVG cluster, copied **verbatim from
  `templates/gen.py`**: clock at `top:18.2px; width:142.4px`, island 125 × 36
  at top 11, the three glyphs at their fixed left/top. The source's own bar was
  never measured and none of its glyphs were cropped.

That decision is priced, not assumed: it is most of the Δ 24–33 in the top
40pt band of every screen, and it is the reason **there is no status-bar probe
in `probes.json`**. There is nothing to score there that would be scoring the
source. The only thing the boards take from the source's bar is the clock
*string* — 5:54, 5:55 and 6:09, the simulator's own time in the three windows —
because that is content, not chrome.

## Crop it, do not draw it

17 assets, listed in `crops.json`, cut from `assets/refs/cN.png` at a measured
pt box, written to `assets/art/<id>.png` and placed back by `art()` at the same
numbers. **84 KB total**, nothing over 8 KB.

| ids | what |
| --- | --- |
| `medal`, `crown`, `avatar` | the streak medal, the level crown, the header avatar |
| `home-clouds`, `cloud-l` | the two photographic cloud washes |
| `ic-dumbbell`, `ic-mewing`, `ic-skincare`, `ic-razor` | the four quest-row icons |
| `chip-skincare`, `chip-hair`, `chip-oral` | the three category-chip glyphs |
| `bolt-lv`, `bolt-chip`, `gem-hdr`, `gem-chip`, `lock` | the XP bolts, the gems, the keyhole |

Each box carries its own background rather than being cut out to alpha, because
each is placed back at the pt it was cut from, over ground the generator paints
to the same token. A tight cut-out would only add a matte line.

**Everything else is CSS**: the streak and level cards, the quest rows and their
progress rings, the weekday strip, the level track and its nodes, the whole
serpentine road and its dashes, the category pills, the lesson sheet, the
START LESSON button, the tab bar and all four of its icons, and every glyph of
type.

Two things that look croppable are not:

- **The lesson sheet's scalloped top.** Its measured boundary fits five circles
  whose centres all land on y 705, so it is five `border-radius` discs. A crop
  there would carry the scrimmed road behind it and could not be reused at the
  other scroll position.
- **The header's frosted veil.** `backdrop-filter: blur(13px)` over
  `rgba(157,205,232,.55)`, solved from the sky at #9BCBE6 reading #C5DBED where
  the road passes under the header. Cropping it would freeze one scroll
  position into the art.

## Defects in the source, kept

- **Three of the five quest rows are the same quest.** Rows 1, 4 and 5 all read
  "Morning Skincare Routine / Apply cleanser, moisturizer and Shampoo", with
  three different icons — a jar, a jar again and a razor. Replicated as read.
- **The recorder's cursor is in three frames.** An arrow sits over the Barrier
  Repair node in c4, over the Weekly Exfoliation XP pill in c3 and over quest
  row 1 in c1. It is not drawn on any board, so those three regions carry a
  small permanent delta.
- **c3, c4 and c5 include one row of bezel.** Row 0 of those three captures
  reads #0D252D, #112A27 and #1F2B33 where the screen-inner rect should already
  be content. The scale solve is unaffected — it is fitted on the full rect —
  but it is part of the top band's score.

## Guessed, not measured

**One string.** Node `n1`'s label on the Path screen sits behind the frosted
header on every frame in the clip; only a capital C is legible. The board says
"Morning Cleanse". It is a plausible reading of one letter and the app's
vocabulary, and nothing else in the file is like it.

## Three measurement notes

- **There is no capture scale, there are five.** The clip zooms, so `SCALES` in
  `gen.py` carries one px-per-pt figure per frame — c1 1.01194, c2 1.07450,
  c3 1.01490, c4 1.01490, c5 1.07985 — and every probe row in `probes.json`
  carries its own `"pt"`. Boxes are always design pt.
- **The device is 402 × 874, not 393 × 852.** That is an iPhone 17 Pro. Solving
  each frame's screen-inner rect against 402 × 874 makes its width and height
  scales agree to **0.07%**; against 393 × 852 they disagree by 0.34%.
- **Downscale renders with an area average, not LANCZOS.** The verify loop
  shoots at 3× and resamples to each capture's pixel size. LANCZOS rings, and
  the ringing lands exactly where the ink probes read. Switching
  `scratch/rs.py` to `Image.BOX` took the five screens from
  9.15/8.26/8.05/6.98/5.97 to 9.03/8.09/7.95/6.88/5.88 — the table above
  reads 9.04 and 8.11 on the first two because a later crop fix to
  `bolt-chip` cost them 0.01 and 0.02 — and made every ink
  probe on the render return its declared token *exactly* — `#0E1114`,
  `#575757`, `#8B959E`, `#22323E`, `#9FB2BF`. That is the useful result: the
  render reaches the token, and the whole of the colour probes' Δ column is the
  capture's own blur bias. `gem` is the extreme case at Δ 64, a 10px magenta
  glyph two pixels wide in a 1.07× frame, whose darkest 2% comes back
  desaturated at #8D6898 against the board's #B23BD8.

## Rebuilding

```bash
python3 mockups/canvases/skillpath-ios/gen.py
refkit tokens mockups/canvases/skillpath-ios
```

`gen.py` is the only source of truth; the `NN-*.html` boards are its output.
It re-cuts `assets/art/` from `assets/refs/` when the captures are present and
leaves the committed crops alone when they are not, so the seven non-reference
boards regenerate byte-identically from a fresh clone.

**`cut()` needs Pillow, and it fails quietly without it.** The import sits
inside a `try`, so a bare system `python3` regenerates every board and silently
skips `assets/art/` — a changed box in `crops.json` then looks applied and is
not. Editing a crop box means regenerating with an interpreter that has Pillow:

```bash
~/.local/share/uv/tools/super-prototyping-tools/bin/python \
  mockups/canvases/skillpath-ios/gen.py
```

That path is where `uv tool install` puts `super-prototyping-tools`; any
interpreter with Pillow will do. Not a hypothetical: `bolt-chip`'s box
originally reached 5.5pt into the "+" of "+25 XP" and put a stray fragment on
every quest row, and the first fix appeared to do nothing for exactly this
reason.

`icon.png` is drawn, not cropped: the app is unnamed and its own icon never
appears in the recording, so the icon is this board's own Path tab glyph over
its own sky tokens, built by `scratch/icon.py`. Nothing in it is claimed as
measured.
