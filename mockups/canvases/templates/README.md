# templates

The starting point for a new canvas folder, not a finished board. Copy it
and run its generator:

```bash
cp -r mockups/canvases/templates mockups/canvases/<slug>
python3 mockups/canvases/<slug>/gen.py
```

That emits the four boards every run produces, wired together and already
passing `refkit tokens`: design tokens, an evidence table, one phone screen
and one parked reference. The parked reference is `ref-01-screen.html`, and
the root `.gitignore` keeps it out of git like every `ref-*` board. Tokens
and the evidence table come from one list in `gen.py`, so they cannot drift
apart. Replace every placeholder with a value you measured.

Boards 02 to 08 drop the same screen into a photoreal iPhone shell from a
Figma community mockup, three iPhone 17 Pro colourways and four iPhone 16
Pro ones, for showing a mock outside the team. Each states on its face which
phone it is and how its 393 × 852 window relates to the real one.
`assets.json` holds the shell art. `shellbuild.py` rebuilds a shell from an
export.
