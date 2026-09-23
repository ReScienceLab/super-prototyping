# Notion iOS, a worked example

A real run of the `clone-prototype` skill, kept as the reference for what a
finished board looks like. One measured token block plus eighteen replica
screens, every colour and metric traced to a sample off the source capture.

Open it with `?canvas=notion-ios`, or a single board with
`?canvas=notion-ios#07-manage-data-sources`.

| file | what it is |
|---|---|
| `gen.py` | The source of truth. Every `NN-*.html` here is its output; edit the generator and re-run, never the HTML. |
| `00-design-tokens.html` | The contract. Swatches, type ramp, radii, metrics, and the evidence for each value. Inlined byte-identically into all eighteen screens. |
| `01-splash` … `06-share-settings-sheet` | The screens. 393 × 852 pt frames on 478 × 980 artboards, fully self-contained. |
| `07-manage-data-sources` … `10-to-do-list-table` | The *adding a new data source* flow, added later against four more captures. |
| `11-add-an-account` … `15-add-an-account-code-filled` | The *adding an account* flow, five states of one sheet, against five more captures. |
| `16-plan-plus-ai-monthly` … `18-purchase-success` | The *Plus & Notion AI purchase sheet*, Apple's paywall over the dimmed app, against three more captures. |
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

## The purchase sheet, 16 to 18

Three captures of the in-app Plus & AI paywall: the monthly price selected,
the yearly, and the monthly sheet dimmed under the StoreKit "You're all set"
alert with the subscribe button spinning. This is Apple's sheet rather than
one of the app's own, and almost nothing on it is a token:

- **The sheet sits at 58.9, not `--n-sheet-top`'s 68**, with a 38pt corner
  and a 36 × 4.5 `#C4C4C4` grabber 5.3 below the edge. The app dims to
  `#C6C6C6` behind it, and to `#9E9E9E` once the alert's scrim is on top.
- **The status bar is the stock 17pt one.** The shared block sets a 16px
  clock 12pt lower, so the three boards carry their own bar: clock at 54,
  cap top 22.8, and the signal, wifi and battery drawn to the capture's
  19.7, 18.8 and 27.2 widths. The battery's outline and nub are black at
  .5 and .55 over the grey, which is where `pw-status-icons` lands.
- **Four blues, none of them `--n-blue`.** The feature card's checks and
  `Notion AI` are `#4E7AB0`; the selected price card is a 2pt `#487ED0`
  border on `#E7F3FF`, its price `#467AB9`; the subscribe button is
  `#4380D7`; the alert's OK pill is `#367CEF`.
- The segmented control's white pill has **no shadow**, and its label goes
  from 400 to 600 when selected; the track is `#EBEBEB`, 31.7 tall, 1.8 inset.
- The feature card is **taller than its window**. It is 249.8 × 300 with a
  three-layer shadow, drawn inside a 289.7 tall hero and clipped by a 40pt
  linear fade to white. `refkit shoot --clip-ok div.hero` is what keeps the
  overflow check quiet about it.
- While it spins, the subscribe button is **54.4 tall rather than 50.4**, and
  the three links under it move 4pt down with it. The ring is 24pt, a 2.3
  stroke, `#CFDCE8` with a `#2E3A36` arc.
- The alert is 318.7 × 152.2 at (37.3, 362.3) with a 30pt corner: white at
  .7 over a 30px blur, an inset 1px white line at .6, and the title, body
  and OK pill 29.5 in from its edge.

Text is placed by cap top throughout. `cap(size, lh)` in `gen.py` turns a
measured cap top into a CSS `top` for SF Pro, so a value in the generator is
the number read off the capture, not a number tuned until it looked right.

**The cat and the sparkles are generated, not cropped.** They are the
folder's first `artgen` assets: `gpt-image-2` redraws of the capture's crops
in `assets/art/`, keyed and shipped at 3× the measured box as `assets/cat.png`
and `assets/spark.png`. `art-gen.json` records the scores against the crop:
cat 13.97, sparkles 10.9, with a second independent return at 14.56 and 11.12
that did not beat the first. The one visible cost is the cat's hind leg, which
ends about 4pt higher than the capture's; `pw-cat` records it. A crop would
have scored 0, and the redraw was the brief.

## How close it lands

Screens 7–15, each against its own capture cropped to `(0, 0, 1179, 2556)` and
rendered with `refkit shoot --scale 3 --crop-phone`, so both sides are the same
393 × 852 pt screen at 3 px/pt. Screens 16–18 the same way, except that their
captures are 2.2417 px/pt, so the render is resampled down to the capture
rather than the capture up. Mean absolute delta in levels of 255:

| # | screen | whole frame | below the status bar |
|---|---|---|---|
| 7 | Manage data sources | 5.20 | 1.91 |
| 8 | New data source | 4.82 | 1.49 |
| 9 | Manage data sources, two | 5.62 | 2.35 |
| 10 | To do list with a table | 6.55 | 2.84 |
| 11 | Add an account | 4.67 | 1.33 |
| 12 | Work email | 5.28 | 1.99 |
| 13 | Email typed | 5.28 | 1.99 |
| 14 | Verification code | 5.08 | 1.77 |
| 15 | Code typed | 5.07 | 1.77 |
| 16 | Plan sheet, monthly | 5.02 | 2.61 |
| 17 | Plan sheet, yearly | 5.23 | 2.83 |
| 18 | Purchase success | 4.27 | 2.26 |

