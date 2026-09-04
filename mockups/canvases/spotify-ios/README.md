# Spotify, iOS

Five screens of the Spotify iOS app — the home feed at two scroll positions,
two full-screen promo modals and the Spotify Codes sheet over Search — rebuilt
from five captures, plus the token board, two evidence boards and the art
board behind them. 8 boards, and 5 more that park each capture under its
replica.

| # | Board | What it shows |
| --- | --- | --- |
| 01 | `home-chips` | Home with the browse rail scrolled, account circle pinned |
| 02 | `jam` | "Kick up some Jams." over the dimmed home screen |
| 03 | `live-events` | Live-events promo card, five-dot carousel |
| 04 | `home` | Home at rest, All chip selected |
| 05 | `codes` | Spotify Codes sheet over the Search screen |
| 00 | `design-tokens` | 52 tokens: colour, radius, type, metrics |
| 00b–c | `evidence` | One row per token, with the probe behind it |
| 00d | `art` | All 19 crops, where each sits and what it is |

## How close it lands

Mean absolute delta against the captures, whole 393 × 852 frame, phone crop,
in levels of 255:

| Screen | Δ | Screen | Δ |
| --- | --- | --- | --- |
| 01 Home, rail scrolled | 6.71 | 04 Home | 6.52 |
| 02 Jam invitation | 5.83 | 05 Spotify Codes | 3.38 |
| 03 Live events | 3.95 | | |

The spread is the type bill, and it is almost the whole story. **Every ink
box on all five screens lands within 1.8pt of the capture** — most within
1.0, and every vertical placement within 0.9 — so nothing here is misplaced
or missized. What the delta scores is that the glyphs are the wrong shape:
the real face is not available (below), and a left-aligned paragraph in a
substitute puts every stem somewhere the capture does not have one. The two
home screens are worst because they carry the most text; 05 is best because
its type is three short centred lines.

## The typeface is a substitution, and it is the largest known defect

`refkit font` returns **no call** on this UI. Three probes on three screens
pick three different winners and every score is weak: SF Compact .737 on
02's title, Avenir Next .743 on 04's heading, SF Compact .702 on 05's. The
reason is that the real face — Spotify Mix, a Circular derivative — is in no
candidate set here, so the ranking is choosing among wrong answers.

SF Pro is the stand-in, and it was chosen on the **width bill** rather than
the ranking. Set to the captures' own cap heights, ink-width ratios are:

| Face | 04 heading | 02 title | 05 heading | mean |
| --- | --- | --- | --- | --- |
| **SF Pro Semibold** | **1.010** | **0.980** | 0.884 | **0.958** |
| Avenir Next Demi | 1.034 | 1.015 | 0.857 | 0.969 |
| SF Compact Semi | 1.121 | 1.106 | 0.952 | 1.060 |
| Futura Medium | 0.959 | 0.902 | 0.823 | 0.895 |

SF Pro is essentially 1:1 on both large titles where the others are 10-12%
wide or 9% narrow, and it is what every other board in this repo uses.

Two consequences are baked into the generator:

- **Sizes are fitted on stroke mass, not on width or height.** A width fit
  and a height fit both leave the weight free, and the weight was wrong: at
  the size the fits agreed on, the home headings rendered **0.916** and
  **0.891** of the capture's ink mass and the track title **1.193**. Moving
  the headings to w700 and the track title to w400 puts all three at
  1.011 / 0.986 / 1.031. No fit would have found that.
- **The leftover width is charged as tracking**, per string, in `txt(...,
  track=)`. Values run −0.16px on the 13px subtitles to −0.8px on 05's
  heading, each one `(capture ink width − rendered ink width) / gaps`
  measured off a render. Tracking is never used to make an undersized face
  hold a wrap; the sizes are settled on mass first and this takes what is
  left.

A third consequence is a trap worth naming: **PIL's width fit is not the
browser's.** PIL sized "Jump into a session based on your tastes" at 13.7px
to hit the measured 237.8pt; Chrome renders that 11.6% over. The subtitle
token is 13px because that is what the browser needs, and the evidence row
says so.

