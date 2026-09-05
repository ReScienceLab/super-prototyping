## What this changes

<!-- One or two sentences. Link the issue if there is one. -->

## Checklist

- [ ] No `ref-*.html`, `assets/refs/` or other third-party captures are in this PR.
- [ ] If a canvas folder changed: `gen.py` was edited and re-run, the `NN-*.html` boards were not hand-edited, and `python3 tools/refkit.py thumbs mockups/canvases/<slug>` was run afterwards.
- [ ] If a canvas folder changed: `layout.json`, `probes.json`, `crops.json` and `assets.json` are committed alongside the boards.
- [ ] Every new folder has a `README.md` and no folder has its own `.gitignore`.
- [ ] If `canvas/` changed: `bun test` and `bun run build` pass in `canvas/`.
