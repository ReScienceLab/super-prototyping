# pill-expand

A small notification pill grows into a full card, and whatever was behind it
goes soft.

1920x1080, 30 fps, 80 frames.

    npx remotion render pill-expand src/templates/pill-expand/out/pill-expand.mp4

## Reference

Two places, same mechanic: f1088-f1150 ("1 New insight" -> a "Behavioral Edge"
card over the blurred paragraph) and f1690-f1780 ("1 new notification" -> a
card with two buttons).
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **Box 20 frames. Pill label gone by 16. Card body starts at 14** — before
  the box has finished, so the card fills as it settles rather than popping
  its contents in at the end.
- `borderRadius` interpolates 999 -> 34, which is what turns a growing rounded
  rectangle into a pill *becoming* a card.
- The backdrop's blur tracks the box, so the paragraph behind is softest
  exactly when the card is open and there is most to read.

## Props

| prop         | default                                        |
|--------------|------------------------------------------------|
| pill         | "New insight"                                  |
| title        | "Behavioral Edge"                              |
| body         | "Finance is your lens to understand people,... |
| actions      | []                                             |
| behind       |                                                |
| at           | 10                                             |
| frames       | 20                                             |
| labelFrames  | 16                                             |
| bodyAt       | 14                                             |
| bodyFrames   | 14                                             |
| backdropBlur | 7                                              |
| pillWidth    | 351                                            |
| pillHeight   | 84                                             |
| cardWidth    | 756                                            |
| cardHeight   | 351                                            |
| cardRadius   | 46                                             |
| color        | INK                                            |
| card         | "#ffffff"                                      |
| accent       | ORANGE                                         |
| background   | BONE                                           |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

Both reference occurrences are one template with different props; `actions:
[]` is the insight card, two labels is the notification.
