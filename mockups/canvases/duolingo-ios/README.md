# Duolingo, iOS

Eight screens of the Duolingo iOS app, six of the learning path and two of
the modal sheets that interrupt it, rebuilt from Mobbin captures, plus the
token board, the two evidence boards and the two art boards behind them. 13
boards, and 8 more that park each capture under its replica.

| # | Board | What it shows |
| --- | --- | --- |
| 01–03 | `path-green`, `path-red`, `path-blue` | The path at three unit colours |
| 04 | `section-done` | Section complete, purple header |
| 05 | `section-next` | Up next, locked section |
| 06 | `jump-here` | The "JUMP HERE?" tooltip and the section divider |
| 07 | `streak-freeze` | Streak freeze sheet |
| 08 | `league-promo` | League promotion sheet |
| 00d | `art` | Every crop, and each screen with its chrome removed |
| 00e | `art-gen` | The same art regenerated, and what that costs |

## How close it lands

Mean absolute delta against the captures, whole 393 × 852 frame, phone crop,
in levels of 255:

| Screen | Δ | Screen | Δ |
| --- | --- | --- | --- |
| 01 Path, green | 1.41 | 05 Up next, locked | 1.83 |
| 02 Path, red | 1.47 | 06 Jump here | 1.32 |
| 03 Path, blue | 2.38 | 07 Streak freeze | 2.59 |
| 04 Section complete | 2.38 | 08 League promotion | 2.93 |

All eight beat `luma-ios`' 3.47–4.50, and the reason is structural rather
than careful: **Duolingo's screens are mostly illustration, and every piece
of the illustration is a crop of the capture at its own measured box**, so
those pixels are the reference's own. What is left to get wrong is the
chrome: cards, buttons, counters, type. That is what the numbers score.
07 and 08 are highest because they are the two screens carrying the most
type.

`refkit batch` replays all 30 Phase-1 probes against the renders: **13 colour
probes at a mean Δmax of 0.5 and a worst case of 6**, 16 box probes at a mean
|dw| of 0.98pt and |dh| of 0.38pt. Ten of the sixteen are inside half a point.

## The art is cropped, not generated

All 128 illustrations on these boards are listed in `crops.json`. Each is
cut from `assets/refs/NN.png` at a measured pt box, written to
`assets/art/<id>.png`, and placed back by `art()` at the same numbers. An
asset therefore cannot drift from where it was measured, and its pixels are
the reference's pixels.

**This was tested against the alternative, not assumed**, and then tested
again properly. Cropping the campfire character out of 03 at its measured box
scores a mean delta of **0**, by construction. Handing the same crop to
`gpt-image-2` as an edit and asking for a faithful reproduction scores
**38.53**: the model returns something recognisably the same character with a
different head-to-body ratio, a redrawn hairline, a resized marshmallow and
the campfire moved. It is a good drawing and a bad measurement.

Doing the generation carefully, one asset at a time on a key colour and
fitted back to the same box, closes about half of that and no more: **18.41**.
That is the number in the workflow figure in the repo README, and it is not
the ceiling. **Packing all six characters into one grid, each in its own cell
at the size and position it has to come back at, scores 3.96**, because the
model then upscales in place rather than composing. Board `00e-art-gen`
carries the six pairs, the four independent runs behind them and the icon
result that failed. `tools/artgen.py` reruns the whole thing;
`.claude/skills/clone-prototype/references/generating.md` is the writeup.

Three things worth carrying out of it:

- **The grid does not care how full it is.** 77 assets in one call scored
  12.97 on the same six icons that scored 14.56 with six assets in the call.
  What predicts the score is the asset's own native size in the capture: 3.42
  at 256-400px, 10.57 at 0-64px. Under about 128px the shape survives and the
  colour does not, so icons stay CSS or SVG.
- **It is repeatable, not lucky.** Four independent returns of the same six
  scored 4.29 / 4.77 / 4.50 / 4.67, and every cell came back at scale
  0.99-1.00 with an offset of at most 1px. Best-of-four is the 3.96.
- **`--quality medium` lands within 0.3 of `high`.** There is no 60s network
  cap: a 3072 x 2048 `high` edit returned in 114s and a 3040 x 2432 one in
  about three minutes. An earlier note in this file claimed otherwise and was
  wrong.

**None of that changes the rule.** A crop scores 0 and a generation scores 4,
so `assets/art/` stays the crops, `assets/art-gen/` is evidence, and the eight
screens are built from the crops alone. Generate only where the pixels do not
exist in the capture. In this clone there is no such case.

## What the file said, and what the renders corrected

Phase 1 measures the capture; Phase 4 measures the render. Five things only
the second one could find.

**The stand-in's cap ratio is 0.762em, not SF Pro's 0.714.** Duolingo's own
Feather Bold is not on this machine, so the board ships `ui-rounded`;
`refkit font` scored 0.353 with SF Compact on top, a weak verdict, meaning
the real face is outside any closed-set candidate list. Every Phase-1
size was derived as `cap ÷ 0.714` and came out about 6% too large. Every
size in the token table is now a cap match measured on the render.

