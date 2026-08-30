# Raycast iOS — Ask AI, models & presets

A `clone-prototype` run over eleven Raycast iOS screens in three flows: the Ask
AI conversation (select a note, type a prompt, watch the answer stream in, act
on it), the Models bottom sheet, and the Presets picker. Two foundation boards
plus eleven replicas — every colour and metric traced to a sample off the
source capture.

Open it with `?canvas=raycast-ios`.

| file | what it is |
|---|---|
| `00-design-tokens.html` | The contract. Swatches, type ramp, radii, metrics. Inlined byte-identically into all eleven screens. |
| `00b-evidence.html` | The measurement behind every token. Split off its own board once screens 07–11 doubled the token count past what a 478 × 980 shape can hold. |
| `01-ask-anything` … `06-answer-scrolled` | Ask AI. |
| `07-models-sheet` … `08-home-composer` | Model switching: the Models sheet over a dimmed launcher, then the launcher itself. |
| `09-presets-opening` … `11-home-perplexity` | Presets: the list mid-transition, the full list, and the launcher after Perplexity is picked. |

Capture scale is `1179 / 393 = 3.0` px/pt — native @3x, cross-checked against
height (`2556 / 852 = 3.0`), so ink and hairlines could be picked directly
instead of solved for. Two values still needed work:

- `--rc-border: #E4E4E4` came out of a 1pt coverage solve on the Copy pill's
  outline (79 total deficit over 3 px). A naive pick reports it far too light.
- Everything behind the sheet sits under `--rc-scrim: rgba(0,0,0,.20)`, so every
  colour sampled there was divided by 0.8 before becoming a token — the toolbar
  pill reads 198 in the capture and is `#F6F6F6` in the UI. The Models sheet
  confirms it from the other side: `#EFEFEF` launcher ground reads `#BEBEBE`
  under the scrim, `1 − 190/239 = .205`.

The keyboard is worth a note: a flat-neighbour census proved every key —
including shift, backspace, `123`, return and space — is pure `#FFFFFF` on an
`#E3E5E6` ground, with **no** keycap shadow. The dark modifier keys and drop
shadows that iOS keyboards usually carry are simply not in these frames.

## Screens 07–11: two things the earlier six did not need

**Brand marks.** Ten of the eleven preset rows are third-party logos. They are
inline SVG paths from [lobehub/icons](https://lobehub.com/icons) (served as
`@lobehub/icons-static-svg`), one per row, recoloured to a value sampled off the
capture; the Raycast mark itself is not in that set and comes from
[simple-icons](https://simpleicons.org). Two traps: lobehub's `grok` icon is the
swirl, not the mark in this capture — the frame shows the xAI "X", which is
`xai.svg`; and simple-icons' Raycast path fills its inner square under both
fill rules, so the generator knocks that square out with an SVG `<mask>` to
leave the L bracket.

**Blur.** The Presets screens sit on a blurred launcher rather than a scrim.
`filter: blur(26px)` over the real launcher markup reproduces the colour blobs
where a flat fill cannot, and a 140px white ramp (`.62 → .30 → 0` over
60 / 98 / 134px) lifts the nav strip to the measured `#FBF8FB` without washing
the purple blob out. The list's bottom rows fade under a `mask-image` ramp;
`backdrop-filter` does nothing inside a masked element, so the last row is
blurred directly with `filter: blur(4.6px)`.

## Known differences from the source

- **No Dynamic Island and no home indicator.** Mobbin masks both out of these
  captures — the pixel where the island would sit reads as plain scrim — so the
  replica omits them rather than inventing them.
- **Device corner radius.** The capture's corners are ≈ 60 pt; the repo's shared
  phone frame is 52 pt. The frame was left alone, so the answer sheet's bottom
  corners clip slightly differently than in the source.
- Type is Inter / Helvetica Neue against the capture's SF Pro. Line breaks are
  forced with `<br>` and `white-space: nowrap` so the wraps match the source
  string for string regardless of the substituted face; measured line widths
  land within ~1.5%.
- **The presets backdrop is desaturated.** `refkit diff` puts mean chroma at
  2.0 against the source's 5.9 — a single CSS Gaussian under two white veils
  spreads the launcher's colour blobs but bleaches them, and below y 560 the
  replica is effectively neutral where the source still carries a tint.
  Luminance is not the problem: mean brightness matches to 0.1, and only the
  y 240–320 band runs measurably dark (−2.5).

## The reference row is not checked in

Phase 5 parks each source capture in its own `ref-NN-<slug>.html` and adds a
third `layout.json` row listing them **in the same order as the replica row**,
so item N lands directly under item N and the two can be read against each
other. `layout.json` here keeps that row.

The `ref-*.html` files themselves are gitignored: they embed third-party app
screenshots from Mobbin's library, which this repo does not redistribute.
Regenerate them locally from your own captures — the skill's Phase 0 and Phase 5
have the embedding steps.

Sources for this run were user-supplied Mobbin captures of the Raycast iOS Ask
AI flow (`asking-ai-02` … `asking-ai-07`), the model picker
(`changing-a-model-01`, `-02`) and the preset picker (`changing-a-preset-01`
… `-03`), uncropped so the attribution watermark is retained in the reference
boards. All eleven are the exact frames being cloned — no near-matches.

## Attribution

Raycast is a trademark of Raycast Technologies Ltd. This board is an
unaffiliated design study, kept as a record of the measurement workflow. It is
not a Raycast product, not endorsed by Raycast, and the replica HTML is not
meant to be shipped as a user-facing interface. The preset rows reproduce the
marks of OpenAI, Anthropic, Google, Perplexity, DeepSeek, Meta, xAI, Mistral,
Moonshot AI and Alibaba Qwen, each the trademark of its owner, used here only
to identify the row the source capture shows.
