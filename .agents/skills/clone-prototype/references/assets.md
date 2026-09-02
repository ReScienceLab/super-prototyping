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
reproduction, scored **38.53**. It is recognisably the same character, with
a different head-to-body ratio, a redrawn hairline, a resized marshmallow and
the campfire moved. Good drawing, useless measurement.

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
  Take `refkit bbox`'s box, not a hand-drawn one.
- **Commit `assets/art/`, gitignore `assets/refs/`.** The crops are component
  art and the boards are dead without them; the captures are whole app
  screens. Say so in the folder's `.gitignore`, because the opposite is the
  usual convention for a screenshot-sourced folder and the next person will
  assume it.

## Generating, when you have to

Four steps. The third is the one people skip, and skipping it is what makes a
generated asset look obviously pasted on.

### 1. Choose the input: a crop, or the whole capture

Both go to the edits endpoint; the difference is what the model can see.

```bash
GPT=~/.claude/skills/gpt-image/scripts/gptimage.py

# A: one crop in. The model has the exact palette and line weight in front of
#    it, and nothing else to drift towards. Use it for a variant of something
#    the capture already shows: a second colourway, another pose, an
#    unobscured version of a mascot the sheet cuts off.
python3 "$GPT" -p "PROMPT" -i assets/art/06-char.png -o gen.png \
    --size square --quality medium

# B: the whole screen in. The model sees the surrounding style, so a set of
#    assets comes back consistent with each other and with the app. Use it
#    when you need several pieces at once, or when the thing you want only
#    makes sense in context. Costs more input tokens and gives the model more
#    to wander into; name the element and its position explicitly.
python3 "$GPT" -p "PROMPT" -i assets/refs/06.png -o gen.png \
    --size square --quality medium
```

`--quality medium` is not a compromise, it is the ceiling. A `high` edit dies
at 61 s with `ReadError('[SSL] record layer failure')`, repeatably; the same
edit at `medium` returned in **41.8 s**. Budget 40 s per asset and do not plan
a batch that assumes otherwise.

Sizes are constrained (both edges a multiple of 16, at least 655,360 px), so
you can rarely ask for the asset's real box. Generate `--size square` and let
step 3 fit it.

### 2. Generate on a key colour, never on white

`gpt-image-2` has no transparent background; the flag offers `opaque` and
`auto` only, and `gpt-image-1.5`, which does, is not wrapped by this skill's
script. So ask for a flat ground you can key out, and ask in the prompt:

> "Place it on a COMPLETELY FLAT, uniform, pure magenta background, hex
> #FF00FF, with no gradient, no vignette, no shadow, no texture and no drop
> shadow touching the background. The character itself must contain no
> magenta at all."

**Do not key on white.** The ground the model paints for "white background" is
not flat and not exclusive to the ground. Measured on one such image: **548
distinct colours** in the border band, and **40% of the pixels inside the
figure** were above the luminance threshold that removes the ground. Keyed, the
character comes back with its eyes and its teeth punched out and the model's
soft shadow still attached as a translucent disc. The same character generated
on `#FF00FF` came back with a border averaging **5.6 levels** from the key,
worst pixel 33, and keys cleanly on the first try.

Pick a key the artwork genuinely does not contain, and say so in the prompt.
Magenta is the usual choice; use `#00FF00` if the asset is pink.

### 3. Key, unpremultiply, and fit to the measured box

```bash
python3 "$REPO/tools/refkit.py" key gen.png -o assets/art/06-char.png \
    --ground FF00FF --box 109.7 165.9 --pt 2.2417
```

```
ground #FF00FF: border distance mean 5.6 max 33.0   keyed 71.1% of the frame
ink box (191, 65, 849, 956)  -> (658, 891)
fitted to the measured box: (246, 372)
```

It does three things a threshold alone does not. It **checks the ground is
flat** and exits rather than half-keying an image the model did not paint as
asked. It **unpremultiplies**: a soft edge pixel is `C = A·F + (1−A)·K`, so
keying alone leaves every edge tinted with the key colour, and solving back
for `F` removes that fringe in the same pass. And it **fits to the pt box you
measured**, so the generated asset lands exactly where a crop would have, and
`crops.json` stays the single source of position.

Alpha ramps over `--tol .. --hi`, both per-channel distances from the key.
`--tol 45` is the noise floor, above what a flat ground actually wobbles by;
`--hi 110` is where a pixel is certainly artwork, set below the closest real
art pixel to magenta in this asset (115, with 99% of the art past 162). The
gap between them is the antialiased edge. If the border check fails, restate
the hex and the "completely flat" sentence and generate again. Do not raise
`--tol` past `--hi` to get through it; that keys the artwork, not the ground.

### 4. Verify it like any other measurement

A generated asset is a claim, so it gets a probe: composite it and the true
crop on the same ground and difference them.

The campfire character, generated from its own crop, keyed and fitted, scores
a mean **21.49 levels** against the crop it was made from. That is the good
case, with the reference in the model's context and the geometry solved back
to the measured box, and it is still twenty times worse than the **0** a crop
scores. Put the number in the folder README beside the asset. If it is worse
than the chrome around it, say so, or the next reader will conclude the layout
is off.

Two more things that cost a run: **moderation blocks are not retryable**, so
revise the prompt or the input rather than re-running; and **every call bills
the user**, with `-n 8 --quality high` at roughly $1.70. Confirm before
spending at that level.

Prompt for the measured thing, not for a nice picture: state the palette in
hex from your own token table, the ground it will sit on, and what must stay
identical to the input. The model preserves what it is told to preserve far
more reliably than what it is not told about at all.