**`ct()`'s constant is 0.115, not SF Pro's 0.2708.** `ct(ink, fs, lh)` =
`ink − ((lh − fs)/2 + K·fs)` puts a line box where the ink lands on a given
row. SF Pro's K put every ink top 2–5pt high in this face. K solves in
closed form from two runs, `K_needed = K_used − (ref_ink − mine_ink)/fs`.
That is worth doing, because guessing the sign is a coin flip and getting it
wrong pushes the text out of the measurement window entirely, where it reads
as a clipped glyph rather than as a bad constant.

**There is no Dynamic Island and no home indicator.** Not in any of the
eight. The templates' frame draws both; a rendered island alone put a
103-level band across the top of every screen. The frame ships without
either.

**There are two status bars in one capture set.** 01, 07 and 08 carry a wider
cellular glyph whose right cluster starts at x 282.5; 02–06 start at 291.9.
`statusbar(ref)` picks between two composite crops rather than averaging
them into one wrong glyph.

**`--x-cta` is `#53ADF0`, not `#55ADEF`.** A two-level correction found by
the probe replay, not by eye.

## Three bugs that produced no error message

Worth writing down because all three looked like measurement problems and
none was.

**`z-index` silently painted over five text classes.** `.pill` and
`.sheetbody` sit at `z-index:1`; the titles, links, the "641" counter and
the UP NEXT label were at `z-index:auto` and simply never appeared. The HTML
was correct, the colours were correct, and 07 and 08 *improved* in the diff
when the text was invisible. Reading the generated CSS is what found it;
reading the generator would not have.

**`refkit bbox` stops at the first low-contrast edge, so four crop boxes cut
their own art.** The avatar on 08 lost both ears: they are pale skin on
white, under the threshold, so the box came back 10.7pt narrow on each side
and `cut()` and `art()` then agreed with each other about the wrong number.
The ice shards on `07-freeze` lost their tips the same way. The other two
were the reverse mistake, a box reused where it did not apply: `03-guide` and
`06-guide` inherited screen 01's numbers, but those two screens carry
two-line unit headers, so the real guidebook icon sits 11.6pt lower and the
crop took half of it plus a band of flat header.

None of that shows in a whole-frame delta, because a clipped ear is a few
hundred pixels of 1.7 million. What finds it is growing the box rather than
thresholding it: label the ink in a padded window and keep only the
components the current box already touches, so a neighbouring element cannot
drag the box outwards. The four corrections took the set from 1.36-2.97 to
1.32-2.93, which is the point: the number barely moved and the picture was
visibly wrong.

**The 06 divider label was overridden to the wrong token.** Its call site
solved its box top from `TS("t-label")` but then set `font:var(--x-t-link)`
in the same style attribute, so it rendered 15% small and nobody could see
why. The probe caught it at a 1.160 width ratio. `t-label` is now 600, not
800, genuinely lighter than the links it sits between.

## Rendering at the capture's scale

The captures are 881 × 1910 for a 393 × 852 frame: **2.2417 px per design
pt**, checked on both axes. `refkit shoot --scale` takes an integer, so
renders come out at 3× and `diff` refuses on the shape mismatch. Downscale
each render to 881 × 1910 with Pillow LANCZOS before diffing, and the whole
Phase-4 loop is one script.

## Details worth not re-deriving

- **Corner radii were fitted, not eyeballed.** Least-squares circular fits:
  card 13.5 (13.25/13.50/13.50 across three headers, rms 0.20), button 10.25
  (rms 0.38), sheet top 16.00 / 17.25, trophy tile 24 from a five-point
  solve. The phone's 52 is a circular stand-in for iOS's 55pt continuous
  corner.
- **The REFILL button holds three strings at three measured x's.** Label,
  gem and price are placed individually inside the button rather than as one
  centred run.
- **`refkit sample` needs `--only ink` inside a probe.** `batch` compares
  the *first* colour a probe prints, and `sample` prints its flat-fill census
  first, so an ink probe without the flag silently compares two backgrounds
  and reports Δ 0. Three probes in this run did exactly that.
- **A probe box is wrong more often than a probe is.** Every entry in
  `probes.json` carries a `_note` proving its window holds the element and
  only it; `refkit batch` ignores any key starting with `_`.

## Assets

`assets/` holds what the boards embed, so they rebuild offline.

- `art/`: 128 PNGs, each a crop of a capture at the box named in
  `crops.json`. **Committed**: without it the boards have no artwork.
- `art-gen/`: the six regenerated characters at 3x their measured box, plus
  the three figures on `00e`. **Committed**, and not used by any screen.
  `art-gen.json` holds a delta per asset and the four runs behind it.
- `refs/`: the 8 captures, 881 × 1910. **Gitignored**, along with the
  `ref-*.html` boards built from them: they are whole app screens, not
  component art.

Chrome is CSS: cards, buttons, panels, rules, type, the status-bar clock.
The captures are Mobbin's, watermark intact, reproduced for design reference;
the artwork is Duolingo's.

## Regenerating

```bash
python3 mockups/canvases/duolingo-ios/gen.py
```

Rebuilds every board and `layout.json`, byte-identical. The boards are
output: edit `gen.py`, never the HTML. With `assets/refs/` present it also
re-cuts `assets/art/` from `crops.json`; without it, it uses the committed
art and skips the 8 reference boards.

Verify with:

```bash
python3 tools/refkit.py tokens mockups/canvases/duolingo-ios
python3 tools/refkit.py shoot mockups/canvases/duolingo-ios/*.html \
    -o shots --scale 3 --crop-phone --check-overflow
```
