# Generating an asset that measures

Loaded from `assets.md` when Phase 3 hits the one case that justifies
generating: **the pixels you need are not on any capture.** Everything here
is measured on the `duolingo-ios` set, six illustrations plus a 77-icon
control, and every number is reproducible with `artgen`.

A crop still scores **0** by construction. This is what to do when there is
nothing to crop.

## The one idea

**Hand the model the answer's geometry, not just its content.**

Pack each asset into its own cell of a grid, at the exact size, position and
rotation it has to come back at, and ask for the same grid redrawn. The model
then upscales in place instead of composing, so nothing has to be registered
afterwards. Every cell in four independent returns came back at scale
0.99-1.00 with an offset of 0 or 1px.

Same six assets, same prompt language, same model:

| Input | Mean Δ |
|---|---|
| one crop, "reproduce this faithfully" | 38.53 |
| one crop, generated on a key colour and fitted back | 18.41 |
| **the six packed into a geometry-anchored grid** | **3.96** |

That is a 4.6× improvement over the careful single-asset procedure, and it
came from the input layout, not from the prompt, the quality flag or the
number of retries.

## Run it

```bash
artgen \
    --art  mockups/canvases/<slug>/assets/art \
    --out  gen/ \
    03-char 08-avatar 02-char 06-char 07-freeze 01-duo \
    --cols 3 --cell 1024 --quality high --sup 3
```

It builds the sheet, calls `gpt-image-2`, keys each cell back out, solves
scale and offset against the crop it came from, writes the asset at `--sup`×
the measured box and prints a Δ per asset. `--sheet return.png` re-scores a
return with no new API call; pass it more than once and each asset comes from
whichever sheet drew it best. `--self-test` runs the offline assertions.

The five things it does that a hand-rolled version will get wrong are below.

## 1. Cell size is the asset's target size

`--cell` should be about 3× the longest side of the biggest asset, and every
asset sits centred in its own cell at the size it must return at. Filling
about 86% of the cell leaves the model somewhere to put the antialiased edge.

Sheet size is constrained (`gpt-image-2`: both edges a multiple of 16, longest
≤ 3840, ratio ≤ 3:1, 655,360 to 8,294,400 total pixels), so pick `--cols` to
land inside that; `artgen.py` snaps for you.

## 2. Density is free. Source resolution is not.

Two controls, run on purpose:

| Sheet | Cell | Same six icons, mean Δ |
|---|---|---|
| 6 assets, 3072 × 2048 | 1024px | 14.56 |
| 77 assets, 3040 × 2432 | 304px | **12.97** |

Packing 77 assets into one call scored **better** than six. The grid does not
degrade with density, so batch the whole screen's worth in one call.

What does predict the score is the asset's own native pixel size in the
capture:

| Native longest side | n | Mean Δ |
|---|---|---|
| 0-64px | 50 | 10.57 |
| 64-96px | 21 | 10.86 |
| 96-128px | 6 | 9.10 |
| 128-256px | 1 | 6.34 |
| 256-400px | 5 | **3.42** |

Below about 128px there is not enough in the source to redraw. Shape survives
and colour does not: a lilac tab icon came back grey, a flag came back as a
plain tricolour. **Under 128px, use CSS or inline SVG.** The 77-icon sheet
averaged 10.5 and none of it was worth shipping.

## 3. Ask for a key colour on the way back, and measure the one you get

`gpt-image-2` has no transparent background, so the prompt asks for a flat
ground to key out:

> "Place every cell on a COMPLETELY FLAT, uniform, pure magenta background,
> hex #FF00FF, no gradient, no vignette, no shadow, no texture. The artwork
> itself must contain no magenta at all."

Two things follow that cost a run each if you skip them.

**The model does not return the ground you asked for.** One run asked for
`#FF00FF` and returned `#F308EC`; a cell on the 77-sheet returned `#E415E3`.
Key against the **modal border colour of the returned cell**, per cell, not
against the hex in your prompt.

