# Flashcard onboarding

The four-screen onboarding of a flashcard app, rebuilt from a screen
recording posted by [@FarzadGodarz](https://x.com/FarzadGodarz/status/2096601915807187433).
Three walkthrough pages and the sign-up screen, plus the token board, three
evidence boards and the art board behind them. 13 boards, four of which park
the source frame under its replica.

| # | Board | What it shows |
| --- | --- | --- |
| 01 | `learn` | "Learn Anything, One Card at a Time", nav at step 1 |
| 02 | `challenges` | "Take on Challenges, Earn Your Medals", step 2 |
| 03 | `rankings` | "Climb the Global Rankings", step 3, Winner Board panel |
| 04 | `master` | "Ready to Master It?", two buttons, legal line |
| 00 | `design-tokens` | The 28 tokens, one `:root` shared by every board |
| 00b–00d | `evidence` | What each token was measured on |
| 00e | `art` | The seven crops, and where each one sits |

A fresh clone builds the first nine of those. The four `ref-*` boards hold
third-party video frames, so they are gitignored and `gen.py` skips them when
`assets/refs/` is absent. `layout.json` still names them either way — the
canvas drops a row entry whose file it cannot find, and a row that loses all
of them, so a committed layout that mentions the references does not go dirty
on a capture-less regeneration.

## How close it lands

Mean absolute delta against the source frames, whole 393 × 852 frame, phone
crop, in levels of 255:

| Screen | Δ | Screen | Δ |
| --- | --- | --- | --- |
| 01 Learn | 6.50 | 03 Rankings | 6.17 |
| 02 Challenges | 6.64 | 04 Master | 7.05 |

`refkit batch` replays all 30 Phase-1 probes against the renders: **13 colour
probes at a mean Δmax of 0.9 and a worst case of 7**, and every edge scan
within one source pixel. Nine of the 13 colour probes return an exact match.
Three of the four box probes land within 1.5pt; the fourth is `sb-time`, which
measures the source's clock and is deliberately no longer what the boards draw
— see the chrome section below.

These numbers are two to four times `duolingo-ios`', and the reason is the
source, not the work. **A video frame is not a screenshot.** At 1.337 capture
px per design pt every glyph is three pixels tall through an H.264 encoder,
and a sharp render diffed against a soft frame scores an error the geometry
does not contain. The zone breakdown says so: the hero art, which is cropped
from the frame itself, sits at Δ 1.0–3.5, while the type zone sits at 7.7–14.2
with every string matching the reference's ink box to within 1.5pt.

Three structural items make up about 2.0 of each screen's score, all
deliberate:

- **The phone frame is the repo's, not the source's** — see below, 1.00.
- **The status bar is the repo's too** — see below, 0.42.
- **The rectangular crop keeps the bezel**, so the left and right 30pt of
  every frame score 10.2 against a phone-cropped render's masked corners,
  where the middle 333pt scores 5.5 to 6.5.

## The face is SF Pro, and the whole design is tracked at -2.5%

Called wrong twice before it was called right, and `refkit font` would not
settle it (SF Pro Rounded 0.903, SF Pro 0.856). What settled it was width.

At 3× the terminals on "Create Account" are **cut, not round**. Then the
arithmetic: four strings across two sizes, ink width against the untracked
setting of each candidate face.

| String | size | ref | SF Pro | SF Pro Rounded |
| --- | --- | --- | --- | --- |
| `Ready to Master It?` | 36 | 299.9 | 311.7 | 321.7 |
| `Learn Anything,` | 36 | 246.8 | 255.3 | 263.3 |
| `Create an account and start learning` | 15 | 234.9 | 247.7 | 241.0 |
| `SMART LEARNING` | 15 | 125.7 | 132.0 | 135.3 |

SF Pro is uniformly 3.3–5.2% wide; SF Pro Rounded is 2.5–7.1% wide and
inconsistent about it. A uniform residual is tracking; an inconsistent one is
the wrong face.

**The residual is tracking, and the test for that is character count.** A
narrower face would shed width in proportion to the string's width; tracking
sheds it in proportion to the number of gaps. Between the 13-gap eyebrow and
the 35-gap subtitle at the same size, the observed reduction ratio is 0.391,
against 0.371 predicted by tracking and 0.533 by a narrower face. Solved per
string the four give -.0257, -.0244, -.0248 and -.0266em: **one figure,
-.025em, across the whole ramp.**

### The trap that hid it for three passes

`letter-spacing` inherits as a **computed length**, not as a ratio. Setting
`-.025em` on `body` computes against body's own 16px, and every child
inherits the resulting **-0.4px** whatever its font-size. The 15px type
looked right — -0.4px is within noise of the -0.375px it wanted — and the
36px title got a third of its tracking, which read as "the title needs its
own tighter value". Two rounds went into fitting a `--x-tracking-lg` that
does not exist. Setting the same `var(--x-tracking)` on each type rule, so
the `em` resolves at each element's own size, took the four screens from
8.20/8.18/7.01/7.66 to **6.09/6.23/5.77/6.66** in one edit and deleted the
second token.

## Crop it, do not draw it

Seven assets, listed in `crops.json`, cut from `assets/refs/cN.png` at a
measured pt box, written to `assets/art/<id>.png` and placed back by `art()`
at the same numbers. 434 KB total.

| id | what | size |
| --- | --- | --- |
| `01/02/03-hero` | the three hero illustrations, 365 × 474pt | 159/107/95 KB |
| `01/02/03-path` | the progress path between the nav pills, 198 × 57pt | 7/9/11 KB |
| `04-cup` | the trophy, 282 × 236pt | 54 KB |

**Everything else is CSS**: both nav pills and their gradients, the track
behind them, both arrows as inline SVG, the two buttons, all the type, and the
whole status bar, island and home indicator, which come from the template.

The heroes are cropped whole rather than rebuilt because screen 03 cannot be
rebuilt at all — the Winner Board panel is a frosted overlay sitting on top of
the medals, and what it covers is not on any frame in the clip. Cropping the
three heroes to one rule keeps them consistent with it.

## The chrome is the repo's, not the source's

Measured off the frames:

| | source | iOS / this repo |
| --- | --- | --- |
| Dynamic Island | 123 × 38.5 at top 8.6 | 125 × 36 at top 11 |
| home indicator | 118.1 × 4.5 at bottom 2.5 | 139 × 5 at bottom 8 |

Neither is close enough to be a rounding difference, and the two err in the
same direction, so this is a designer's phone frame in the mockup rather than
a real device. **The boards keep the repo's standard frame**, which every
other canvas here uses, and that decision was priced rather than assumed:
regenerating all four screens with the source's own numbers drops the tail
band from Δ 49.0 to 22.6 and the status band from 16.8 to 13.9, for a
**1.00 improvement in each screen's mean**. Consistency with the other
canvases in this folder is worth one level.

The status bar goes the same way, and for the same reason. The source's clock
sits at ink top 20.2 centred on 60.2, and its right-hand cluster carries a
fourth glyph between wifi and the battery that reads "32" — not an iOS bar
either. The boards take `statusbar()`, the `.sb` rules and the inline-SVG
glyph cluster **verbatim from `templates/gen.py`**, so the clock lands at ink
top 23.2 centred on 71.2 and the cluster is the template's three glyphs. That
costs a flat **0.42 per screen** — 6.08/6.22/5.75/6.63 became
6.50/6.64/6.17/7.05, the same figure on all four — and it is why the `sb-time`
probe no longer matches: its window ends at x 80 to stop short of the source's
location arrow, and the repo's clock runs past it, so `batch` reports a clipped
25.4 against the source's 32.2 rather than a narrow clock.

## Defects in the source, kept

- **Screen 04's buttons are not centred.** Both span x 12.5 to 365.8, so they
  centre on 189.2 with a left margin of 12.5 and a right margin of 27.2,
  while every text block on all four screens centres on 196.4. Replicated as
  measured.
- **Screens 02 and 03 look washed out**, and that is the design, not a
  transition caught mid-fade. A 10 fps per-frame difference map over the whole
  clip puts t = 1.50, 6.60, 12.00 and 17.60s each inside a still run of
  half a second or more; the frosted Winner Board panel and the gradient-faded
  list under it are painted that way.

## Two measurement notes

- **The white floor is #FDFDFD, not #FFFFFF.** A flat census of the page
  ground returns 100% #FDFDFD, but 2801 pixels elsewhere in the same frame hit
  255. That is H.264 flat-field quantization across the whole capture, so `bg`
  is `#FFFFFF` and every colour probe carries a systematic 2 levels against it.
- **Downscale renders with an area average, not LANCZOS.** The verify loop
  shoots at 3× and resamples to the capture's 525 × 1140. LANCZOS rings, and
  the undershoot lands exactly where ink probes read: the Login label's ink
  core came back #262626 against the reference's #3A3A3A, and the subtitle's
  #6E6E6E against a #7E7E7E token, both of which read correctly on the
  un-resampled 3× shot. Switching to `Image.BOX` took the 13 colour probes
  from a mean Δmax of 4.6 and a worst case of 20 to **0.9 and 7**, and
  improved the frame diff slightly as well.

## Rebuilding

```bash
python3 mockups/canvases/flashcard-onboarding/gen.py
refkit tokens mockups/canvases/flashcard-onboarding
```

`gen.py` is the only source of truth; the `NN-*.html` boards are its output.
It re-cuts `assets/art/` from `assets/refs/` when the captures are present and
leaves the committed crops alone when they are not, so the nine non-reference
boards regenerate byte-identically from a fresh clone.
