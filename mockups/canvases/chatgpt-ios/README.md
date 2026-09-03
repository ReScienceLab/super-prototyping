# ChatGPT, iOS

Twenty-five screens of the ChatGPT iOS app: the cold-start flow from splash
through account creation and onboarding, the signed-in home and its composer,
two full-screen feature announcements, the sidebar in three states, and a
project's two tabs. Rebuilt from Mobbin captures. 29 boards in three rows,
plus 25 more that park each capture column-for-column under its replica.

| # | Board | What it shows |
| --- | --- | --- |
| 00 | `design-tokens` | The 67 tokens, as one `:root` block |
| 00b–00d | `evidence` | One row per token, with the measurement behind it |
| 01–04 | splash → auth wall | Cold start, signed-out home, the dark wall |
| 05–12 | log in → age filled | The OAuth web view, eight states |
| 13–15 | notifications, use case | The last three onboarding screens |
| 16 | `memory-sheet` | The memory announcement, full-bleed |
| 17–19 | home, carousel, composer | Signed-in, empty and with a menu open |
| 20 | `image-whats-new` | The image-model announcement |
| 21–23 | sidebar | Empty, avatar loading, full |
| 24–25 | project | The "UI UX" project's Chats and Sources tabs |

## How close it lands

Mean absolute delta against the captures, in levels of 255, over the window
described below:

| Screen | Δ | Screen | Δ | Screen | Δ |
| --- | --- | --- | --- | --- | --- |
| 01 Splash | 0.03 | 10 Code entered | 1.94 | 19 Composer menu | 1.41 |
| 02 Welcome | 4.38 | 11 How old are you? | 1.53 | 20 Image announcement | 2.30 |
| 03 Home, signed out | 2.15 | 12 Age filled | 1.85 | 21 Sidebar, empty | 1.66 |
| 04 Auth wall | 1.99 | 13 Notifications | 2.42 | 22 Sidebar, loading | 2.16 |
| 05 Log in or sign up | 2.60 | 14 Use case | 2.54 | 23 Sidebar, full | 2.69 |
| 06 Email entered | 2.97 | 15 Use case selected | 3.48 | 24 Project chats | 1.58 |
| 07 Create account | 1.71 | 16 Memory announcement | 4.12 | 25 Project sources | 2.21 |
| 08 Password valid | 2.36 | 17 Home, empty | 1.90 | | |
| 09 Check inbox | 1.82 | 18 Home, carousel | 1.82 | | |

**Mean 2.22, worst 4.38**, against `luma-ios`' 3.47–4.50. The two worst
boards are the two that are almost entirely type at 17px or larger, and what
is left on them is glyph shape rather than position or colour — see the
typeface section. 01 is 0.03 because it is one centred logo crop on black.

`refkit batch` replays all 34 Phase-1 probes against the renders: **22 colour
probes at a mean Δmax of 2.6 and a worst case of 9**, 4 box probes at a mean
|dw| of 0.87pt and |dh| of 0.52pt, and 8 edge scans.

## The diff window, and why it is trimmed

The captures are 882 × 1911 for a 393 × 852 frame: **2.244275 px per design
pt**, checked on both axes. Renders come out at 3× and are downscaled to
882 × 1911 with Pillow LANCZOS before diffing.

Three sides are then excluded, and all three are properties of Mobbin's
export rather than of the replica:

- **The top 58pt.** Mobbin composites the Dynamic Island out. The replica
  draws it, because the app has one.
- **The 52pt corners.** Mobbin's export is a square rectangle; masked corners
  would otherwise diff against page white.
- **The bottom, below 838pt.** The export has no home indicator. The replica
  draws one.

So the window is y 58–838 with a 52pt rounded mask. All three defects are
drawn in the boards and trimmed from the score; the boards are the app, the
window is what the captures can be asked about.

## The typeface is not available, and that is most of what is left

`refkit font` returns **no call** on every title measured: the real face is
OpenAI Sans, which is outside any closed-set candidate list. The boards ship
`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial,
sans-serif` with two measured corrections, `FACE_DROP = 1.1` on the ink top
and `XOFF = 0.6` on centred runs.

