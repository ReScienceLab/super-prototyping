# Notion iOS, a worked example

A real run of the `clone-prototype` skill, kept as the reference for what a
finished board looks like. One measured token block plus fifteen replica
screens, every colour and metric traced to a sample off the source capture.

Open it with `?canvas=notion-ios`, or a single board with
`?canvas=notion-ios#07-manage-data-sources`.

| file | what it is |
|---|---|
| `gen.py` | The source of truth. Every `NN-*.html` here is its output; edit the generator and re-run, never the HTML. |
| `00-design-tokens.html` | The contract. Swatches, type ramp, radii, metrics, and the evidence for each value. Inlined byte-identically into all fifteen screens. |
| `01-splash` … `06-share-settings-sheet` | The screens. 393 × 852 pt frames on 478 × 980 artboards, fully self-contained. |
| `07-manage-data-sources` … `10-to-do-list-table` | The *adding a new data source* flow, added later against four more captures. |
| `11-add-an-account` … `15-add-an-account-code-filled` | The *adding an account* flow, five states of one sheet, against five more captures. |
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

## What the account flow changed

Five captures of one sheet in five states: the six providers, then the email
field, then the code field, with 04 and 05 the same content scrolled 81pt up.
Adding them turned up one thing the first ten boards had absorbed silently.

**`--n-font` resolves to the wrong optical cut.** SF Pro ships a Text cut and a
Display cut, and a browser hands `-apple-system` the Display one, which is
about 4% narrower. Every string on this sheet came out short against the
capture until the stack named `"SF Pro Text"` outright, so the token block now
carries `--n-font-text` and the sheet uses it. The first ten boards stay on
`--n-font`: their tracking was tuned against the Display cut, and switching
them costs a re-measure (`nav-title` alone goes 12pt wide). `refkit batch`
holds them at a mean `|dw|` of 0.41.

The other lesson is that **ink height is a poor way to guess a font size.**
The helper line under the email field reads 11.3 tall, which suggested 16px and
made the line wrap; measured by *width* it is 354.0 on one line, which is 12px.
Nothing in that string has an ascender to measure. The sizes that came out of
width, all of them in `probes.json`:

| what | size |
|---|---|
| `Add an account` | 21px / 700, tracking −.5 |
| `Use an existing account,` | 22px, tracking −.45, 26 between lines |
| provider labels | 17px, tracking −.3 |
| `Work email` | 15px |
| field text and placeholder | 15px, tracking −.25 |
| the code field | 15px SF Mono, 6pt less left padding than the field above it |
| helper lines | 12px |
| `Resend in 28s` | 17px |
| `Resend verification code` | 14px, and blue — the state change is not a recolour |

Six provider glyphs sit in `assets/icons/`, each normalised to a 24-unit
viewBox so one rule sizes them all. `apple.svg` is Notion's own `appleLogo`
path, scaled by its measured ink box; Google and Microsoft are the brand marks
at their published palettes; `passkey`, `sso` and `envelope` are traced off the
captures by connected component, since Notion does not publish them.

The fade at the top of 04 and 05 is a mask, fitted to the capture's own ramp:
alpha runs 0 to 1 over 17 to 52pt from the sheet's top edge, which puts the
faded subtitle remnant within five grey levels of the capture the whole way
down.

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
    { "file": "ref-10-to-do-list-table", "label": "To do list with a table" },
    { "file": "ref-11-add-an-account", "label": "Add an account" },
    { "file": "ref-12-add-an-account-email", "label": "Work email" },
    { "file": "ref-13-add-an-account-email-filled", "label": "Email typed" },
    { "file": "ref-14-add-an-account-code", "label": "Verification code" },
    { "file": "ref-15-add-an-account-code-filled", "label": "Code typed" }
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

Screens 7–15 came from flow exports rather than the per-screen index, so they
have file names instead of ids. All nine are exact matches:

| # | screen | source |
|---|---|---|
| 7 | Manage data sources | `adding-a-new-data-source-01.png` |
| 8 | New data source | `adding-a-new-data-source-02.png` |
| 9 | Manage data sources, two | `adding-a-new-data-source-03.png` |
| 10 | To do list with a table | `adding-a-new-data-source-04.png` |
| 11 | Add an account | `adding-an-account-01.png` |
| 12 | Work email | `adding-an-account-02.png` |
| 13 | Email typed | `adding-an-account-03.png` |
| 14 | Verification code | `adding-an-account-04.png` |
| 15 | Code typed | `adding-an-account-05.png` |

Those exports are 1179 × 2676 and carry a 120px Mobbin banner at the **bottom**.
Crop to `(0, 0, 1179, 2556)` before measuring anything off them.

None of the captures shows a Dynamic Island; Mobbin shoots on a device without
one. Every board in this repo draws one anyway, so the frame keeps it. That is
this repo's framing, not a property of the app.

## Attribution

Notion is a trademark of Notion Labs, Inc. This board is an unaffiliated
design study, kept as a worked example of the measurement workflow. It is not
a Notion product, not endorsed by Notion, and the replica HTML is not meant to
be shipped as a user-facing interface.
