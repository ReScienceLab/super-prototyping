# word-grid

One word tiled three by three, the middle row lighting up first left to right
and the outer rows together a beat later; a hold; then the cells go out one by
one while the ground slides off the bottom of the frame and leaves bone behind.

1920x1080, 30 fps, 90 frames.

    npx remotion render word-grid src/templates/word-grid/out/word-grid.mp4

## Reference

f1864-f1928, "everything" on a vertical red gradient. Cell boxes from a
high-pass on f1890; ground as a 12-row column mean at x 0.25-0.38, identical
at x 0.62-0.75 and at f1870.
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **The ground is a static, purely vertical gradient**, #f2b5a9 at the top to
  #7f0110 at the bottom — not the film's mesh. Its twelve row means are the
  stops in `ground`.
- Cells are centred on x 0.135 / 0.500 / 0.852 and y 0.085 / 0.493 / 0.930,
  0.165 wide by 0.067 tall (ink against the row median, both clips at 1920).
- **Arrival is a sweep, not a scatter**: the middle row at f1866 / 1867 / 1868
  left to right, then the top and bottom rows together at f1869-1870, about
  four frames each.
- The text is not one colour at one opacity: its core is #fefdf9 on the pale
  top row, #faaa71 in the middle, #e41229 on the dark bottom row. Each row
  gets its measured colour outright.
- Exit, f1903-1919: cells go out singly (r2c1 first at f1903, r1c1 last,
  f1913-1919) under the gradient sliding down out of the frame with bone above
  it, ease-in, 1.1 frame heights by f1924, flat bone by f1930.
- This render's middle cell is 0.154 x 0.071 centred on (0.504, 0.497) at
  frame 59 against 0.165 x 0.067 at (0.500, 0.493) on f1910; the other cells
  are within 0.005 of their centres.

## Props

| prop        | default                                    |
|-------------|--------------------------------------------|
| word        | "everything"                               |
| columns     | [0.135, 0.5, 0.852]                        |
| rows        | [0.085, 0.493, 0.93]                       |
| delays      | [3, 3, 3, 0, 1, 2, 3, 3, 3]                |
| at          | 15                                         |
| frames      | 4                                          |
| blur        | 12                                         |
| rise        | 18                                         |
| colors      | ["#fefdf9", "#faaa71", "#e41229"]          |
| italic      | false                                      |
| size        | 0.074                                      |
| ground      | twelve stops, #f2b5a9 to #7f0110           |
| background  | BONE                                       |
| wash        | 25                                         |
| washTo      | 1.6                                        |
| tail        | 3                                          |
| leaveDelays | [5, 9, 9, 9, 11, 11, 11, 0, 9]             |
| leaveFrames | 5                                          |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

**The seeded shuffle that used to be here was never in the reference.** The
arrival is a sweep, the ground is a measured vertical gradient rather than the
mesh, and the shot ends with the wash out to bone instead of holding. `seed`,
`step` and `opacity` are gone; `delays`, `colors`, `ground`, `wash`,
`washTo`, `tail`, `leaveDelays` and `leaveFrames` replace them.

No one size hits both cell dimensions: this face runs taller for its width
than the reference face (0.095 rendered 0.198 x 0.092 for the 0.165 x 0.067
cell), so 0.074 splits the difference, 7% under on width and 7% over on
height.

The ground's slight horizontal variation is not modelled.

An earlier pass recorded the word as italic and set `italic: true`. It is not.
A 1000x260 crop of f1890 around the centre cell, and a full frame at f1890 with
all nine cells on it, both show vertical stems and an upright `g` — the whole
grid is roman. The prop is kept so a caller can ask for the slant; the
reference does not.
