# Notion iOS, a worked example

A real run of the `clone-prototype` skill, kept as the reference for what a
finished board looks like. One measured token block plus ten replica screens,
every colour and metric traced to a sample off the source capture.

Open it with `?canvas=notion-ios`, or a single board with
`?canvas=notion-ios#07-manage-data-sources`.

| file | what it is |
|---|---|
| `gen.py` | The source of truth. Every `NN-*.html` here is its output; edit the generator and re-run, never the HTML. |
| `00-design-tokens.html` | The contract. Swatches, type ramp, radii, metrics, and the evidence for each value. Inlined byte-identically into all ten screens. |
| `01-splash` … `06-share-settings-sheet` | The screens. 393 × 852 pt frames on 478 × 980 artboards, fully self-contained. |
| `07-manage-data-sources` … `10-to-do-list-table` | The *adding a new data source* flow, added later against four more captures. |
| `probes.json` | The measurements behind the tokens, replayable with `refkit batch probes.json --against <shots> --pt 3`. |

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

## What the data-source flow changed

The four screens were added against native @3x captures (`1179 / 393 = 3.0`
px/pt exactly), which are sharper than the 0.7634 px/pt captures the first six
came from. Three things came out of the re-measurement; the first two are token
changes, so 05 and 06 moved with them:

- `--n-sheet-top` is **68**, not the 71 the folder shipped with. Five separate
  captures agree.
- The grabber is 38 × 5, `#E7E5E3`, 7 below the sheet's top edge.
- Card padding is **card-relative**. `.drow`'s 17pt left padding applies inside
  a card that is already inset 16, so a padding read off the screen edge lands
  everything 16pt right. This was the single biggest error in the first draft.

Two deltas are knowingly left standing, both recorded in `probes.json`:
`--n-t-nav`'s 17px renders about 4.7pt wider than these captures' nav titles,
but 06's title reads a true 17 and four boards share the token; and the `1 view`
row value reads a shade larger than the 17px row label beside it.

Board 10's table is *clipped*, not scrolled — 361pt wide with `overflow:hidden`,
which is what the capture shows. `refkit shoot --clip-ok .tbl` is what keeps
the overflow check quiet about it.

## The Ask AI bar's icons

Board 10's floating bar carries four glyphs, and three of them are Notion's
own, lifted from the sprite notion.com ships: `magnifyingGlass`, `aiFace` and
`microphoneFill`. They sit in `assets/icons/`, which is also where the canvas
inspector looks to name an inline `<svg>` and hand it back as a vector asset.

Two things the site's copies do not give:

- **The mic's capsule is an outline, not a fill.** `microphoneFill`'s arc, stem
  and base bar land on the capture as shipped once the glyph is 25.3px; its
  capsule does not. The capture's is a 1.58pt-walled outline, outer 5.884 x
  9.505 units, proportionally wider than Notion's filled one. `bar-mic` records
  the result: same 14.0 x 20.0 box, same position, ink within 0.15%.
- **The compose glyph is not published**, so it is traced off capture 04. An
  open rounded square whose two edges stop 7.95 short of the corner, a 45deg
  pencil running 16.26 along its own axis, and a *round* dot 2.24 across
  sitting 1.65 clear of the pencil's cap. The first draft drew that dot as a
  capsule along the pencil's axis, which read as a nib touching the shaft.

One bar metric moved with them: the compose button sat 0.45pt left of the
capture's, so `.bottombar`'s right padding is 17.77, not 18, and `.askbar`'s is
10.53 so the mic stays put.

The mascot's helmet is still hand-drawn. notion.com does not ship that one
either, and `helmet` in `probes.json` is still 0.7 x 1.0 out.

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
    { "file": "ref-07-manage-data-sources", "label": "Manage data sources" },
    { "file": "ref-08-new-data-source", "label": "New data source" },
    { "file": "ref-09-manage-data-sources-two", "label": "Manage data sources, two" },
    { "file": "ref-10-to-do-list-table", "label": "To do list with a table" }
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

Screen 4 has no exact frame in the index. Every capture of that page carries
a toast. Stating that is the point. A near-match that goes unlabelled is how
a replica quietly drifts from its source.

Screen 5 was recorded as a near-match in the original run against
`cfca14fb-…`, which is a *Link expires* sheet from a different flow. The
frame above is the exact one, found by pairing each replica with its capture
side by side, which is what the paired figure in the repo README is for.

Screens 7–10 came from a flow export rather than the per-screen index, so they
have file names instead of ids. All four are exact matches:

| # | screen | source |
|---|---|---|
| 7 | Manage data sources | `adding-a-new-data-source-01.png` |
| 8 | New data source | `adding-a-new-data-source-02.png` |
| 9 | Manage data sources, two | `adding-a-new-data-source-03.png` |
| 10 | To do list with a table | `adding-a-new-data-source-04.png` |

Those exports are 1179 × 2676 and carry a 120px Mobbin banner at the **bottom**.
Crop to `(0, 0, 1179, 2556)` before measuring anything off them.

## Attribution

Notion is a trademark of Notion Labs, Inc. This board is an unaffiliated
design study, kept as a worked example of the measurement workflow. It is not
a Notion product, not endorsed by Notion, and the replica HTML is not meant to
be shipped as a user-facing interface.
