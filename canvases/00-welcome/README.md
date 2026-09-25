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

`assets/banner.webp` and `assets/icon.png` are this folder's; `gen.py` crops
the banner 4:1 and inlines both. The repo-root `assets/` belongs to the README
and the landing page, and this board no longer reads it.
