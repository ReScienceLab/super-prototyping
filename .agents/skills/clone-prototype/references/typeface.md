# Naming the type face

Loaded from Phase 1 of `clone-prototype`. Read it when `refkit font` has
given you a ranking and you have to decide what it actually proved.

## What `font` does

It renders your word in every candidate face and ranks the letterforms at a
common cap height, searching weight and tracking. The system UI faces are
always in the set; `--fonts DIR` adds any `.ttf`/`.otf`/`.ttc` you have, and
is what you need for a brand face.

Closed-set matching is the point. The published classifiers pick from ~3,000
Google Fonts and **cannot return "SF Pro"** at all. `docs/font-identification.md`
has those measurements.

## Read the verdict, not the ranking

- **call.** One face clears the next by the margin. Write it down with its
  score.
- **no call.** The top faces are inside the margin. Either they are
  indistinguishable at this size (SF Pro vs SF Pro Rounded differ only in
  corner rounding) or the real face is outside your candidate set. Record the
  *family*, or go find the font file. Never promote the top row of a no call.
- **weak.** Top score under 0.80. First check the box holds exactly the word
  you named and nothing else. One clipped leading glyph took a real run from
  0.93 to 0.49. Then re-run on the largest instance of the same face.

## Size is a separate question from face

`font` names the face; calibrate *size* against the engine that ships the
pixels. PIL renders SFNS about 6% narrower than Chrome renders
`-apple-system`, so a width matched in PIL is wrong on the board. Check sizes
on `shoot` output, or you discover the 6% three phases later.

And read a residual before correcting it: +4.7pt of width over 29 characters
of nav title is tracking (`letter-spacing:-.16px`), not a size error.