## The art is cropped, not generated

19 crops, listed in `crops.json`, cut from `assets/refs/NN.png` at measured
pt boxes into `assets/art/<id>.png` and placed back by `art()` at the same
numbers. An asset therefore cannot drift from where it was measured. Board
`00d-art` shows every box on a scaled phone beside the asset it produced.

Three of those decisions are worth stating, because each traded a rebuild
for pixels:

- **The two dimmed backdrops are crops, in four pieces each.** On 02 the
  home screen sits under a black scrim at alpha .802, so one byte of capture
  is five bytes of source; on 05 the Search screen is at .115 over `#111111`,
  where one byte is 8.7. Neither backdrop can be recovered, and rebuilding
  one would invent precision the capture does not hold. The four pieces
  surround the modal rect exactly, so no crop sits under the subject — both
  modals are entirely CSS.
- **02's "Dismiss" ships as capture pixels.** It sits *below* the modal, on
  the scrim, which puts it inside the `02-bg-b` crop. Cutting a hole for it
  would mean recovering the scrimmed ground behind it. On 03, where the
  ground is a flat `#030003`, Dismiss is CSS like everything else.
- **The two track thumbs carry the bottom fade baked in**, because they were
  cut from pixels the fade had already dimmed. They are placed *above* the
  fade overlay (`Z` in `gen.py`) so it does not land on them twice.

01 and 04 share one crop set. Below y=115 they are the same screen at the
same scroll position — max |Δ| 26 levels, mean 0.98 — and only the chip rail
differs, so the set is cut from 04 and used by both.

## Where else the replica knowingly differs

- **The second track row's subtitle is not a transcription.** Under the
  bottom fade at alpha .988 it is below legibility in the capture. The board
  renders "sombr", the artist of the track above it, as a plausible filler.
  Everything else on these screens is transcribed exactly, including where
  each line wraps.
- **The bottom fade is a four-stop model, not a measured curve.** Alpha was
  solved from four ink plateaus that fall inside it — .126 at y725, .473 at
  748, .933 at 786, .988 at 811 — and fitted as a linear gradient through
  those points. The tab bar reads unfaded (labels plateau at `#B6B6B6`, the
  Home glyph at `#FFFFFF`), so it sits above the fade rather than under it.
- **`--s-ink-2` and `--s-ink-3` are 4 levels apart and are kept separate.**
  `#BABABA` is the subtitle ramp, `#B6B6B6` the inactive tab labels. At 11px
  the tab labels are stroke-limited, so the gap may be a rendering artefact
  rather than two tokens — but averaging them would be a guess in the other
  direction, and the evidence rows record both readings.
- **The carousel rail is at 17.9, not the 16 gutter**, and this is real, not
  a crop offset: direct colour scans put full card colour at 18.5 and half
  coverage at 18.0, while 05's search field pins 16.1 on both sides and the
  tab bar is symmetric.

## Regenerating

```bash
python3 mockups/canvases/spotify-ios/gen.py
python3 tools/refkit.py tokens mockups/canvases/spotify-ios
```

`gen.py` emits every `.html` and `layout.json`, byte-identically, from
anywhere. Never hand-edit the artboards. `cut()` refreshes `assets/art/`
from `assets/refs/`, which is gitignored — without the refs the generator
still rebuilds every board from the committed art.

The five `ref-*` boards are committed, unlike every other folder's, so the
hosted canvas at prototyping.rescience.com shows each capture under its
replica. `assets/refs/` is not. To rebuild it from Mobbin's 1179 × 2676
downloads, resize each to 881 wide and crop to 1909 rows (852pt, which drops
the attribution strip): `home-05 → 01`, `home-02 → 02`, `home-03 → 03`,
`home-04 → 04`, `home-01 → 05`. Those refs are resampled, so `cut()` re-cuts
the art from them within 3 levels of the committed crops. Restore
`assets/art/` from git after a run unless re-cutting is the point.
