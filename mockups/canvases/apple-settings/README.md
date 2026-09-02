# Apple Settings, iOS

Three screens of the iOS Settings app, each in both appearances, rebuilt from
the Figma community file [Apple Settings · iOS][file], plus the token board
and the two evidence boards behind them. 9 boards, and 6 more that park the
file's own PNG export under each replica.

The file ships every screen twice, at 430pt and at 393pt, light and dark. This
repo's frame is 393 × 852, so the 393 pair is what was measured. All six frames
live under [`2006:4741`][root], the file's "📱 Screens" board.

| Board | Figma node, light | Figma node, dark |
| --- | --- | --- |
| `01-settings` | [`2006:4774`][n1] | [`2006:4775`][d1] |
| `02-developer` | [`2006:4813`][n2] | [`2006:4814`][d2] |
| `03-display-zoom` | [`2006:4825`][n3] | [`2006:4826`][d3] |

## How close it lands

Mean absolute delta against the file's own 2× PNG export, whole frame, phone
crop, in levels of 255:

| Screen | light | dark |
| --- | --- | --- |
| Settings | 0.39 | 0.49 |
| Developer | 0.71 | 0.74 |
| Display Zoom | 0.15 | 0.28 |

What is left is antialiasing, not geometry.

## One generator, both appearances

`gen.py` emits all 15 boards. Each screen is one builder called twice:
`fn()` is the light frame, `fn(dark=True)` adds `.dark` to the phone, which
redefines the nine variables the file redefines and nothing else.

`TOKENS_SPEC` is the single source for the `:root` block, the `.dark` block,
the token board and the evidence boards, so a value cannot drift from the
evidence behind it. Values came from the file's published variables read with
`get_variable_defs` on a light frame and on a dark one, from its named type
styles, and from node boxes. The PNG exports were used to confirm them, to
read the strings a layer named "Text" does not give you, and to settle the two
values that are a translucent fill over a ground.

## What the file said, and what the renders corrected

**Two rows literally say "Text".** `Paired devices` and `Media services
testing` each hold an Action Row that was left on the component's unfilled
default, so the community file renders the word "Text" in accent blue where a
real Settings screen names an action. The clone rule is to transcribe the
reference, so the boards say "Text" too. This is the source's defect, not the
replica's.

**"Waltter testing" is the file's typo**, transcribed as-is. It is the Wallet
section.

**Both pushed screens hide their Back button.** `get_design_context` describes
a Back control on Developer (`chevron.left` + "Settings") and on Display Zoom
(`chevron.left` + "Developer"), plus a "Set" right action on Display Zoom.
Those are the component's layers; the instances switch them off. The file's own
SVG export of either frame contains neither, and neither does its PNG. Nothing
draws them, so nothing here does. That also disposed of the run's one open
value: the "Set" label is the file's only `label/tertiary` fill, which is not
a published variable and so had no dark counterpart to go and find.

**The Settings list overflows its own frame, on purpose.** The Top frame is
976 tall inside an 852 frame: a scrolling list parked at the top. Siri & Search
is cut mid-row and Photos and Game Center never appear. All three are emitted
and the frame clips them, which is what the export shows. The same is true of
Developer's last section, `News testing`, which starts at y 879.

**Chrome sets a glyph half a point low, but only from 17pt up.** Row labels,
the nav title, the sign-in link, the 34pt title and the status-bar clock all
want their measured Figma `top` minus 0.5. Put every one of them back on its
measured coordinate and the six boards go 1.39 / 1.82 / 0.41 / 1.40 / 1.72 /
0.54 instead of the table above, so the half point is worth more than
everything else on this screen put together. The 13pt strings do not want it:
shifting the section headers, the section help and the sign-in subtitle the
same way cost Developer 0.6 of a level back. Rects are never shifted.
`apple-calendar` found the same half point at 17pt.

The clock was the one string here that did not get it. Its Figma top is 18.5,
this folder shipped it at 18.5, and it rendered half a point low in all six
boards; `apple-wallet` measured it and caught the miss. Every number in the
table above is with the corrected clock, which is worth 0.02 to 0.03 a board.
`apple-calendar` had the same miss and is fixed too.

**Only one of the two nav bars has a material.** Developer's Page Title paints
`ui/background-blur` and a 0.33pt rule at its bottom edge; Display Zoom's
paints neither, so the grouped page ground runs straight up behind the clock.
Both are 98 tall. The material is a flat composite in the export — `#FBFBFC`
light, `#262627` dark — because the content below starts at y 120 and nothing
scrolls under it in these frames.

**The Dynamic Island is `system/black` in both themes**, one variable, so on
the dark Settings and Display Zoom boards it is invisible against a black page.
It reappears on dark Developer, where the nav material lifts the ground to
`#262627` around it. That is the file's behaviour, not a bug in the replica.