**Pick the key by measuring the artwork, not by habit.** The closest art
pixel to each candidate, across this set: magenta 73, green 72, blue 63,
red 49, cyan 46, yellow 40. Magenta wins here because this art has no
magenta in it, which is exactly the property you are testing for.

### The input side: white and key score the same

The sheet you assemble does not have to carry the key colour. Assembling on
plain white and asking for magenta back scored **4.67** against **4.29** for
a key-coloured input, inside run-to-run noise. Use `--in-ground white` for
small art: converting a crop's white ground to magenta leaves a 1px antialias
halo, which is nothing on a 400px character and ruinous on a 40px icon.

And whichever you use, **flood fill from the corners.** A global
near-white → key swap takes the whites inside the artwork, which on this set
means the characters' eyes.

## 4. The alpha ramp is per asset, not a constant

`refkit key --tol .. --hi` are per-channel distances from the key colour.
`--hi 110` is not a constant: it was set just under the closest-to-magenta
pixel of one particular character. Reuse it on a lilac icon whose colour sits
83 from the returned ground and the icon itself keys to partial alpha, the
unpremultiply divides by that, and grey comes back. That asset scored 48 and
the drawing was fine; the ramp was wrong.

Derive both ends from the crop being redrawn:

```python
near = min |art_pixel - ground| over the ink            # closest art to the key
hi   = clamp(24, 110, near * 0.8)
tol  = max(8, hi * 0.35)
if near < 30: warn("art within %d of the key: pick another key colour")
```

Re-scoring the 77-icon sheet with this and no new API call took its mean from
11.54 to 10.53.

## 5. Solve the fit, and check the sign

Score the keyed cell against the crop over a small scale and offset sweep,
and bake the winner. Two traps:

- **The sign.** A search that slides the *window* right across a padded
  canvas is finding an artwork that sits left, so the render must **subtract**
  the solved offset. Getting this backwards applies the shift twice, in the
  wrong direction. Measured on one asset: Δ 31.662 with `+dx`, **0.098** with
  `-dx`. It is invisible at a glance and it is the reason `artgen.py`'s
  self-test bakes an asset and re-scores it rather than only checking the
  solver.
- **Score at 1×, ship at N×.** Solve against the measured crop, then render
  the same solution at `--sup 3` so the board has a resolution-independent
  asset.

## Stability, cost and what to budget

Four independent returns of the same six assets:

| Run | Mean Δ |
|---|---|
| key ground, `--quality high` | 4.29 |
| key ground, `high`, again | 4.77 |
| key ground, `--quality medium` | 4.50 |
| white ground, `high` | 4.67 |

The method is repeatable to about ±0.25, which is the actual claim worth
making: not "it scored 3.96 once" but "any run of it lands near 4.5, and
best-of-four ships at 3.96". Generate two sheets and pass both to `--sheet`
if the assets matter.

**`medium` is within 0.3 of `high`** at roughly a quarter of the cost, so
draft on `medium` and spend `high` on the sheet you keep.

There is no 60s network ceiling. An earlier run of this repo recorded one and
it does not reproduce: a 3072 × 2048 `high` edit returned in ~114s and a
3040 × 2432 one in about three minutes. The skill's own note stands instead,
that complex prompts can take up to two minutes.

Six characters, four sheets, one 77-icon sheet and a 6-up control cost about
**$4.30** on the user's OpenAI account. Say what you are about to spend before
you spend it.

## What to write down afterwards

A generated asset is a claim. Put the number beside it, in a manifest the
generator reads, in the same shape as `crops.json`:

```json
"03-char": {"delta": 3.88, "from": "white/high", "scale": 1.0,
            "dx": 0, "dy": 0, "runs": [4.31, 4.28, 5.81, 3.88]}
```

`duolingo-ios` keeps these in `art-gen.json` and puts them on their own board
(`00e-art-gen`) next to the crops they were scored against, including the
icon result that did not work. **The generated assets do not replace
`assets/art/`**, because the crops score 0 and these score 4. They are on the
board as evidence about the method, which is the only honest place for them
when the capture already holds the pixels.