**The stand-in's cap-height-to-width ratio is higher than OpenAI Sans's**,
and no size or tracking fixes that. On 17's card titles the capture sets 9.8
tall over 162.6 wide; the same string in the stand-in at the size that
matches the width sets 10.7 over 159.1. Matching the width leaves the caps
tall, matching the caps leaves the run short. Every size in the token table
is a cap match measured on the render, and the residue is glyph shape.

That residue is the whole of 02's 4.38. Across all six of its feature rows
the ink boxes agree with the capture to a tenth of a point in both position
and width; only the letterforms differ. 17 is the same story on its cards.
Do not chase these with tracking: 02's rows are already right.

## Four type ladders, not one

The app's chrome and the OAuth web view it opens are different products with
different type and different greys, and 16 and 20 are a third thing again.

- **App** (`t-h1` … `t-lbl`): whole-pixel sizes, ink `#000000`, secondary
  `#5F5F5F`.
- **Web view** (`t-web*`, screens 05–12): fractional sizes — `t-webbtn` is
  17.6px — and its own greys, ink `#0D0D0D` and secondary `#676767`. Those
  are measured, not rounded to the app's; a web view rendered with the app's
  ink reads two to four levels dark across eight boards.
- **Announcement sheet** (`t-sheet*`, 16 and 20): 26.75px / 15.25px /
  16px, again fractional.
- **Project** (`t-proj`, `t-tab`, `t-lbl`, screens 24–25).

`--x-web-btn` (`#0D0D0D`) is measured and unused: the web view's Continue
button turned out to take `--x-ink-web`, the same value from a different
measurement, and the token is kept because the two are independently
measured and could diverge.

Sweeping `--x-ink-web` darker does improve boards 05–12 — `#121212` by 0.09
summed over eight boards, `#161616` by 0.16 — but the measurement says
`#0D0D0D` and a token does not move away from its measurement for 0.02 a
board.

## Decisions worth not re-deriving

**The memory sheet's hero already contains its own chrome.** 16's hero crop
runs y 341.7–514.4, so it carries the sheet's grabber and its close button.
Both were drawn again on top. The tell was a zoom, not a delta: the
capture's close circle reads `#9499BE` on a `#BDC6F1` ground, a black .22
scrim applied once; mine read `#74798F`, which is .22 applied twice, with a
white X sitting on top of the capture's own dark one.

**The sheet dim is a `feComponentTransfer`, measured, with the purple
exempt.** 16's background is dimmed non-uniformly; a flat scrim cannot hold
both the neutral chrome and the purple hero.

**The composer fade is at x 4–12**, measured, not a guess at "about 8".

**08's password is redacted in the capture** and ships as 12 dots.

**18's carousel copy is reconstructed.** The capture crops its cards; the
strings are extended to plausible completions and the fact is recorded here
rather than in a comment nobody reads.

**23's capture is noisier than the rest** and its two dark surfaces genuinely
split, `#242424` and `#282528`. Both are kept.

**15's capture is 55.4% pure white**, so its whole-frame delta is dominated
by a small amount of type. 3.48 there is not 3.48 elsewhere.

## What the renders corrected, and how

Nine defects survived Phase 3 and none of them showed up in a whole-frame
delta. Two methods found all nine.

**The worst-block report.** Tile both prepped images into 40pt blocks, take
the mean |Δ| per block, print the top four per board. A defect that is 0.02
of a frame is 3 levels of a block. This is much cheaper than eyeballing
trios, and it found most of them.

**Threshold-free stroke coverage.** For a stroke crossing one row,
`Σ clip((bg_lum − px_lum) / (bg_lum − ink_lum), 0, 1)` divided by the capture
scale gives a width in pt that does not depend on any luminance threshold.
That is what settled the two close icons.

The nine:

- **The `close` icon's viewBox was 16.9 × 16.0 for a square mark**, so the
  span bound on height and set the width 1.3pt wide. It is also two icons,
  not one: the web sheet's box is 14.7 and 04's grey disc holds a 13.6, and
  both carry about a 2.1 stroke. Coverage reads 5.88pt over 06's two arms
  against 5.74 for a drawn 2.0, and 7.46 on 04 against 5.33 for a drawn 1.54
  — which is why one entry scaled twice cannot work.
- **The sidebar labels sat 2.1pt low.** 21's three cap tops are at 138.1,
  187.1 and 235.3; mine were at 140.4, 189.4 and 237.0, a flat offset on all
  three.