**Dark reuses the same app-icon art.** The dark Home frame returns 15 raw
images against 14 rows; all 14 are byte-identical to the light frame's, and
the fifteenth is a pink-stripe Figma placeholder on a hidden layer. So one
`assets/images/` set serves both boards.

**There is no `letter-spacing` anywhere, on purpose.** The type styles carry
tracking (+0.40 at 34pt, −0.43 at 17, −0.08 at 13) but SF Pro applies it
through its optical size axis and Figma's own export shows none of it added.
Same finding as `apple-photos/README.md` and `apple-calendar/README.md`.

## Details worth not re-deriving

- **A divider starts where its row's content starts.** 64 from the card edge
  on a row with a 29pt app icon (20 gutter + 29 icon + 15 gap), 20 on a row
  without one. Both are in the export.
- **A section header sits 35 below the card above it**, the gap on the
  Sections column, and 22 above its own card. Help text does not use that
  gap: it hangs 6 under its card and the next header comes 20 under the help.
  Both numbers are in `section()`, which is why the six Developer sections
  are placed at absolute tops rather than stacked.
- **Section help wraps to exactly three lines** in both help blocks, at 13pt
  in the 321pt content width. That is the wrap the export shows, and it falls
  out of the measured width rather than being forced.
- **Accessory glyphs are placed at their own ink box, not centred.**
  `chevron.right` and `checkmark` have different optical centres and Figma
  sets each from its text box, so `gen.py` writes both measured rects.
- **The toggle knob carries two shadows**, `0 3px 8px rgba(0,0,0,.15)` and
  `0 3px 1px rgba(0,0,0,.06)`, straight off the Figma effect list.
- **This file and `apple-calendar` draw the same Status Bar component.** The
  three glyph ink rects agree to three decimal places, so `SB_ICONS` and
  `cellular.svg` / `wifi.svg` / `battery.svg` were reused verbatim rather
  than re-lifted.
- **Two tokens are alpha over a ground, and stay that way.**
  `--as-track` (`fill/tertiary`) renders `#EEEEEF` / `#313136` over the
  card and `--as-blur` (`ui/background-blur`) renders `#FBFBFC` / `#262627`
  over the page. Both composites were sampled off the 2× exports to confirm
  the alpha; the block keeps the alpha, not the composite.
- **`system/grey` is one value in both themes.** `#8E8E93` for section
  headers and help text, confirmed on `ref-d02`.

## Assets

`assets/` holds what Figma exported, so the boards rebuild offline.

- `icons/` — 6 SF Symbols, each one's `viewBox` **is** its ink box. Lifted
  with `apple-calendar/iconkit.py`, which explains why a whole-node export is
  the only one that outlines them.
- `images/` — the 14 app icons, the file's own art, downscaled to 87 px (3×
  of the 29pt slot they render in) so a board carries 111 KB of base64 rather
  than ten times that.
- `refs/` — the 6 PNG exports at 2×, 786 × 1704. **Gitignored**, along with
  the `ref-*.html` boards built from them: they are whole Apple screens, not
  component art.

The artwork is Apple's, reproduced from the community file for design
reference. It is not licensed for redistribution as product artwork.

## Regenerating

```bash
python3 mockups/canvases/apple-settings/gen.py
```

Rebuilds every board and `layout.json` from `assets/`, byte-identical. The
boards are output: edit `gen.py`, never the HTML. Without `assets/refs/` it
skips the 6 reference boards and builds the other 9.

Verify with:

```bash
python3 tools/refkit.py tokens mockups/canvases/apple-settings
python3 tools/refkit.py shoot mockups/canvases/apple-settings/*.html \
    -o shots --scale 2 --check-overflow
```

[file]: https://www.figma.com/design/SAJX6z3s8bHctuZyvOSN8i/Apple-Settings-%C2%B7-iOS--Community-
[root]: https://www.figma.com/design/SAJX6z3s8bHctuZyvOSN8i/Apple-Settings-%C2%B7-iOS--Community-?node-id=2006-4741
[n1]: https://www.figma.com/design/SAJX6z3s8bHctuZyvOSN8i/Apple-Settings-%C2%B7-iOS--Community-?node-id=2006-4774
[d1]: https://www.figma.com/design/SAJX6z3s8bHctuZyvOSN8i/Apple-Settings-%C2%B7-iOS--Community-?node-id=2006-4775
[n2]: https://www.figma.com/design/SAJX6z3s8bHctuZyvOSN8i/Apple-Settings-%C2%B7-iOS--Community-?node-id=2006-4813
[d2]: https://www.figma.com/design/SAJX6z3s8bHctuZyvOSN8i/Apple-Settings-%C2%B7-iOS--Community-?node-id=2006-4814
[n3]: https://www.figma.com/design/SAJX6z3s8bHctuZyvOSN8i/Apple-Settings-%C2%B7-iOS--Community-?node-id=2006-4825
[d3]: https://www.figma.com/design/SAJX6z3s8bHctuZyvOSN8i/Apple-Settings-%C2%B7-iOS--Community-?node-id=2006-4826
