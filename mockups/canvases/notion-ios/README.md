# Notion iOS, a worked example

A real run of the `clone-prototype` skill, kept as the reference for what a
finished board looks like. One measured token block plus nine replica screens,
every colour and metric traced to a sample off the source capture.

Open it with `?canvas=notion-ios`.

| file | what it is |
|---|---|
| `00-design-tokens.html` | The contract. Swatches, type ramp, radii, metrics, and the evidence for each value. Inlined byte-identically into all nine screens. |
| `01-splash` … `06-share-settings-sheet` | The screens. 393 × 852 pt frames on 478 × 980 artboards, fully self-contained. |
| `07-plan-plus-ai-monthly` … `09-purchase-success` | The in-app purchase sheet: Plus & AI with the monthly and the yearly price selected, then the StoreKit "You're all set" alert over it. |

Two things in `00-design-tokens.html` are worth reading. The capture scale
(`300 / 393 = 0.7634 px/pt`) is recorded there, and `--n-hairline: #E9E8E7`
came out of a 1pt coverage solve rather than a direct pick. A naive sample of
that divider reports it far too light.

`--n-font` is measured too, which is newer than the rest of the board.
`refkit font` on a native @3x capture ranks SF Pro first on the page title
(0.928, next 0.866) and on a body row (0.865, next 0.719), so the
`-apple-system` stack is evidence, not the usual assumption.

```bash
refkit bands ref.png 75 350 500 435 --axis cols --minfrac .01   # word gaps
refkit font  ref.png 119 118 163.4 143.4 list --pt 3
```

## The purchase sheet, 07 to 09

Three screens added later from 881 × 1910 Mobbin captures
(`881 / 393 = 2.2417 px/pt`), measured with `refkit bbox` and row and column
scans, then shot at 3×, resampled to capture scale and diffed against the
capture until every text run, edge and glyph box agreed within 0.5 pt. A
generator in the run's `scratch/` composes them from the token block of `06`,
inlined byte-for-byte, and places each text run by its cap top; as with 01
to 06, treat the HTML as its output. What they add on top of the token block,
and why it stays out of it:

- **The sheet sits at 58.9 pt** with a 38 pt corner over the app dimmed to
  `#C6C6C6`, not the 71 pt and `--n-r-sheet` the app's own sheets use: this
  is a StoreKit-style page sheet. Handle 36 × 4.5 at 5.3, close glyph 12 pt
  at (351.3, 92.8).
- **The status bar is the stock one.** The captures show a 17 pt semibold
  "9:41" with its cap top at 22.8 pt and the icon group spanning
  281.9–360.4, where the shared block sets a 16 px clock 12 pt lower. These
  three boards place it by hand; 01 to 06 are left as they were.
- **The Dynamic Island is kept.** The captures have none, which the skill
  treats as a capture artefact, and 01 to 06 all show one, so the three
  boards keep it. It is the one deliberate deviation, and it is all of the
  diff above 54 pt.
- **Three blues, none of them `--n-blue`.** Check marks and "Notion AI" are
  `#4E7AB0`; the selected price card is a 2 pt `#487ED0` border on
  `#E7F3FF` with its figures in `#467AB9` and `#4E7BB8`; the subscribe
  button is `#4380D7`; the alert's OK is iOS system blue `#367CEF`.
- **The segmented control has no pill shadow.** 353 × 31.7 at 122.1 with a
  1.8 pt inset on `#EBEBEB`, and the grey runs unchanged right up to the
  white pill's edge on every side. The labels sit 0.85 pt off their cells'
  centres, away from the divide.
- **The feature card is taller than its window.** A 249.8 × 300 white card
  at (71.8, 285.5) with 22 pt corners and a three-layer shadow (`#ECECEC`
  at the edge, `#F6F6F6` 10 pt out, `#FAFAFA` at 40), inside a window from
  250.3 to 540 whose last 40 pt fade linearly to white. A black stroke of
  the cat ramps from 0 to 253 between y 500 and 538 in the capture, and the
  replica's does the same.
- **The cat and the sparkles are generated, not drawn.** Both are crops of
  the capture in `assets/art/` (198 × 250 and 77 × 88 px), redrawn by
  `gpt-image-2` through `artgen` in one two-cell, white-ground,
  geometry-anchored grid at high quality, keyed, and shipped at 3× the
  measured box as `assets/cat.png` and `assets/spark.png`. `art-gen.json`
  has the scores: cat 13.97 and sparkles 10.9 against the crop's 0, both
  over artgen's 8.0 default, and a second independent return did no better
  (14.56, 11.12). Thin black line art on white scores worse than the filled
  characters that default was set on. The head, the whiskers and the
  overlap with the card's edge land on the capture's boxes; the hind leg
  ends 4 pt higher than the capture's. The two returns cost about US$0.50.
