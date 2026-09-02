# Apple Calendar, iOS

Nine screens of the iOS Calendar app, each in both appearances, rebuilt from
the Figma community file [Apple Calendar · iOS][file], plus the token board
and the four evidence boards behind them. 23 boards, and 18 more that park the
file's own PNG export under each replica.

The file ships every screen twice, at 430pt and at 393pt, light and dark. This
repo's frame is 393 × 852, so the 393 pair is what was measured.

| Board | Figma node, light | Figma node, dark |
| --- | --- | --- |
| `01-today-events` | [`4006:1956`][n1] | [`4006:1957`][d1] |
| `02-today-empty` | [`4006:1966`][n2] | [`4006:1967`][d2] |
| `03-month` | [`4006:1974`][n3] | [`4006:1975`][d3] |
| `04-whats-new` | [`4006:2006`][n4] | [`4006:2007`][d4] |
| `05-location-permission` | [`4006:2013`][n5] | [`4006:2014`][d5] |
| `06-notifications-permission` | [`4006:2020`][n6] | [`4006:2021`][d6] |
| `07-new-event` | [`4006:2041`][n7] | [`4006:2042`][d7] |
| `08-event-details` | [`4006:2068`][n8] | [`4006:2069`][d8] |
| `09-video-call` | [`4006:2120`][n9] | [`4006:2121`][d9] |

## How close it lands

Mean absolute delta against the file's own 2× PNG export, whole frame, phone
crop, in levels of 255:

| Screen | light | dark |
| --- | --- | --- |
| Today, with events | 0.96 | 1.21 |
| Today, empty | 0.95 | 1.22 |
| Month | 1.15 | 1.21 |
| What's New | 0.78 | 0.76 |
| Location permission | 1.56 | 1.34 |
| Notifications permission | 1.40 | 1.23 |
| New Event | 0.51 | 0.94 |
| Event details | 0.42 | 0.57 |
| Event details, video call | 0.53 | 0.63 |

What is left is antialiasing, not geometry. A 2D shift search over
dx, dy ∈ [−1, +1] pt in quarter-point steps finds no screen that improves at
any non-zero offset, except the two month boards, which prefer dx −0.25 and
gain about a tenth of a level for it — the 52.333pt column pitch landing
between device pixels.

## One generator, both appearances

`gen.py` emits all 41 boards. Each screen is one builder called twice:
`fn()` is the light frame, `fn(dark=True)` adds `.dark` to the phone, which
redefines the 22 variables the file redefines and nothing else.

`TOKENS_SPEC` is the single source for the `:root` block, the `.dark` block,
the token board and the evidence boards, so a value cannot drift from the
evidence behind it. Values came from the file's published variables read with
`get_variable_defs` on a light frame and on a dark one, from its named type
styles, and from node boxes. The PNG exports were used to confirm them, to
read the strings a layer named "XX" does not give you, and to solve the
handful of values that are composites of a translucent fill over a ground.

## What the file said, and what the renders corrected

**The dark New Event frame is a different state, not a palette swap.** Every
other screen pairs light and dark of the same moment. `4006:2042` is the
keyboard-up state: Title focused with a red caret, "Add" dimmed, and a full
software keyboard over the bottom 336pt. Recolouring the light frame scored
130.24. Building the state it actually shows scores 0.96.

**The month header is a material that is invisible in light.** `.mh` paints
`ui/background-blur`, which in light is white at 70% over a white page, so it
composites to white and looks like nothing at all. In dark it is
`rgba(40,40,42,.94)` over black and the header reads `#262627` against a pure
black page. It carries no `backdrop-filter`: nothing renders behind it (the
month grid starts at y 124, the header ends at 115), so the flat composite is
exact, and adding a real blur cost the light board a level.

**The dark alert overlay dims twice as hard.** `ui/alert-overlay` is
`#00000033` and the light permission screens dim white 255 → 204 with it. On a
black page nothing gives the alpha away except the one white element: the
status-bar clock, which renders 127 where the same clock is 255 on the
undimmed screen. So the dark frames dim at 50%, and that one number took both
alert screens from 2.25 to 1.3.

**A modal sheet stands on a different grey ramp.** The dark New Event sheet is
`bg/secondary-elevated` `#2C2C2E` with `bg/tertiary-elevated` `#3A3A3C` cards
on it, where a plain dark page uses `#1C1C1E`. Trying to serve both from one
`--ac-group` is what made the first dark form look flat; they are
`--ac-elev` / `--ac-card` and `--ac-group` now.

**The keyboard's key border paints below the key, not around it.** Sampling
the bottom rows of a key returns the key fill, because
`keyboard/key-border` is a 1pt line *under* the 42pt box. It shows up as a
row of `#000000` at y 611 / 665 / 719 / 773. `box-shadow:0 1px 0` draws it.

**Shift and delete take different key fills.** Both look like modifiers;
Figma gives shift `keyboard/key-bg` (the ordinary white/grey key) and only
delete `keyboard/return-bg`. Getting that pair right, plus half a point off
the `123` and `return` labels, took the dark New Event board from 1.31 to
1.06.

**The day list is clipped where the footer starts.** Day Events is 1200pt tall
for 24 hours, so it runs far past the 852 frame. The file's own render of the
day screen stops the blue event dead on the footer line at 769 and leaves the
footer pure white, while its render of the month screen lets the grid blur
through the same footer. Clipping the list at 769 is the one reading that
reproduces both, so nothing below `--ac-daycut` is emitted at all.

