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

Three screens added later from 881 × 2000 Mobbin captures
(`881 / 393 = 2.242 px/pt`, footer strip excluded), read off the images
rather than probed, so treat their metrics as ±1 pt. What they add on top
of the token block, and why it stays out of it:

- **The sheet sits higher.** Its top edge is at 58 pt, not the 71 pt every
  other sheet on this board uses, so the value is a board-local
  `--pw-sheet-top`. The paywall is a StoreKit-style modal rather than one
  of the app's own sheets.
- **The blue is not `--n-blue`.** Check marks, the selected price card and
  the subscribe button read `#4A86E0`, visibly lighter and cooler than the
  `#2784E0` the rest of the app uses for selection. The alert's OK button
  is iOS system blue `#3478F6`, a third value. Both are board-local.
- **The cat is drawn, not cropped.** The line-art cat and the three
  sparkle strokes are hand-written SVG paths that match the pose, the
  overlap with the card's right edge and the clip at the band's bottom
  edge. They are not the source's artwork and will not survive a
  pixel diff; the intent was the silhouette at canvas scale.
- **The success state is a scrim plus the alert.** The dimmed sheet under
  the alert is the monthly board with a 20 % black overlay and the CTA's
  label swapped for a spinner, which is what the capture shows: the
  purchase completes while the button is still spinning.

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
