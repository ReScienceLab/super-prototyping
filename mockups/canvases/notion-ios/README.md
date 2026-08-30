# Notion iOS — worked example

A real run of the `clone-prototype` skill, kept as the reference example for
what a finished board looks like: one measured token block plus six replica
screens, every colour and metric traced to a sample off the source capture.

Open it with `?canvas=notion-ios`.

| file | what it is |
|---|---|
| `00-design-tokens.html` | The contract. Swatches, type ramp, radii, metrics — with the evidence for each value. Inlined byte-identically into all six screens. |
| `01-splash` … `06-share-settings-sheet` | The screens. 393 × 852 pt frames on 478 × 980 artboards, fully self-contained. |

Worth reading in `00-design-tokens.html`: the capture scale (`300 / 393 =
0.7634 px/pt`) is recorded there, and `--n-hairline: #E9E8E7` came out of a
1pt coverage solve rather than a direct pick — a naive sample of that divider
reports it far too light.

`--n-font` is measured too, which is newer than the rest of the board:
`refkit font` on a native @3x capture ranks **SF Pro** first on the page title
(0.928, next 0.866) and on a body row (0.865, next 0.719) — so the
`-apple-system` stack is evidence, not the usual assumption.

```bash
refkit bands ref.png 75 350 500 435 --axis cols --minfrac .01   # word gaps
refkit font  ref.png 119 118 163.4 143.4 list --pt 3
```

## The reference row is not checked in

Phase 5 of `clone-prototype` parks each source capture in its own
`ref-NN-<slug>.html` and adds a third `layout.json` row listing them **in the
same order as the replica row**, so item N lands directly under item N and
the two can be read against each other.

Those files are deliberately absent here: they embed third-party app
screenshots from Mobbin's library, which this repo does not redistribute.
Regenerate them locally — the skill's Phase 0 and Phase 5 have the search and
embedding steps — and add the row back:

```json
{ "title": "Source of truth — Mobbin captures (Notion iOS)",
  "numbered": true,
  "files": [
    { "file": "ref-01-splash", "label": "Splash" },
    { "file": "ref-02-search-ask-ai", "label": "Search / Ask AI" },
    { "file": "ref-03-notion-ai-chat", "label": "Notion AI chat" },
    { "file": "ref-04-meeting-page", "label": "Meeting page" },
    { "file": "ref-05-date-sheet", "label": "Date sheet" },
    { "file": "ref-06-share-settings-sheet", "label": "Share settings sheet" }
  ] }
```

Screen ids from the original run, on
[Notion iOS](https://mobbin.com/apps/notion-ios-265a7a8a-0006-441c-8c17-ae6fc822c366):

| # | screen | id | match |
|---|---|---|---|
| 1 | Splash | `d131f6fb-5b34-4c53-bc02-ede1374c9da5` | exact |
| 2 | Search / Ask AI | `c119cf0c-6553-47b2-aead-63d060159283` | exact |
| 3 | Notion AI chat | `24aa4e82-e084-4a67-a9aa-fae4bdf4dc4b` | exact |
| 4 | Meeting page | `ac829a85-6eb1-4c89-80f2-668d3ca1c1c2` | near — carries a "Summary ready" toast |
| 5 | Date sheet | `365eabc0-4a33-4d0c-81ee-60ce8a8b5af9` | exact |
| 6 | Share settings sheet | `80450381-9922-4123-b6d2-b3b624b4c3d9` | exact |

Screen 4 has no exact frame in the index — every capture of that page carries
a toast. Stating that is the point: a near-match that goes unlabelled is how a
replica quietly drifts from its source.

Screen 5 was recorded as a near-match in the original run against
`cfca14fb-…`, which is a *Link expires* sheet from a different flow. The frame
above is the exact one, found by pairing each replica with its capture
side by side — which is what the paired figure in the repo README is for.

## Attribution

Notion is a trademark of Notion Labs, Inc. This board is an unaffiliated
design study, kept as a worked example of the measurement workflow. It is not
a Notion product, not endorsed by Notion, and the replica HTML is not meant to
be shipped as a user-facing interface.
