# Apple Home & Lock Screen

The iOS 17 home and lock screens, cloned from the Figma community file
"Apple Home and Lock Screen · iOS" (file key `ftV2wtqJaMqjnFaf8SS1Ve`,
node `6:389`, the Overview page). The source is a design file, so the
references are the file's own 3× exports and every token is a Figma value
re-checked by a probe on those exports (`probes.json`, 58 entries).

Nodes: `6:436` home light, `6:437` home dark, `6:456` lock light, `6:458`
lock dark, `6:440` / `6:441` / `6:442` the home screen in Spanish, Chinese
and French.

## Boards

- `00-design-tokens`, `00b-evidence`: 59 tokens with one evidence row each.
- `01`–`04`: home and lock, light and dark. The dark boards inline the same
  `:root` and remap nine tokens under `.dark`.
- `05`–`07`: the home screen with the file's Spanish, Chinese and French
  strings. Those exports are 430 × 932 instances (iPhone 15 Pro Max); the
  boards keep the 393 layout and swap the strings.
- `ref-01`..`ref-07`: the exports, one under each screen. Gitignored with
  `assets/refs/`; a fresh clone has 9 boards.

## Numbers

Renders at 3× (`refkit shoot --scale 3 --crop-phone`) against the exports,
whole frame, phone corners masked:

| board | export | mean Δ (of 255) | worst 40 px band |
|---|---|---|---|
| 01 home light | 6:436, 1179 × 2556 | 1.97 | y 173–187, Δ 11.8: the Walk row and the first event's time, glyph antialiasing |
| 02 home dark | 6:437 | 1.83 | the same rows, Δ 8.4 |
| 03 lock light | 6:456 | 1.49 | y 133–147, Δ 9.8: the clock's digits |
| 04 lock dark | 6:458 | 1.49 | y 133–147, Δ 9.8 |
| 05–07 | 6:440–6:442, 1290 × 2796 | not diffed | a 430-wide instance is not the board's frame |

Probe replay (`refkit batch probes.json --against scratch/shots --pt 3`):
38 colour probes, mean Δmax 1.3; 16 box probes, mean |dw| 0.22 pt, |dh| 0.21.
The three that do not read 0–2 are noise, kept with their notes:

- `search-out` Δ 14 and `divider` Δ 9: `sample` reports a census mode, and a
  10 × 22 pt window inside a wallpaper gradient has no stable mode. The window
  means agree (125.5 / 227.8 / 252.4 against 125.6 / 227.5 / 252.0).
- `hs-batt-box` reads 1.6 pt taller on the render at thresholds 200, 230 and
  250, while the sampled rows through the battery agree pixel for pixel
  (outline 201/104/104, fill white on the same rows). A threshold artefact on
  the antialiased top of the fill.

## What the file leaves unsaid

- **The home frame sits under the status bar.** Every top-anchored y in the
  Figma context is 54 short of the export: the first probe pass returned
  wallpaper ink for every widget window until all home windows moved +54.
- **The home screens carry the 430 status bar.** The file drops its
  "15 Pro Max" variant into the 393 frames, left-aligned: island 126 × 37 at
  x 152, the time in a 142-wide box at x 10, icon boxes at 303 / 333 / 359.
  The lock uses the 393 variant (island at 133.5, icons 1.5 pt lower than
  the file's 18). Both are built from the file's own wifi and battery SVGs
  plus four rects at its cellular insets.
- **The date and time add to the wallpaper.** The fill is
  `rgba(255,255,255,.8)`, but the export's brightest date pixels are
  `#FFCFEB`, which is 204 plus the backdrop, clipped; a normal composite
  reads `#DDCCD1`. The text blends `plus-lighter`.
- **The drag bar is two blend layers.** `rgba(127,127,127,.5)` at
  luminosity under `#C2C2C2` at overlay, which the composite `#D94652` over
  `#85040C` confirms. They sit beside the wallpaper in the phone's stacking
  context; inside the status bar container they blend against nothing.
- **"SF Pro" is the variable face.** With Chrome's optical sizing it sets
  the date 170.3 wide against 170.7, "Shortcuts" 53.7 against 53.3 and the
  100 px clock 175.0 against 174.7. Static SF Pro Display misses the date by
  5.4, SF Pro Text by 13.6. The 18 px status time uses tabular figures
  (34.7 against 33.7; proportional sets 32.3).
- **Dark is not the light alpha.** The dark event background `#1C445B` is
  .28 of `#1BADF8` over `#1C1C1E`, not the light board's .2.
- **The strings are transcribed as the file has them.** The Chinese export
  labels News 消息 and App Store 预览, the Spanish export lists the reminders
  as Caminar, Yoga, Duolingo. The Walk emoji is the neutral 🚶🏻 (the export's
  figure wears jeans), rendered by the platform's Apple Color Emoji.

## Assets

- `wp-light.webp`, `wp-dark.webp`: the file's wallpaper PNGs (1179 × 2556)
  at WebP q88, 35 / 31 KB, mean delta 0.64 / 0.63 against the PNG. Home and
  lock share one image per appearance.
- `logo-*.webp`: the 18 app icons at 180 × 180, q90, 49 KB in all.
- `sb-*.svg`: the wifi and battery glyphs from the file's SVG export, one
  pair per status bar variant.
- `art/`: the flashlight, camera and search glyphs, keyed out of the exports
  at the boxes in `crops.json` (`gen.py` solves alpha against the disc
  behind each one) and placed back at the same numbers.

## Regenerate

```
python3 mockups/canvases/apple-home-lock/gen.py
python3 tools/refkit.py shoot mockups/canvases/apple-home-lock/0[1-7]-*.html \
  -o mockups/canvases/apple-home-lock/scratch/shots --scale 3 --crop-phone --check-overflow
python3 tools/refkit.py batch mockups/canvases/apple-home-lock/probes.json \
  --against mockups/canvases/apple-home-lock/scratch/shots --pt 3
python3 tools/refkit.py diff mockups/canvases/apple-home-lock/scratch/shots/01-home-light.png \
  mockups/canvases/apple-home-lock/assets/refs/home-light.png --pt 3
python3 tools/refkit.py tokens mockups/canvases/apple-home-lock
python3 tools/refkit.py thumbs mockups/canvases/apple-home-lock
```

`assets/refs/` holds the exports (`home-light`, `home-dark`, `lock-light`,
`lock-dark`, `home-es`, `home-zh`, `home-fr` as PNG). Without them `gen.py`
skips the glyph cut and the `ref-*` boards and still writes everything else.
