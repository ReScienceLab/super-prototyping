# Artwork: cropping, and the one case for generating

Loaded from Phase 3 of `clone-prototype`. Read it when a screen carries
illustration, photography, a mascot, a chart or any other picture you cannot
build out of CSS and inline SVG.

## The decision, in one table

| The pixels you need are… | Do this |
|---|---|
| on the capture, whole | **crop at the measured box** |
| on the capture, partly hidden by a sheet, fade or scroll edge | crop what is visible; treat the rest as absent (Phase 3's rule about invented content applies to pictures too) |
| a third-party logo or app icon | pull the real file; see `brand-marks.md` |
| genuinely not on any capture (a variant state, a second colourway, a filler photo that is nobody's brand) | generate |

**A crop is exact by construction and a generation is never exact.** That is
the whole argument, and it has a number behind it. In the `duolingo-ios` run
the campfire character was cut from capture 03 at its measured box, which
scores a mean delta of **0** because those are the reference's own pixels.
The same crop handed to `gpt-image-2` as an edit, prompted for a faithful
reproduction, scored **38.53**: recognisably the same character, with a
different head-to-body ratio, a redrawn hairline, a resized marshmallow and
the campfire moved. Good drawing, useless measurement. Generating it properly
gets to **3.96**, which is a real result and still not 0.

So: generate only where the pixels do not exist, and say in the folder README
which assets were generated and why.

## Cropping at the measured box

Do not crop by eye. Put every asset in one JSON keyed by id, holding the
capture it comes from and its box **in design pt**, and let the generator do
both halves:

```json
{
  "01-duo":   ["01",  57.5, 345.3, 141.0, 431.8],
  "07-gem":   ["07", 311.8, 406.8, 332.3, 431.8]
}
```

```python
CROPS = {k: v for k, v in json.loads(
             (OUT / "crops.json").read_text()).items()
         if not k.startswith("_")}

def cut():                       # refs -> assets/art/<id>.png, at SCALE
def art(cid):                    # <img> placed back at the same pt box
```

Because `art()` reads the same numbers `cut()` cropped at, **an asset cannot
drift from where it was measured**, and a box correction is one edit rather
than two. `duolingo-ios` places 128 illustrations this way.

Three things that go wrong:

- **Crop at the capture's scale, not at 1×.** The box is pt; the pixels are
  `pt × scale`. A crop taken at 1× is a soft, wrong-sized asset that then
  gets "fixed" by scaling the `<img>`, which hides the error.
- **A crop carrying a strip of page** registers off under its own CSS radius.
  Take `refkit bbox --grow`'s box, not a hand-drawn one and not plain
  `bbox`'s: a threshold stops at the first low-contrast edge, so an asset with
  a pale rim comes back clipped, and `cut()` and `art()` then agree with each
  other about the wrong number. Four of `duolingo-ios`' 128 crops were wrong
  this way and the whole-frame deltas barely moved.
- **Commit `assets/art/`, gitignore `assets/refs/`.** The crops are component
  art and the boards are dead without them; the captures are whole app
  screens. Say so in the folder's `.gitignore`, because the opposite is the
  usual convention for a screenshot-sourced folder and the next person will
  assume it.

## Generating, when you have to

[`generating.md`](generating.md) is the procedure, measured end to
end, with `artgen` running it. Four things from it that decide
whether generating is worth attempting at all:

- **Pack the assets into a grid at the size and position they must come back
  at.** Handing the model the answer's geometry is what took this set from
  18.41 to **3.96**; the prompt and the quality flag barely move it. Every
  cell came back at scale 0.99-1.00, offset ≤ 1px, in four independent runs.
- **Density is free, source resolution is not.** 77 assets in one call scored
  better than 6. But Δ tracks the asset's native size in the capture (0-64px:
  10.57, 256-400px: 3.42), so **anything under about 128px stays CSS or inline
  SVG.** Shape survives at that size and colour does not.
- **`gpt-image-2` has no transparent background**, so generate on a flat key
  colour, pick the key by measuring the artwork's closest pixel to each
  candidate, and key against the ground the model actually returned rather
  than the hex you asked for. They differ: `#FF00FF` asked, `#F308EC` back.
- **Score it and publish the number.** A generated asset is a claim. Keep the
  deltas in a manifest beside `crops.json` and put them on a board.

Two things that cost a run: **moderation blocks are not retryable**, so revise
the prompt or the input rather than re-running; and **every call bills the
user**, at roughly $0.21 per high-quality square. This whole investigation was
about $4.30. Confirm before spending at that level.

Prompt for the measured thing, not for a nice picture: state the palette in
hex from your own token table, the ground it will sit on, and what must stay
identical to the input. The model preserves what it is told to preserve far
more reliably than what it is not told about at all.
