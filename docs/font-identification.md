<!-- Evaluation carried out 2026-08-30 to decide how this repo identifies type
faces from a reference capture. Kept as the record of why `refkit font` is 90
lines of numpy rather than a model download. Section 7 is what actually
shipped. -->

# Identifying fonts from images: options, licenses, and measured results

**Date:** 2026-08-30
**Context:** evaluating a font-identification step for an open-source prototyping project.
**Constraints:** must be as open-source as possible; package must be lightweight.

---

## 1. Executive summary

There is no maintained, pip-installable "identify this font" library. The field is a handful
of research reproductions, two usable pretrained checkpoints, and a few commercial APIs.

Testing all of them against 58 iOS app screenshot sets produced three conclusions:

1. **License eliminates half the field before accuracy is even relevant.** The best-performing
   open-source model (`mixfont/lens`) is non-commercial-only. The most-cited one (`fontina`)
   carries AdobeVFR weights, also non-commercial.
2. **The published accuracy numbers do not survive contact with a different renderer.** Two
   models advertising 96–99% scored 2/18 and 3/18 on clean control renders, because those
   numbers were measured on each model's own synthetic pipeline.
3. **For UI screenshots the ML models are structurally incapable of the right answer.** iOS
   text is SF Pro, which is not a Google Font and is in no public model's label set. They can
   only ever return a lookalike.

**Recommendation:** a ~90-line closed-set render-and-compare matcher (`fontid.py`, written for
this evaluation). It has no license encumbrance, needs only numpy + Pillow (33 MB, zero model
download), outscored every model tested, and is the only option that can name SF Pro.

---

## 2. Landscape

### 2.1 Open-source, runs locally