- **Price cards** 178 × 75 at 567.5 with a 1 pt `#E4E4E4` border, figures
  21.5 px bold, sub-labels 13 px. **Subscribe** 361.5 × 50.4 at 665.5,
  8 pt corners, 15 px semibold. **Links** 13 px `#9A9A98`, underlined, on a
  23.7 pt pitch from 754.3.
- **The success state** is the monthly board under a 20 % black scrim. The
  button grows to 54.4 pt while it spins and the links move 4 pt down with
  it; a 24 pt ring spinner replaces the label; the alert is 318.7 × 152.2
  at (37.3, 362.3) with 30 pt corners, 70 % white over a 30 px blur and a
  `0 10 30` shadow at 12 %, its title 17 px semibold and its OK pill
  286.9 × 48.5.

Mean absolute delta against the captures, whole phone crop, in levels of
255, and the same below the 54 pt status bar:

| board | whole | below 54 pt |
| --- | --- | --- |
| 07 monthly | 5.08 | 2.63 |
| 08 yearly | 5.29 | 2.86 |
| 09 success | 4.31 | 2.25 |

## The reference row is not checked in

Phase 5 of `clone-prototype` parks each source capture in its own
`ref-NN-<slug>.html` and adds a third `layout.json` row listing them **in the
same order as the replica row**, so item N lands directly under item N and
the two can be read against each other.

Those files are left out on purpose. They embed third-party app screenshots
from Mobbin's library, which this repo does not redistribute. The skill's
Phase 0 and Phase 5 have the search and embedding steps. Regenerate them
locally, then add the row back:

```json
{ "title": "Source of truth: Mobbin captures (Notion iOS)",
  "numbered": true,
  "files": [
    { "file": "ref-01-splash", "label": "Splash" },
    { "file": "ref-02-search-ask-ai", "label": "Search / Ask AI" },
    { "file": "ref-03-notion-ai-chat", "label": "Notion AI chat" },
    { "file": "ref-04-meeting-page", "label": "Meeting page" },
    { "file": "ref-05-date-sheet", "label": "Date sheet" },
    { "file": "ref-06-share-settings-sheet", "label": "Share settings sheet" },
    { "file": "ref-07-plan-plus-ai-monthly", "label": "Plan sheet, monthly" },
    { "file": "ref-08-plan-plus-ai-yearly", "label": "Plan sheet, yearly" },
    { "file": "ref-09-purchase-success", "label": "Purchase success" }
  ] }
```

Screen ids from the original run, on
[Notion iOS](https://mobbin.com/apps/notion-ios-265a7a8a-0006-441c-8c17-ae6fc822c366):

| # | screen | id | match |
|---|---|---|---|
| 1 | Splash | `d131f6fb-5b34-4c53-bc02-ede1374c9da5` | exact |
| 2 | Search / Ask AI | `c119cf0c-6553-47b2-aead-63d060159283` | exact |
| 3 | Notion AI chat | `24aa4e82-e084-4a67-a9aa-fae4bdf4dc4b` | exact |
| 4 | Meeting page | `ac829a85-6eb1-4c89-80f2-668d3ca1c1c2` | near, carries a "Summary ready" toast |
| 5 | Date sheet | `365eabc0-4a33-4d0c-81ee-60ce8a8b5af9` | exact |
| 6 | Share settings sheet | `80450381-9922-4123-b6d2-b3b624b4c3d9` | exact |
| 7 | Plan sheet, monthly | not recorded | exact |
| 8 | Plan sheet, yearly | not recorded | exact |
| 9 | Purchase success | not recorded | exact |

Screens 7 to 9 came in as captures supplied directly, with the Mobbin footer
still on them, so no screen id was recorded. They are the same Notion iOS
app entry; re-find them by their on-screen strings ("Plus & Notion AI",
"You're all set").

Screen 4 has no exact frame in the index. Every capture of that page carries
a toast. Stating that is the point. A near-match that goes unlabelled is how
a replica quietly drifts from its source.

Screen 5 was recorded as a near-match in the original run against
`cfca14fb-…`, which is a *Link expires* sheet from a different flow. The
frame above is the exact one, found by pairing each replica with its capture
side by side, which is what the paired figure in the repo README is for.

## Attribution

Notion is a trademark of Notion Labs, Inc. This board is an unaffiliated
design study, kept as a worked example of the measurement workflow. It is not
a Notion product, not endorsed by Notion, and the replica HTML is not meant to
be shipped as a user-facing interface.