- **`t-proj` was 600 and is 400.** At 28px the capture's "UI UX" carries
  1895 ink pixels over 67.3pt; 400 gives 1910/67.3 and 600 gives 2684/70.0.
- **25's empty-state headline needed its own 500 token.** It sets 215.2 wide
  over 4317 ink pixels; `t-btn`'s 600 gives 218.8/5042 and 500 gives
  214.8/4332. Dropping `t-btn` itself to 500 instead costs 02 two thirds of a
  level, because its feature headings are the same 17px and really are 600.
- **02's legal link was grey and is near-black.**
- **The sidebar's folder icon has a rule across it**, and is 19.1 × 17.2
  rather than the near-square 20.9 × 20.5 first drawn — that aspect alone set
  the width a point wide. The rule is a full-width run at 143.0–144.8.
- **The "new folder" plus replaces the folder's bottom-right corner**, it is
  not inside it. Drawn in the middle it merged with the rule above it.
- **The images icon's back card is tilted**, dropping 1.6 over 10.3 — about
  9° — and only its right wall is vertical. The pair is 20.9 × 20.1, not
  22.0 × 21.0.
- **14/15's title leading is 33.9, not 33.4**, with line 1's ink top at
  110.1.

Two rules came out of this run:

**Ink mass decides a font weight, but only on dark text.** `refkit bbox`'s
`n` column, compared ref-against-render through the *same* window, is what
settled `t-proj` and `t-emph` above. On grey text it is useless: the
threshold flips between the two images and the counts diverge three- to
fourfold for no reason at all. 25's mute line reads 618 against 2280 with
nothing wrong.

**A blur that monotonically improves a band is hiding a content defect.** If
softening the render keeps making a region better, the region does not have
an antialiasing problem; it has something drawn in it that is not in the
capture, or something missing that is.

## Details

- **Icon size is not a calibration loop.** Every SVG's `viewBox` is the
  measured ink box in pt and its span carries the same numbers. The `close`
  bug above is exactly what happens when the two disagree.
- **`bbox --grow` escapes its window more often here than in other runs.**
  It grew symmetrically into the disc behind 04 and 16's close X, and it
  merged the two lines of 15's title into one 32.1pt-tall box against a real
  24.5. Both are now explicit row and column ink profiles with tight,
  ungrown boxes. A side listed in `--grow`'s output means the answer
  escaped; believe that line.
- **Every probe box carries a `_note`** proving its window holds the element
  and only it. Four of the eight edge scans report the *first* edge in their
  window rather than the one they were aimed at, and their notes say so;
  `refkit batch` ignores keys starting with `_`.
- **The token board's rows must not carry sub-pixel padding.** `.tr` with
  `padding-bottom:1px;margin-bottom:1px` overflowed the 478 × 980 artboard by
  9px the moment a 68th row was considered. Both are zero.

## Assets

`assets/` holds what the boards embed, so they rebuild offline.

- `art/`: 15 PNGs, each a crop of a capture at the box named in
  `crops.json` — the wordmarks, the Google and Apple marks, 13's app icon,
  16's hero, 20's tile strip, the four sidebar avatars and thumbnails, and
  25's cluster. **Committed**: without it the boards have no artwork. 04's
  Google mark is a separate crop from 05's; they are drawn at different
  sizes on different grounds.
- `refs/`: the 25 captures, 882 × 1911. **Gitignored**, along with the
  `ref-*.html` boards built from them: they are whole app screens, not
  component art. A fresh clone therefore has 29 boards.

Everything else is CSS and inline SVG. The captures are Mobbin's, watermark
intact, reproduced for design reference.

## Regenerating

```bash
python3 mockups/canvases/chatgpt-ios/gen.py
```

Rebuilds every board and `layout.json`, byte-identical. The boards are
output: edit `gen.py`, never the HTML. With `assets/refs/` present it also
re-cuts `assets/art/` from `crops.json` and emits the 25 reference boards;
without it, it uses the committed art and skips them.

Verify with:

```bash
python3 tools/refkit.py tokens mockups/canvases/chatgpt-ios
python3 tools/refkit.py shoot mockups/canvases/chatgpt-ios/*.html \
    -o shots --scale 3 --crop-phone --check-overflow
```