**Chrome sets a 17pt glyph half a point lower than Figma does** in a 22pt line
box. Every measured `top` for text is written half a point up; rect elements
are not. The What's New sheet is the clearest case: its Continue button rect
matches to the pixel, while every string on the board wanted −0.5. Applying it
to the four text elements and leaving the button rect alone took that pair
from 2.17 / 2.11 to 0.81 / 0.79.

The status-bar clock was the one string that missed it. Its Figma top is 18.5,
this folder shipped it at 18.5, and it rendered half a point low on all 18
boards until `apple-wallet` measured the same clock and caught it. Every number
in the table above is with the corrected clock, worth 0.02 to 0.03 a board.
`apple-settings` had the same miss and is fixed too.

**There is no `letter-spacing` anywhere, on purpose.** The type styles carry
tracking (+0.4 at 34pt, −0.43 at 17, −0.26 at 22, +0.12 at 10) and the
keyboard keys carry `tracking-[-0.26px]` on top, but SF Pro applies it through
its optical size axis and Figma's own export shows none of it added. This is
the same finding `apple-photos/README.md` records; it held here even where
Figma states the tracking explicitly.

## Details worth not re-deriving

- **The week strip's seventh column reads 23, not 22.** The row is
  16 17 18 19 20 21 **23**. That is what the file says, so that is what the
  board says.
- **"to tell vou when it's time to leave"** on the What's New board is the
  file's typo, transcribed.
- **Two greys, one point apart.** `system/grey` `#8E8E93` for hour labels and
  footer links; `label/secondary` `#8A8A8E` (which is `#3C3C4399` over white)
  for the event-details summary. In dark they collapse onto one value.
- **The nav "Add" is semibold, "Cancel" is regular.** Same size, same colour
  when enabled.
- **Times use a thin space**: `9:00&thinsp;AM`, `6:30&thinsp;AM`,
  `5&thinsp;PM`. A normal space is visibly too wide against the export.
- **The form row separator sits above its row boundary**, not on it.
- **The event-details summary is 15pt in a 22pt line box** — `Regular/15pt`
  with the line box of the 17pt style, which is why `--ac-t-r15-22` exists
  next to `--ac-t-r15`.
- **The screen title is `Bold/22pt`, weight 700**, not the semibold 22 used
  for nav.
- **The mini day view runs on a 35pt hour pitch** with 8pt and 11pt event
  labels, a third of the size the full day view uses.
- **Hairlines differ by engine.** Chrome snaps the 0.33pt and 0.66pt rules to
  one full-opacity device pixel of `#C7C7CC` where Figma antialiases them
  across two. It is the largest single contributor left on the two day boards
  and it is not fixable from CSS.
- **Five metrics tokens are documentation, not inputs.** `--ac-nav`,
  `--ac-margin`, `--ac-gutter`, `--ac-home` and `--ac-hour` are referenced by
  no rule: every element here is placed at its own measured Figma coordinate
  rather than off a grid. They are measurements, so they stay in the block.

## Assets

`assets/` holds what Figma exported, so the boards rebuild offline.

- `icons/` — 19 SF Symbols, each one's `viewBox` **is** its ink box.
- `images/` — the two bitmaps the boards need: the location-permission map and
  the FaceTime app icon.
- `refs/` — the 18 PNG exports at 2×, 786 × 1704. **Gitignored**, along with
  the `ref-*.html` boards built from them: they are whole Apple screens, not
  component art.

`iconkit.py` is how `icons/` was made. Figma draws SF Symbols as private-use
text glyphs, so a per-layer SVG export comes back as a fragment with no symbol
in it; only a whole-node export outlines them. `iconkit.py` lifts one layer out
of that export, then measures it in headless Chrome with `getBBox()` and
retightens the `viewBox` onto the ink:

```bash
python3 iconkit.py screen.svg                      # list every layer id
python3 iconkit.py screen.svg wifi=Wi-Fi share=Share-2
```

`Id-N` takes the Nth child. For a glyph nested two levels down — the keyboard
keys — neither works, because the key layer holds a box and the glyph: pass
the glyph path's own id, which Figma writes as the private-use character
itself (in zsh, `shift-fill=$'\U0010019e'`).

The artwork is Apple's, reproduced from the community file for design
reference. It is not licensed for redistribution as product artwork.

## Regenerating

```bash
python3 mockups/canvases/apple-calendar/gen.py
```

Rebuilds every board and `layout.json` from `assets/`, byte-identical. The
boards are output: edit `gen.py`, never the HTML. Without `assets/refs/` it
skips the 18 reference boards and builds the other 23.

Verify with:

```bash
python3 tools/refkit.py tokens mockups/canvases/apple-calendar
python3 tools/refkit.py shoot mockups/canvases/apple-calendar/*.html \
    -o shots --scale 2 --check-overflow
```

[file]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-
[n1]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-1956
[d1]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-1957
[n2]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-1966
[d2]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-1967
[n3]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-1974
[d3]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-1975
[n4]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-2006
[d4]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-2007
[n5]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-2013
[d5]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-2014
[n6]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-2020
[d6]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-2021
[n7]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-2041
[d7]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-2042
[n8]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-2068
[d8]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-2069
[n9]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-2120
[d9]: https://www.figma.com/design/3YLkiKW7ZFRg85c8k6VXFf/Apple-Calendar-%C2%B7-iOS--Community-?node-id=4006-2121