**Whole-frame mean 5.17, worst 6.55. Below the status bar, mean 2.10, worst
2.84.** The gap between the two columns is one thing, and it is this repo's
framing rather than a miss: the top 60pt band scores 51.9 on eight of the first
nine boards and 59.2 on board 10, near enough to a constant, because every
board here draws a Dynamic Island and none of the captures has one. On 16–18
the same band reads 37.0, 37.0 and 30.8, lower only because the island sits on
a dimmed grey rather than white. The left column
is `refkit diff <render> <capture>`; the right is the same measure over
`y >= 180px`, which is where the app's own content starts.

What is left below that band is glyph antialiasing and the two deltas named
below. Board 10 is worst of the nine because it carries the most type and the
only clipped table; board 11 is best because it is a sheet of six outlined
buttons on a flat ground. The purchase sheet's three sit higher below the bar
than the account flow's because their captures are softer, 2.24 px/pt against
3, so every glyph edge disagrees by a little more.

`refkit batch probes.json --against <shots> --pt 3` replays all 62 probes
against the renders: **50 box probes at a mean |dw| of 0.38pt and |dh| of
0.32**, and 4 colour probes at a mean Δmax of 1.8. Per screen:

| # | screen | box probes | mean \|dw\| | mean \|dh\| | worst |
|---|---|---|---|---|---|
| 7 | Manage data sources | 6 | 1.05 | 0.27 | 4.7 |
| 8 | New data source | 2 | 0.00 | 0.30 | 0.6 |
| 9 | Manage data sources, two | edge probe only | | | 1.0 |
| 10 | To do list with a table | 10 | 0.54 | 0.30 | 1.7 |
| 11 | Add an account | 4 | 0.20 | 0.07 | 0.4 |
| 12 | Work email | 5 | 0.12 | 0.06 | 0.3 |
| 13 | Email typed | 1 | 0.00 | 0.00 | 0.0 |
| 14 | Verification code | 4 | 0.07 | 0.00 | 0.3 |
| 15 | Code typed | 1 | 0.00 | 0.00 | 0.0 |
| 16 | Plan sheet, monthly | 13 | 0.35 | 0.65 | 3.6 |
| 17 | Plan sheet, yearly | 16's probes, the other card selected | | | |
| 18 | Purchase success | 4 | 0.22 | 0.42 | 1.0 |

Screen 7 carries the spread on its own, and all of it is `nav-title`: 4.7pt,
the standing `--n-t-nav` delta described above. Drop that one probe and 7 reads
a mean |dw| of 0.32. Screen 9's only probe is the `sheet-top` column scan, which
lands 1.0 off for a reason that is not a disagreement about the value: all eight
captures with a sheet in them ramp from the scrim to the sheet ground across
68.0 → 69.0, and the boards draw that boundary as a hard edge at 68. `refkit
scan <capture> col 60 55 90 --pt 3` reads the same #D4D4D4 band on every one of
them, which is also why `--n-sheet-top` moved to 68 with five captures behind
it.

Screen 16 carries two of its own. `pw-cat` is 3.6pt short in height, the
generated cat's hind leg, described above. `pw-price-selected` reads the
selected card 1.7 taller on the capture than on the render, and about 1.3 of
that is the resample: the capture's 2pt border, blown up from 2.24 to 3 px/pt,
spreads a third of a point past each edge, and the probe's threshold of 235 is
loose enough to count it. Everything else on the sheet is within half a point.

Two colour deltas are worth naming. `acc-cta`, the Continue button, reads
`#2280DE` on capture a2 against the board's `--n-blue` of `#2784E0`, a Δmax of
5 and the worst colour delta in the folder — the token was measured off the
first six screens and four boards share it, so it stays. `bar-shadow` is 1 off,
and the rest are exact.

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
    { "file": "ref-15-add-an-account-code-filled", "label": "Code typed" },
    { "file": "ref-16-plan-plus-ai-monthly", "label": "Plan sheet, monthly" },
    { "file": "ref-17-plan-plus-ai-yearly", "label": "Plan sheet, yearly" },
    { "file": "ref-18-purchase-success", "label": "Purchase success" }
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

Screens 16–18 came in as three Mobbin captures supplied with the request, so
they have neither an id nor an export file name. They are 881 × 2000 with a
90px banner at the bottom: crop to `(0, 0, 881, 1910)`, which is 393 × 852 pt
at **2.2417 px/pt**, and pass that as `--pt` to every `refkit` call. For
`probes.json` they are resampled to 1179 × 2556 (`assets/refs/s1.png` to
`s3.png`) so the whole file replays at `--pt 3`; the resample blurs an edge by
about a third of a point, which is most of `pw-price-selected`'s height delta.

| # | screen | source |
|---|---|---|
| 16 | Plan sheet, monthly | supplied capture, `Plus & AI` tab, monthly selected |
| 17 | Plan sheet, yearly | supplied capture, yearly selected |
| 18 | Purchase success | supplied capture, the alert over 16 |

None of the captures shows a Dynamic Island; Mobbin shoots on a device without
one. Every board in this repo draws one anyway, so the frame keeps it. That is
this repo's framing, not a property of the app.

## Attribution

Notion is a trademark of Notion Labs, Inc. This board is an unaffiliated
design study, kept as a worked example of the measurement workflow. It is not
a Notion product, not endorsed by Notion, and the replica HTML is not meant to
be shipped as a user-facing interface.
