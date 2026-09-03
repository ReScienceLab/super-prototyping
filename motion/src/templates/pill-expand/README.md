# pill-expand

A small notification pill pops in over a paragraph, the paragraph goes soft
behind it, and the pill opens into a full card.

1920x1080, 30 fps, 80 frames.

    npx remotion render pill-expand src/templates/pill-expand/out/pill-expand.mp4

## Reference

Two places, same mechanic: f1088-f1150 ("1 New insight" -> a "Behavioral Edge"
card over the blurred paragraph) and f1690-f1780 ("1 new notification" -> a
card with two buttons). Everything below is the first; frames are relative to
the pill's first frame, f1088.
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **The pill pops, it does not fade.** No white box at f1087; at f1088 it is
  399x107 (at 1920) and fully white, centre 55 px below where it settles. It
  grows to 528x142 and rises — 0.19, 0.43, 0.66, 0.81, 0.91 of the way at +2,
  +3, +6, +10, +12 — an ease-out cubic over 20 frames.
- **The paragraph defocuses with the pill, not with the box.** Gradient-fitted
  sigma on the paragraph left of the pill: 1.5, 3.6, 4.6, 5.3, 5.8 px (at
  2880) at +2, +3, +5, +9, +12, then flat through +72. The estimator reads 0.6
  of a known gaussian at that size, so the true figure is ~10 px at 2880 = 6.7
  at 1920. Its contrast also drops to 0.55 of what the blur alone would leave.
- **Box +23 to +48, ease-in-out cubic**, 529x142 -> 821x414 about its centre.
  Its own pixel width per frame: 529 flat to +22, then 535 / 545 / 563 / 591 /
  635 / 693 / 743 / 776 / 797 / 810 / 817 at +26 to +46, 821 by +50 — 0.02,
  0.06, 0.12, 0.21, 0.36, 0.56, 0.73, 0.85, 0.92, 0.96, 0.99 of the way, which
  is ease-in-out cubic to within a percent at every sample.
- **Label out +32 to +38.** Black ink inside the box is 4157 px at +32 and 6 at
  +34; grey traces of it survive to +38.
- **The open card is empty for three frames.** Ink under luma 160 inside the
  box is 21 px in the top half and 373 in the bottom at +38, and 36 / 433 at
  +40, against a settled 8357 / 12150. The card does not read as a blank slab
  there because it is still *growing* — 743 and 776 px of its final 821.
- **Title +41, body +43, both settled by +50.** The title leads: at +42 the top
  half is at 2927 px of its 8357 and the bottom half at 554 of its 12150 (35%
  against 5%); by +44 they are level at 6026 / 6345. Opacity only, and it
  starts while the box is still on its last 5% of travel.
- Corner radius 140 by arc fit at f1140; 69 on the pill at f1105, which is
  half its height. One number, clamped by CSS while the box is a pill.
- Pill label: ink 57 px tall (5.4vh), strokes 0.10 em (weight 500), `#020000`,
  on a 68 px (6.3vh) `#f04a07` dot (ORANGE) with a 15x37 px white "1" in it,
  24 px of air between dot and ink (a 1.7vh gap — the N's side bearing is the
  rest; 2.2vh read 30 px); 58 px of pill each side. f1105. Ours by the same
  mask: dot 65, "1" 15x36, air 25, ink 321x56 against 317x57.
- Card: title ink 61 px tall (5.8vh), strokes 0.117 em (weight 600), `#524640`;
  body two lines 42 px tall (4vh) on a 59 px pitch (1.38), strokes 0.10 em,
  `#757172`, the first line 697 px wide. f1140.
- Shadow: bone (241) reads 217 three px below the card's edge and is back to
  241 by 30 px; 225 three px above, back by 20. f1140.
- The paragraph behind is text-marker's, highlight and all: the reference
  keeps the marked run visible under the pill (f1088-f1110) and the card
  covers all four lines once open.

## Props

| prop            | default                                        |
|-----------------|------------------------------------------------|
| pill            | "New insight"                                  |
| title           | "Behavioral Edge"                              |
| body            | "Finance is your lens to understand people,... |
| actions         | []                                             |
| behind          |                                                |
| behindMark      | "it’s about mastering yourself"                |
| behindMarkColor | "#f0bead"                                      |
| at              | 8                                              |
| popFrames       | 20                                             |
| popScale        | 0.76                                           |
| popRise         | 55                                             |
| openAt          | 23                                             |
| frames          | 25                                             |
| labelAt         | 32                                             |
| labelFrames     | 6                                              |
| typeAt          | 41                                             |
| typeFrames      | 9                                              |
| backdropBlur    | 6.7                                            |
| blurFrames      | 12                                             |
| pillWidth       | 528                                            |
| pillHeight      | 142                                            |
| cardWidth       | 821                                            |
| cardHeight      | 414                                            |
| radius          | 140                                            |
| color           | INK                                            |
| titleColor      | "#524640"                                      |
| bodyColor       | "#757172"                                      |
| card            | "#ffffff"                                      |
| accent          | ORANGE                                         |
| background      | BONE                                           |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

Both reference occurrences are one template with different props; `actions:
[]` is the insight card, two labels is the notification. The buttons are not
measured.

The pill label is set in `color` (INK) where the reference reads `#020000`;
the label is the only thing in the film that is truly black, and its black is
gone in two frames.

The card drifts left from about +77 in the reference, on its way to the next
shot; the template holds it, so a cut can land anywhere after +62.

The body's wrap ("understand / people") is the card's width doing it, not a
hard break; a different `body` wraps where it wraps.
