# Claude, iOS

Fifteen screens of the Claude iOS app across four flows — asking Claude,
voice mode, a PDF attachment, a photo attachment — rebuilt from Mobbin
captures at 3×, plus the token board and the two evidence boards behind
them. 18 boards, and 15 more that park each capture under its replica.

| # | Board | Flow |
| --- | --- | --- |
| 01–03 | `home-typed`, `sent`, `streaming` | Asking Claude |
| 04–07 | `voice-listening`, `voice-warm`, `voice-deep`, `artifact` | Voice input |
| 08–11 | `home`, `file-typed`, `file-sent`, `file-answer` | File input |
| 12–15 | `add-sheet`, `photo-attached`, `photo-typed`, `photo-answer` | Image input |

## How close it lands

Mean absolute delta against the captures, whole 393 × 852 frame, phone crop,
in levels of 255:

| Screen | Δ | Screen | Δ | Screen | Δ |
| --- | --- | --- | --- | --- | --- |
| 01 Home, typed | 7.07 | 06 Voice, listening 2 | 11.75 | 11 File answer | 16.34 |
| 02 Question sent | 4.22 | 07 Artifact card | 9.99 | 12 Add to Chat | 4.13 |
| 03 Answer streaming | 23.16 | 08 Home, empty | 4.43 | 13 Photo attached | 4.29 |
| 04 Voice, listening | 3.61 | 09 File attached | 6.88 | 14 Photo, typed | 6.66 |
| 05 Voice, interrupt | 11.74 | 10 File sent | 3.36 | 15 Photo answer | 17.50 |

These are an order of magnitude larger than the Figma-sourced folders in this
repo, and the reason is one substitution, not fifteen defects. **The screens
that are mostly chrome land at 3–7. The screens that are mostly serif body
text land at 10–23.** Georgia is the right size for Tiempos — a five-item
answer list measures 18.7pt of ink against Tiempos' 18.7 — but about 11%
wider (257.0 vs 295.7 on the same line), so every line of prose drifts right
of its reference and the per-pixel delta counts the whole paragraph twice.
Nothing above the answer column moves. Screen 04, whose whole lower half is
one gradient, is the best board in the set at 3.61.

## Two faces, both stand-ins, both stated

`refkit font` returns **no call** on the sans (0.760 / 0.725 / 0.710 at 13pt
cap): the real face is **Styrene**, Anthropic's brand face, which is outside
any candidate set a closed-set matcher can hold. The system stack is the
honest stand-in and the token says so. The serif is **Tiempos**, same
situation; Georgia wins a width-fit over the seven installed serifs at 1.00
body / 1.01 heading, next best 0.99.

The substitution has a consequence past the diff numbers: **SF Pro sets
wider than Styrene**, so "Give me a 7-day healthy meal plan" wrapped to two
lines inside a bubble the capture shows as one. The fix is the bubble's
`max-width`, raised from a measured 302.6 to 316, not a smaller type size.
Where a substituted face changes a wrap, the wrap wins.

## What the captures actually show

**They arrived in two colour spaces.** Captures 08–15 are untagged Display
P3; 01–07 are already sRGB. Sampled as-is, the same brand orange reads
`#E07A54` on one half of the set and `#D97757` on the other, and the page
ground splits `#FCFAF6` / `#FBF9F5`. Everything here was measured after
converting 08–15 to sRGB. The residual ground spread — `#FBF9F5` shipped,
`#FCFAF6` on the first batch — is a real per-capture difference and one
token; the orange is not, and resolves to a single `--c-accent`.

**There are two oranges, and that one is real.** `--c-accent` `#D97757` is
the star mark and the new-chat bubble. `--c-send` `#CB6442` is the send
button, measured on 01, 08 and 13 — a darker orange, after the P3 fix, on
the same screen as the lighter one.

**No Dynamic Island.** All fifteen show a bare status bar over the page
ground, clock and glyphs only. The frame is drawn `island=False`.

**No home indicator either.** Nothing paints in the bottom 14pt on any of
the fifteen. The generator does not draw one, which is why `--crop-phone`
diffs come out clean at the frame edge.

**The nav title is serif.** The model name renders in Tiempos, not the UI
face: cap 12.7 and ink width 85.6 on "Sonnet 4.5", where Georgia at 18px
measures 85.0. Every other string in the chrome is sans.

**Screen 03 runs two labels together.** The streaming answer reads
"…and granolaLunch:" with no break, because the app is rendering a partial
markdown stream and the bold label has arrived before its paragraph break.
Transcribed as it renders. That is the source's state, not the replica's
defect.

**Screen 14 is the numeric keyboard**, not the letter one — `123` pressed,
`#+=` in the shift slot, `ABC` bottom-left. Its third row is a different
geometry from the other two: 47.5pt keys on a 53.6 pitch from x 65.7,
against 32 on 38.18 everywhere else.

## The composer is a material, and it hides text

