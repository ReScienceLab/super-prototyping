# luma-ios

A complete six-phase `clone-prototype` run of the Luma iOS app, and the
model to copy. 35 boards in four rows. Foundations first, with the design
tokens, four evidence boards, the process board and the pipeline board.
Then 12 replica screens, a 4-board walkthrough of one page, and 12 source
captures, each sitting column-for-column under its mockup.

Per-screen mean absolute delta against the captures, top 56 pt excluded, is
3.47 to 4.50 levels out of 255 on the eight dark event screens and 3.49 to
6.50 on the four light home screens, where four full-bleed cover photos
carry most of what is left.

## Files

- `gen.py` regenerates every board in place. Edit it, never the HTML. It
  reads the replica art from `assets.json`, which is committed.
- `ref-*.html` and `refassets.json` carry the Mobbin captures for the
  reference row. `w[1-4]-*.html` and `walkassets.json` carry the crops for
  the walkthrough row. All four are gitignored. `mkwalk.py` rebuilds
  `walkassets.json` from the full-resolution captures.

```bash
python3 mockups/canvases/luma-ios/gen.py
```
