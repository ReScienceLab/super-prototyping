# tiktok-feed-ios

TikTok for iOS, the For You feed and its video player: eight screens of one
Mobbin flow, rebuilt from the captures and measured with `refkit`.

```bash
python3 mockups/canvases/tiktok-feed-ios/gen.py
```

Twenty boards. Four foundations — `00-design-tokens` and three evidence
boards, because 46 tokens and their evidence do not fit one 478 × 980 box —
then the eight screens, then the eight captures parked underneath as the
source of truth.

| # | board | state |
|---|---|---|
| 01 | For You | Michael Matti's post at rest, chip and two-line caption |
| 02 | Scrubbing | finger down: fat 11.6pt bar, `00:06 / 00:15` readout, paused triangle |
| 03 | Scrub released | just after release, bar still part-expanded with its knob |
| 04 | Playing | the same post playing, marquee mid-scroll |
| 05 | Pull to refresh | Successful Life's post dragged down, "Drag down to refresh" |
| 06 | Next post | the same post at rest, resting 2.1pt progress line |
| 07 | Caption expanded | starfvhls, seven caption lines, Repost pill, saved bookmark |
| 08 | Caption collapsed | the same post with the caption shut to two lines |

Nothing here is a mock of TikTok's design; it is a replica of eight specific
frames. Every creator, string and count is the capture's own, transcribed
rather than substituted, because a fidelity replica that invents its copy
cannot be checked against anything.

## How close it lands

Mean absolute level delta, 0–255, over the 393 × 852 pt phone crop — the whole
frame, chrome and video together, not a sampled region. The render is shot at
`--scale 3 --crop-phone` (1179 × 2556, exactly 3.0 px/pt) and resized to the
captures' own 882 × 1910 before differing.

| board | Δ | where the worst 40px bands fall |
|---|---|---|
| 01 For You | 4.15 | caption lines 1–2 and chip line 2 over bright river; the status bar band |
| 02 Scrubbing | 4.04 | almost all status bar: the least ink of any board, on the brightest sky |
| 03 Scrub released | 5.68 | the same sky with the caption and chip back on it |
| 04 Playing | 5.40 | same again, plus the marquee at a different scroll phase (below) |
| 05 Pull to refresh | 4.44 | bare near-black video, where both sides read `#000002` and the capture's compression blocks do not |
| 06 Next post | 4.95 | same |
| 07 Caption expanded | 8.14 | seven caption lines over textured video — the most ink on any board |
| 08 Caption collapsed | 5.34 | two lines of the same, over a bright band of the same clip |

Mean 5.27. The spread is a function of how much white type each board sets
over how textured a video frame, not of how well any of them is built: board
07 is board 08 with five more caption lines on the same post, and those five
lines cost 2.8 levels. Every band the diff calls worst on p7
(y 1360–1600) is caption; every band it calls worst on p5 and p6 is bare video
where both sides read `#000002`.

Probe replay, `refkit batch probes.json --against scratch/mine --pt 2.2417`:
**38 probes — 19 colour at mean Δmax 8.7, 19 box at mean |dw| 1.44pt and
|dh| 0.52pt.** The four colour probes still over Δ 10 are read below under
"what is an artifact and not a defect".

## What is cropped and what is rebuilt

Fourteen crops, no generated art. The board's rule is the skill's: only the
picture is cut.

- **The video frame is the only thing cropped** — `v1`…`v8`, each the full
  393.45 × 769.3 pt from the top of the screen down to the tab bar. TikTok
  draws its entire interface on that one moving picture, so each crop carries a
  15–18 box `erase` list that inpaints the nav, rail, chip, caption, scrubber
  and counts back out of the photography, and the board redraws all of it live.
- **Avatars and album discs are crops too** (`avatar-*`, `disc-*`), at
  45.5 × 45.5 and 40.2 × 40.2 pt. They are photographs of three real creators;
  there is nothing to rebuild them from.
- **Everything else is HTML, CSS and 17 inline SVGs** in `assets/icons/`, each
  with its measured ink box as its `viewBox`.

Art ships as JPEG q92: the crops are photographs, and the whole set is 1.65 MB
where the same pixels as PNG are 8.28 MB. The captures are themselves JPEG, so
q92 is re-encoding compression artifacts that are part of what the diff is
matching against rather than adding a new generation of them to clean pixels.
Everything in `assets/icons/` stays vector for the opposite reason.