| Project | Coverage | License | Activity | Stars |
|---|---|---|---|---|
| [Storia-AI/font-classify](https://github.com/Storia-AI/font-classify) | ~3,000 Google Fonts | Repo has **no LICENSE**; [ONNX weights](https://huggingface.co/storia/font-classify-onnx) are MIT | Mar 2024 | 145 |
| [mixfont/lens](https://github.com/mixfont/lens) | 1,000+ families / 5,000+ variants | **Non-commercial only** | Jun 2026 | 28 |
| [JeffersonQin/YuzuMarker.FontDetection](https://github.com/JeffersonQin/YuzuMarker.FontDetection) | CJK + English | MIT | Feb 2025 | 568 |
| [dchen0/font_classifier_v4](https://huggingface.co/dchen0/font_classifier_v4) ([code](https://github.com/Create-Inc/font-model), [paper](https://arxiv.org/html/2602.13889)) | 394 variants / 32 families | Apache-2.0 | Dec 2025 | 5 |
| [gaborcselle/font-identifier](https://github.com/gaborcselle/font-identifier) | 48 fonts | MIT | Nov 2023 | 33 |
| [Dexterp37/fontina](https://github.com/Dexterp37/fontina) | AdobeVFR (2,383) | MIT code, **non-commercial weights** | Dec 2023 | 22 |
| [robinreni96/Font_Recognition-DeepFont](https://github.com/robinreni96/Font_Recognition-DeepFont) and other [DeepFont](https://arxiv.org/pdf/1507.03196) reproductions | varies | MIT | 2023–24 | 281 |

Two properties are shared by every local option: they classify a **cropped word image** (text
detection via Tesseract/PaddleOCR/EasyOCR is your problem), and those descended from the
AdobeVFR dataset inherit its **non-commercial research-only** terms.

### 2.2 Current state of the art is not published

Collabora's [FasterViT-2 font model](https://www.collabora.com/news-and-blog/blog/2025/11/11/font-recognition-reimagined-with-fastervit-2/)
(Nov 2025) claims 87.4% top-1 / 92.1% top-5 across 2,700+ fonts on a real-world test set.
No weights or code found — on their HuggingFace org or anywhere else. Blog post only.

### 2.3 Third-party APIs

| Service | Terms |
|---|---|
| [WhatFontIs API v2](https://www.whatfontis.com/API-identify-fonts-from-image.html) | 1.2M font index, 20 matches/request. **Free for personal use** (200 req/day, backlink required); commercial by negotiation. Best free option. |
| [Mixfont](https://www.mixfont.com/font-recognition-api) | Hosted `lens`. Credit-based, small non-renewing free allowance. |
| [LikeFont](https://en.likefont.com/api/) | Strong CJK. Minimum purchase 10,000 calls. |
| [Aspose OCR Cloud](https://docs.aspose.cloud/ocr/identify-fonts/) | Only 20 typefaces. Not useful. |
| WhatTheFont (MyFonts), Fontspring Matcherator, Font Squirrel Matcherator | Web/app only, no public API. |

### 2.4 Vision-language models do not work for this

[*Texture or Semantics? VLMs Get Lost in Font Recognition*](https://arxiv.org/abs/2503.23768)
benchmarked frontier VLMs on 15 common fonts. They perform poorly, are derailed by the Stroop
effect (a font name rendered in a different font), and neither few-shot nor chain-of-thought
helps. Superhuman at reading the text, bad at seeing the shapes.

---

## 3. Method

**Corpus:** `~/Desktop/Mobbin素材` — 58 iOS app screenshot sets, 1179×2676 (3×).

**Control set:** 9 fonts × 2 words, rendered at 96 px black-on-white via Pillow. Deliberately a
*different* renderer from any model's training pipeline — this is what separates a model that
learned letterforms from one that learned its own data generator.

**Screenshot pipeline:** Tesseract word boxes → keep alphabetic words ≥6 chars at confidence
≥70, height ≥20 px, excluding the top 6% (status bar) and below 65% (keyboard zone) → take the
3 tallest → pad 25% → auto-invert dark mode → upscale to ≥60 px. The **same crop** is fed to
every model. Per app: 3 screenshots × up to 3 crops, majority vote.

**Reproduce:** `/Users/yilin/Developer/GitPlayground/fonttest/` (`bench3.py` = ML models,
`bench4.py` = render-matcher, `fontid.py` = the matcher, `--selftest` included).

---

## 4. Results

### 4.1 Control set — clean renders, fonts inside each model's own label set

| Tool | Top-1 | Failure mode |
|---|---|---|
| **`fontid.py`** | **22/24** | 24/24 within top-2; only SF Pro↔SF Rounded swaps (0.867 vs 0.862) |
| mixfont/lens | 14/18 | Permanent Marker → Lacquer; Playfair Display → Bacasime Antique |
| Storia font-classify | 14/18 | **Inter → Gothic A1**; Montserrat → Montserrat Alternates |
| dchen0/font_classifier_v4 | 3/18 | Collapses to `Montserrat_Bold`; over-predicts Bold/Italic |
| gaborcselle/font-identifier | 2/18 | Collapses to `Arial Black`; only Pacifico correct |

The two weakest advertise 96% and 99% accuracy respectively. Both figures come from each
model's own synthetic test split. Inter, Roboto and Lora are all inside gaborcselle's 48-font
label set and it missed all three — this is generalization failure, not a setup error.

### 4.2 The SF Pro baseline — the decisive finding for UI work

SF Pro, SF Compact and SF Rounded rendered from `/System/Library/Fonts/`, 4 words each:

| Model | SF Pro → | SF Compact → | SF Rounded → |
|---|---|---|---|
| mixfont/lens | **Liter** (3/4 @ 1.00) | Golos Text (4/4) | National Park (4/4) |
| Storia | **Inter Tight** (4/4, 0.68–0.99) | Barlow Semi Condensed / Poppins | Thasadith (4/4) |
| `fontid.py` | **SF Pro** (correct, has the real file) | SF Compact (4/4 @ 0.92) | SF Rounded |

Both models are highly *consistent* and can distinguish the three SF variants — they simply
cannot name them, because SF Pro is not a Google Font. On iOS screenshots their best possible
output is a lookalike.

### 4.3 Real screenshots — 58 apps

| Tool | Result |
|---|---|
| **`fontid.py`** | **47/58 apps → SF family** (correct: these are iOS screenshots) |
| mixfont/lens | Only **14/58** apps reached ≥50% self-agreement |
| Storia | Noisiest; degenerate attractor `Gothic A1` won 6 apps outright |

**Ground-truth hits, agreed independently by all three methods:**

| App | Prediction | Truth |
|---|---|---|
| Slack | Lato (lens 5/9, storia 6/9, fontid 5/9) | ✅ Lato |
| YouTube | Roboto (lens 3/7, fontid runner-up 3/7) | ✅ Roboto |

**Plausible lookalikes for brand fonts absent from every label set:**

| App | Real font | lens said |
|---|---|---|
| Airbnb | Airbnb Cereal | Figtree **8/8** |
| Calm | (custom geometric) | Figtree **7/7** |
| Revolut | Aeonik | Inter **5/5** |
| Spotify | Spotify Mix / Circular | Geom 4/8 |
| Duolingo | Feather Bold | Madimi One / National Park (rounded heavies — right class) |

### 4.4 Not run, and why

- **fontina** — weights are manual Google Drive downloads; trained on AdobeVFR, so
  non-commercial. The author documents **0.05 top-1 on `VFR_real_test`** and states he is
  releasing it hoping someone can fix it. Disqualified on license before accuracy mattered.
- **YuzuMarker** — `demo.py` requires the multi-GB VCB-Studio CJK font pack **locally just to
  map class indices to font names** (the cache is in neither the repo nor the HF model repo),
  and calls `gr.Image.update`, removed in Gradio 4. CJK-only by config. Out of scope for
  Latin UI text.
- **Collabora FasterViT-2** — no public weights.

---

## 5. Footprint

| Tool | Python deps | Model | Total |
|---|---|---|---|
| **`fontid.py`** | numpy 20 MB + Pillow 13 MB | **0** | **33 MB** |
| Storia ONNX | onnxruntime 78 MB (+ opencv 125 MB on their code path) | 61 MB | 139–264 MB |
| mixfont/lens | torch 471 MB + torchvision 6 MB + tesseract 35 MB | 45 MB | ~570 MB |
| gaborcselle | torch 471 MB + transformers 49 MB | 43 MB | ~576 MB |
| dchen0 v4 | torch 471 MB + transformers 49 MB | 338 MB | ~871 MB |

---

## 6. Recommendation

### Primary: `fontid.py`

Render the known word in every candidate font, compare glyph shapes, rank. Justified because
UI fonts are a **closed set of ~20**, so the 3,000-class problem the models solve is the wrong
problem.

- No license encumbrance — you own the code.
- numpy + Pillow only; no model download, no torch, no Tesseract at inference.
- Outscored every model tested (22/24 vs 14/18 best).
- The only option that can name SF Pro, because you supply the font files.
- `--selftest` verifies all 21 candidates identify their own rendering within top-2.

```
$ python fontid.py crops2/Slack-iOS__view-my-profile-02.png Joshua
Lato   0.602      ← correct
Arial  0.547
Nunito 0.539
```

**Scoring metric.** Shape IoU at a common cap height, multiplied by the width ratio. Stretch-only
comparison discards width, so condensed faces score identically to their normal siblings;
pad-only over-punishes minor tracking drift. The product separates both. Candidates are searched
over 5 weights × 4 tracking values, because iOS tracks tighter than Pillow's default advance
widths — without that search every screenshot matches a condensed face.

**Known ceilings, both real:**
- The true font must be in your candidate list. Outside it you get the nearest neighbour, same
  as any model.
- SF Pro vs SF Rounded is unresolvable at screenshot resolution (0.867 vs 0.862) — they differ
  only in corner rounding.
- Confidence collapses on small text: clean renders score 0.85–0.93, screenshot crops 0.60–0.73
  with #1/#2 margins of 0.01–0.04. **Treat score <0.80 or margin <0.05 as "no call."**

### Secondary: Storia ONNX, for open-ended brand-font lookup

When the font is genuinely unknown, run a second pass over ~3,000 Google Fonts. The
[ONNX weights are MIT](https://huggingface.co/storia/font-classify-onnx); the **repo code is
unlicensed**, so supply your own preprocessing (~40 lines — `storia_infer.py` in the test
directory does this and drops the opencv/albumentations dependency).

### Avoid

- **mixfont/lens** — best model tested, but non-commercial-only.
- **fontina** — non-commercial weights, 5% real-world accuracy.
- **gaborcselle, dchen0/font_classifier_v4** — clean licenses, but do not generalize past
  their own render pipeline.
- **VLMs** — measurably bad at this.

---

## 7. What shipped here

`fontid.py` was folded into `tools/refkit.py` as `refkit font`, which takes a
region in design pt like every other refkit command instead of a pre-made crop:

```bash
refkit bands ref.png 40 410 420 470 --axis cols --minfrac .01   # word gaps
refkit font  ref.png 17.3 139 78.7 152 Libraries --pt 3 --fonts ./brand-fonts
```

Two changes to the matcher on the way in, both from testing against SF Pro:

- **The weight axis is set by name, not by position.** Pillow's
  `set_variation_by_axes` takes the whole axis vector in order, and SF Pro's
  first axis is *Width* — `set_variation_by_axes([700])` renders it maximally
  expanded rather than bold, and every weight in the search comes out
  identical. `tools/test_refkit.py` pins this.
- **Optical size is driven by the measured cap height.** The region is already
  in design pt, so SF Pro's `opsz` axis gets the real value instead of its 28pt
  default — the difference between SF Pro Text and SF Pro Display letterforms.

Re-measured after both fixes, on native @3x captures with the word boxed
exactly:

| capture | word | result |
|---|---|---|
| Notion iOS, page title | `list` | **SF Pro** 0.928, margin 0.062 |
| Notion iOS, body row | `presentation` | **SF Pro** 0.865, margin 0.146 |
| Slack iOS, row label, system faces only | `Libraries` | *no call* — SF Compact 0.691 / SF Pro 0.660 |
| Slack iOS, same word, +16 Google Fonts | `Libraries` | **Lato** 0.757, margin 0.066 ✅ |

The Slack pair is the behaviour that matters: with Lato outside the candidate
set the tool returns *no call* rather than the nearest system lookalike, and
adding the directory of Google Fonts is what turns it into an answer.

The single failure mode in practice is a box that does not hold exactly the
word you named — a clipped leading glyph drops the score from 0.93 to 0.49.
`refkit font` says so when the top score is under 0.80.

## 8. Sources

- [Storia-AI/font-classify](https://github.com/Storia-AI/font-classify) · [ONNX weights](https://huggingface.co/storia/font-classify-onnx)
- [mixfont/lens](https://github.com/mixfont/lens) · [Mixfont API](https://www.mixfont.com/font-recognition-api)
- [YuzuMarker.FontDetection](https://github.com/JeffersonQin/YuzuMarker.FontDetection)
- [Create-Inc/font-model](https://github.com/Create-Inc/font-model) · [arXiv 2602.13889](https://arxiv.org/html/2602.13889) · [weights](https://huggingface.co/dchen0/font_classifier_v4)
- [gaborcselle/font-identifier](https://github.com/gaborcselle/font-identifier)
- [Dexterp37/fontina](https://github.com/Dexterp37/fontina)
- [robinreni96/Font_Recognition-DeepFont](https://github.com/robinreni96/Font_Recognition-DeepFont) · [DeepFont paper](https://arxiv.org/pdf/1507.03196)
- [Collabora FasterViT-2](https://www.collabora.com/news-and-blog/blog/2025/11/11/font-recognition-reimagined-with-fastervit-2/)
- [WhatFontIs API](https://www.whatfontis.com/API-identify-fonts-from-image.html) · [LikeFont API](https://en.likefont.com/api/) · [Aspose OCR](https://docs.aspose.cloud/ocr/identify-fonts/)
- [Texture or Semantics? VLMs Get Lost in Font Recognition (arXiv 2503.23768)](https://arxiv.org/abs/2503.23768)