**The composer is a blur material**, flat census `#FBFAF7` with a
`#F9FAF5..#FDFBF9` spread across it, sitting 2 levels off the page. There is
no border and no measurable corner solve; the 24pt radius comes off the arc.

**The answer keeps scrolling underneath it.** On 03, 11 and 15 the last one
or two lines of the answer reappear *below* the composer, under a vibrancy
veil. Ink `#0D0B09` reads `#C6C4C2` there and the ground `#FCFAF6` reads
`#F6F4F2`; both solve to the same `rgba(245,243,240,.80)`, which is what
`.tail` paints.

**What the composer covers is a line count, not a transcription.** On 11 and
15 the visible tail lines are placed as their own absolutely-positioned
block, on their own measured ink top (821.0 and 809.2), because the lines
between them and the last visible bullet above are not on screen and cannot
be read off the capture. Filling that gap with invented prose and letting
the flow carry the tail down would put a guess in the measurement path.
Screen 03's tail is continuous with its answer and *is* computed, because
every line of it is visible.

## The line model behind every answer screen

Five of the fifteen are long serif answers, so the block model was measured
once and reused. All of it is in `ans()`:

- Line boxes: h1 29/36.3, h2 25/31, body 17.8/25.5.
- Margins between blocks: 8.4 generic, 5.7 for `p→h2` / `ul→h2` / `ol→h2`,
  10.3 for `h1→p` / `h2→p` / `h2→ol` / `h2→ul`, 8.25 for `h1→h2`, 8.2
  between list items.
- Ink top of a line = box top + 3.85, plus 3.987 for the 17.8/25.5 serif.

`ans(ink_top, *blocks)` takes the **ink** top of its first line and solves
back to the box, so every call site is a number read straight off the
capture. Validated to 0.5pt against the reference on all five screens.

Text is placed at its cap top the same way everywhere else:
`ct(ink, fs, lh, serif)` = `ink − ((lh − fs) / 2 + K·fs)`, K = 0.2708 for
SF Pro and 0.2240 for Georgia.

## Voice mode is a gradient, not a colour

Screens 04–06 fill their lower half with a two-axis wash. It is built as a
**vertical ramp sampled down x = 110** (eleven stops per screen, in `VOICE`)
plus a **horizontal white veil masked in over 100px** (thirteen stops, in
`VEIL`, shared by all three). Sampling it as two flat tokens put those
screens 28 and 38 levels off in the `lower` and `bottom` regions; the ramp
brings 04 to 3.61. The six `--c-v-*` tokens are the ramp's endpoints, kept
because they are what an evidence row can hold.

The pill's three buttons are `+`, `↑` and `×` — except on 05, where the
middle glyph is an outline square, because that screen is the interrupt
state.

## Details worth not re-deriving

- **The user bubble's group top is not the pill's top.** `bubble(top, …)`
  takes the top of the *group*; an attachment tile is 96 tall plus an 8
  margin, so a group at 123 puts the pill at 227. Three screens were placed
  at 227 and were wrong by exactly that offset.
- **The sheet scrim is alpha, not a composite.** `#C9C7C5` over `#FBF9F5`
  solves to `1 − 201/251 = .199`; the token keeps `rgba(0,0,0,.20)`.
- **The artifact card's heading is not `--c-t-h2`.** It measures 111.3 wide
  against the answer h2's 159.7 — 25 × 0.696 — so it is 17.4 on a 25.4 line.
- **A placeholder has no dark core.** `--c-placeholder` `#73736E` is the
  darkest 20% of "Reply to Claude", not the darkest 2% every other ink token
  uses; at that weight the 2% figure is antialiasing.
- **The keyboard ground starts at 545** on 01, 09 and 14, and the keys
  themselves are pure white against `#E3E3E5`.
- **Corner radii were fitted, not eyeballed.** Circular fits to 9–12 edge
  samples: bubble 13 (rmse 0.66), card 13.75, sheet 47. The phone's 52 is a
  circular stand-in for iOS's 55pt continuous corner.

## Assets

`assets/` holds what the boards embed, so they rebuild offline.

- `assets.json` — the one bitmap in the set, the attached photo on 13–15,
  as a `data:` URI.
- `refs/` — the 15 captures at 3×, 1179 × 2676. **Gitignored**, along with
  the `ref-*.html` boards built from them: they are whole app screens, not
  component art.

Every icon is inline SVG. The captures are Mobbin's, watermark intact,
reproduced for design reference; the artwork is Anthropic's.

## Regenerating

```bash
python3 mockups/canvases/claude-ios/gen.py
```

Rebuilds every board and `layout.json`, byte-identical. The boards are
output: edit `gen.py`, never the HTML. Without `assets/refs/` it skips the 15
reference boards and builds the other 18.

Verify with:

```bash
python3 tools/refkit.py tokens mockups/canvases/claude-ios
python3 tools/refkit.py shoot mockups/canvases/claude-ios/*.html \
    -o shots --scale 3 --crop-phone --check-overflow
```