### The location chip is a scrim, and it is undone before it is redrawn

TikTok scrims the location chip rather than blurring it. p2 and p3 are the one
pair of frames that differ *only* by that chip, which makes the composite
solvable: `chip = 0.587 · video + 16.43`, i.e. `rgba(40,40,40,.41)`. `cut()`
runs that affine backwards over the pixels the chip covered (`unscrim` in
`crops.json`, on seven of the eight crops), so the crop hands back the video
underneath and the board paints its own chip from `--tf-chip` on top. Without
it the chip would be baked into the photograph twice and could never change.

## Substitutions, and what each one cost

- **The face.** `-apple-system` / SF Pro against TikTok's own stack. Cap-height
  ratios agree to within a rounding step at every size — `refkit font` and the
  cap solves in the evidence table are all `cap / 0.714`. What does not agree
  is narrow-base tracking at 11–13px: `t-chip-2` sets ~2% tight
  (`dw +4.5` on the chip's second line, `+4.5` on `copy-w`). It is under half a
  point per word and no wrap moves, so nothing was widened to absorb it.
- **UIKit tightens a line before it truncates.** p1's chip line 1 is the one
  string long enough to truncate, and the capture sets it in 241.78pt where the
  same string at `t-chip` sets 256.50 — 14.72pt spread over 38 gaps. That is
  not a different size; it is UIKit compressing before it ellipsises. Carried
  as `chip_tight=";letter-spacing:-.52px"` on that post only, which is why one
  post in `POSTS` has a property the other two do not.
- **The emoji are the system's.** p7 and p8's caption line 1 ends with U+1FAE7
  (bubbles); Apple's glyph is about 8pt narrower than the one TikTok's capture
  shows, which is the whole of that line's `-8.03` right-edge delta. Every
  other caption line on those boards lands within 4pt.
- **U+10659 is not in any face this board can name.** The ribbon that opens
  starfvhls' caption is a Carian letter and renders as tofu everywhere, so it
  is traced into `assets/icons/bow.svg` at its own ink box (8.9 × 11.6pt) and
  the line starts past it behind a fixed-width spacer. It is drawn, not typed.
- **Captions are absolutely positioned**, line by line, at each line's measured
  ink top. The alternative is a flowed block whose leading has to be solved
  backwards from where seven lines happen to land; positioning each line is
  both shorter and checkable against `boxes.py`.

## What the source itself gets wrong

- **Mobbin composites the Dynamic Island out of its captures.** The top 54pt is
  bare video with no island, no clock and no status glyphs. That is Mobbin's
  edit, not TikTok's screen. The board follows this repo's rule and takes the
  whole status bar from `templates/gen.py` — 9:41, plain island, the shared
  signal/Wi-Fi/battery SVGs — so `statusbar(island=False)` is called for the
  island only, and the top band shows a deliberate difference on every board.
  No probe sits above y 54 for the same reason.
- **The captures have no rounded display corner.** They are cropped to the
  inner screen rectangle, square. The board draws the 52pt corner mask this
  repo's frame ships with, so the four corners diff against square video.
- **The home indicator is the template's too**, 139 × 5 at the foot. Some of the
  captures have it and some do not; the board always does.
- **The marquee's scroll phase is arbitrary.** The music title scrolls, and each
  capture caught it somewhere. p4 shows "ins: Higher - Croixx · Contain" where
  p1 shows "as: Higher - Croixx · Conta". Board 04 sets its own phase, which is
  most of that board's residual over board 01's. The marquee window is marked
  `data-clip-ok` so `--check-overflow` treats the clipping as intended.

## What the renders corrected

Four tokens that a first reading got wrong, kept here because each one took a
measurement to settle and the wrong answer was plausible.

- **The Repost label is black, not TikTok's brand `#161823`.** Three methods
  agree. The covered pixels sit at (3,2,6) on p7 and (4,3,5) on p8; their
  deficit from the white pill runs 1 : 1.010 : 0.987 across the channels, where
  `#161823` would run 1 : 0.991 : 0.944. 51 of 83 label pixels fall below level
  5, where a `#161823` render has a floor of 27 and nothing under it. The probe
  went from Δ 32 to Δ 3.
- **`t-pill` is 13px, not 12.** Two independent measures: the 'R' cap is 9.37pt
  on p7 and 8.92 on p8 against 8.48 at 12px, and the word sets 42.38pt where
  12px sets 39.70. The pill's own delta fell 23.05 → 14.09 on p7 and
  23.57 → 14.00 on p8.
- **The repost glyph was structurally wrong** — drawn as a closed rounded-rect
  loop with open chevron heads, which renders as a blob at 16pt. Measured off
  the capture row by row it is two open strokes and two *solid* triangles:
  stroke 1.79pt, elbow radius ~1.0 (not 2.9), heads 6.69 × 4.2pt, stems at
  x 21.36 and 30.72. `assets/icons/repost.svg` is now that.
- **The resting progress line is its own thing, not the scrub bar drawn thin.**
  It was 1.4pt at `.5` over the expanded bar's `track .24`. Solved as an
  integral over p5 and p6 it is 2.1pt, its played half reads 131.5 / 130.2 over
  near-black video and its unplayed half 39.2 / 30.9 — far under what `.24`
  gives. It ships as `--tf-rest` `.43` over a new `--tf-rest-track` `.135`.

## What is an artifact and not a defect

Four things here look like measurement and are not. Each cost a pass to find.

- **`--only flat` is unstable over textured video.** It reports a modal colour,
  and a modal colour over compressed video moves with the texture, not with the
  token. `chip` Δ 16, `track` Δ 22 and `rest-track` Δ 10 are all this: taking
  the mean over each probe's own window instead gives −1.1, −1.2 and ~+4
  levels, and the chip's scrim round-trip is neutral to 1.2 levels. The two
  probes too thin for even a flat census — `rest` and `rest-track`, a 2.1pt
  line — take `--only all` and say so in their notes.
- **`cut()`'s inpaint runs bright under a large erase box.** `play`'s Δ 42, the
  worst number in the batch, is the paused triangle sampled *through* the
  inpainted region its own erase box created: +11.1 levels of it is the
  inpaint, not the token. Part of `track`'s and `chip`'s residual is the same.
- **A tight `--ink` window reads a compression tail, not a plateau.** `ink-tab`
  Δ 11 is eleven outlier pixels inside a brightest-2% window. Ratioing the
  inactive 'Profile' label against the active 'Home' label in the same row —
  same ink, same compression, so the overshoot divides out — gives 0.803 /
  0.801 / 0.803 on p1, p5 and p7 against the render's 0.799. `--tf-ink-tab` at
  `.8` is right.
- **`boxes.py`'s threshold clips dimmed ink.** p1's caption line 2 reads
  `-37.03` at threshold 225 and `-1.79` at 185. The difference is the trailing
  `more`, set in `--tf-ink-3` (`.75` = 191): it clears 225 in the capture only
  because bright river runs underneath it. A row whose ink is dimmed needs its
  own threshold, which is why the `ROWS` table carries one per row.

Two more, about the render side rather than the reference:

- **Resize the 3× shot with BILINEAR, not LANCZOS.** LANCZOS rings: 11px type
  drawn at `.85` tops out at 222 in the 3× shot and at 255 after the resize,
  brighter than the ink can be. `scratch/t25.py` ran the diff against five
  filters and BILINEAR won on every board.
- **Chrome snaps box edges to whole device pixels at 3×, with no antialiasing.**
  A sub-point nudge to a 2pt bar is a whole-pixel jump: moving the resting line
  767.1/1.8 → 767.3/1.85 *dropped* its ink 17%, because 6 device px became 5.
  It ships at 767.2/2.1, which rounds to 2302–2308 — 6 px, the option whose
  centroid is closest to the capture's.

## Files

`gen.py` is the only source of truth; the 20 `.html` boards are its output.
`crops.json` (14 crops plus its own note) is the artwork's evidence,
`probes.json` (38) the tokens'. `assets/art/` holds the 14 crops, inlined as
`data:` URIs; `assets/icons/` the 17 SVGs, inlined as vectors so the canvas
inspector can name them. `assets/refs/` and `ref-*.html` hold third-party
captures and are not committed — `scratch/render.py` and `gen.py` rebuild them.
Everything a run derives lives in `scratch/`.
