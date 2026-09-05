# Pitfalls

Every one of these cost a real run time. Read before Phase 1, and again when
a number will not converge.

- **Sampling without looking.** Numbers with no element attached land in the
  wrong token. Grid, read, *then* sample.
- **Naming a face off a box that holds more than the word.** A clipped leading
  glyph, or a neighbouring word inside the region, quietly halves the score.
  `bands --axis cols` gives you the word gaps; box one word.
- **Trusting a downscaled capture for thin ink.** Hairlines, scrims and small
  accents need the coverage solve or a native capture.
- **Hand-editing a generated artboard.** The next regeneration silently
  reverts it. Edit `gen.py` and re-run.
- **Unbalanced `<div>`s after a structural edit.** Count them
  (`grep -o '<div' | wc -l` vs `</div>`) before rendering.
- **`.replace(old, new, 1)`** when the string occurs twice. Bounded replaces
  are how one of two identical paragraphs stays broken.
- **A glob that pairs the wrong files.** `glob('mine/0*.png')` swept up
  `00-design-tokens.png` and shifted every mine-vs-reference pairing by one:
  true means of 3.5-4.5 levels read as 20-115. When every screen regresses
  at once, check the pairing before touching a board.
- **A stray character before a CSS selector** (`; .metrics{...}`) invalidates
  the whole rule with no error. If one block renders in the wrong font, check
  the character in front of its selector.
- **Overflow after adding a row** to a fixed-size board. Tighten the padding
  or switch a stacked flex column to a grid; do not just let it clip. Run
  `shoot --check-overflow` after any board grows.
- **Measuring a render's height in pixels.** A card's `box-shadow` paints ~60px
  below its own bottom edge, so a pixel probe reports overflow that is not
  there. Ask the layout engine (`--check-overflow` does).
- **Redrawing a third-party logo by hand.** Pull the real one; see
  [`brand-marks.md`](brand-marks.md) for the source, and
  for why you check the glyph against the capture before trusting a file name.
- **Thresholding luminance to find an element's extent.** A near-white band
  (243,245,247) on a near-white page (245,245,247) is invisible to any fixed
  threshold, so the element reads as ending early and you "fix" a layout that
  was already right. Probe each row against the page gutter beside it, not
  against an absolute value. This cost two wrong diagnoses in one session: an
  80pt cover measured as 63.7, and a row top declared 5.3pt late when the
  layout was inside a point.
- **Generating an asset the capture already contains.** A crop of the
  reference is exact; a redraw of the same thing scores 38.53 levels against
  it and quietly becomes the largest error on the screen. Reach for
  `gpt-image` only for pixels no capture holds, and probe the result.
- **Generating one asset at a time, or generating a small one at all.** When
  you do have to draw something, a single asset in a single call is the worst
  version of the method: it composes rather than copies, and no prompt wording
  recovers what the input's geometry would have given for free. Pack the set
  into one grid at target size and position (18.41 → 3.96), and leave anything
  under ~128px of capture as CSS or SVG, because at that size the shape comes
  back and the colour does not. See
  [`generating.md`](generating.md).
- **Reusing a threshold that was measured on a different asset.** `refkit key
  --hi 110` is not a constant; it was set just below one character's closest
  pixel to magenta. On an icon whose own colour sits 83 from the ground, the
  same 110 keys the *artwork* to partial alpha, the unpremultiply divides by
  it, and grey comes back. That asset scored 48 and the drawing was fine.
  Any threshold named after a measurement has to be re-derived per asset, and
  a printed warning when the art is close to the key is cheaper than the
  re-run.
- **An unquoted `$VAR` of ids in zsh.** zsh does not word-split unquoted
  parameters, so `cmd $IDS` passes all 77 ids as one argument and you get
  `OSError: File name too long` rather than a usage error. `${=IDS}` splits.
  This one is free if it crashes before the API call and expensive if it does
  not.
- **A stand-in face whose cap ratio is not SF Pro's.** Sizes derived as
  `cap ÷ 0.714` are ~6% wrong the moment the board ships a rounded or a
  brand-adjacent stack; one run measured 0.762em. `ct()`'s K moves with it
  (0.115, not 0.2708). K solves in closed form from two renders,
  `K_needed = K_used − (ref_ink − mine_ink) / fs`, which is worth doing,
  because guessing its sign is a coin flip and the wrong guess pushes text
  clean out of the measurement window, where it reads as a clipped glyph
  rather than as a bad constant.
- **A `z-index` painting over text that is perfectly correct.** A card or
  sheet body at `z-index:1` covers every sibling left at `z-index:auto`, with
  no error and no clipping warning, and the screens whose text vanished can
  even *improve* in the diff. Colour, font shorthand and overflow all look
  fine; reading the **generated CSS** is what finds it.
- **Drawing the frame the templates draw instead of the frame the capture
  shows.** Check for the Dynamic Island and the home indicator on every
  capture before trusting either. A rendered island over captures that have
  none put a 103-level band across the top of eight screens. While you are
  there, check the status bar is *one* status bar: two capture sessions in one
  set can carry different cellular glyphs, 9pt apart.
- **Cropping an asset by eye instead of at its measured box.** Take the
  element's own box (`refkit bbox --grow` gives it) out of the capture at the
  capture's own scale. Then the capture's rounded corners land under your CSS
  radius and the art registers 1:1. Every offset cover in the luma home run
  was a crop carrying a strip of page, not a layout error. The other half of
  this is a box that is too *small*: plain `bbox` cut both ears off the
  duolingo avatar and a whole-frame delta moved by 0.04 levels, because a
  clipped ear is a few hundred pixels of 1.7 million. Nothing but looking at
  the crop, or `--grow`, finds that.
- **Comparing against a capture you have not trimmed.** Mobbin exports carry
  a watermark strip below the screen, so a 2676px capture of an 852pt screen
  is 40pt of someone else's branding. Crop to the device height before
  `diff`, or it exits on a shape mismatch and you start doubting the render.
- **Assuming a floating pill because the icons are inset.** Read the gutter
  columns, x 6 and x 386, straight down through the bar. Luma's tab bar is a
  full-width material with a hairline at its top edge and the home indicator
  inside it; the replica drew a 353pt pill and let sharp page content show
  through the 84pt below it for four screens before anyone measured x 6.
- **A re-shoot that silently did not happen.** "A correction you have not
  re-rendered is not a correction" has no teeth if the render command failed
  and you did not notice. The usual cause is a zsh brace-glob
  (`{05,11,15}-*.html`), which aborts the whole command when any one branch
  matches nothing; relative board paths after a `cd` do the same. Both exit
  non-zero and both look like success if stderr went to `/dev/null`.
  **Re-shoot the whole folder, never a subset.** 18 boards is a few seconds
  and it cannot be mis-globbed. And never send a render's stderr to
  `/dev/null`; put warning filters inside the script instead.
- **Image caches rotate mid-task.** Save every reference to the scratch dir
  the moment you receive it.
