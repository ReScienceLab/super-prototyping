# 00-welcome

The onboarding page. The bare canvas URL opens it, whichever page was last
on screen. Its clickable parts, one card per other folder and the repo
button, are `canvas-link` shapes drawn by the canvas, not markup in the
board. `canvases/README.md` explains why.

One board, `00-welcome.html`, and the only one in the repo that is not
phone-shaped. It is a 2153 × 819 landscape strip as wide as the row of
cards under it. `gen.py` writes that size into `layout.json` as `w`/`h`,
which is what the canvas reads. After adding a folder, raise `CARDS` in
`gen.py` and re-run:

```bash
python3 canvases/00-welcome/gen.py
```

The art is the folder's own, as every canvas folder's is: `assets/banner.webp`,
which `gen.py` crops 4:1 and inlines, and `assets/icon.png` for the mark in the
header. The repo's own `assets/` is the README's and the landing page's, and
this board stopped reading it when a new banner landed there.
