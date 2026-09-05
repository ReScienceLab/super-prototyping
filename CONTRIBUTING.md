# Contributing

Thanks for helping. This file covers the mechanics; `CLAUDE.md` and
`mockups/canvases/README.md` cover the conventions inside a canvas folder in
detail, and the pull request template repeats the ones that matter most.

## Setup

```bash
git clone https://github.com/ReScienceLab/super-prototyping.git
cd super-prototyping/canvas && bun install --frozen-lockfile && bun run dev
```

The viewer discovers `mockups/canvases/*/*.html` on its own. There is no
registry to edit and no build step per board.

## Making a change

1. Branch from `main`. Direct pushes to `main` are blocked; every change lands
   through a pull request.
2. Keep the pull request to one topic: one canvas folder, one skill, or one
   viewer change.
3. Fill in the checklist in the pull request template. Reviews are requested
   automatically through `CODEOWNERS`.

## Rules that reviews will check

- **`gen.py` is the only source of truth** for a canvas folder. Edit the
  generator and re-run it. Never hand-edit the `NN-*.html` boards.
- **Regenerate thumbnails** after `gen.py`:
  `python3 tools/refkit.py thumbs mockups/canvases/<slug>`.
- **Commit the evidence**: `layout.json`, `icon.png`, `thumbs/`, `assets/`,
  `probes.json`, `crops.json`, `assets.json`.
- **Never commit third-party captures.** `ref-*.html` and `assets/refs/` are
  ignored by git for a reason. Do not work around the ignore.
- **Scratch output goes in `scratch/`** inside the folder, never in the repo
  root or a dot directory.
- **Every folder has a `README.md`. No folder has its own `.gitignore`.**
- **Viewer changes** in `canvas/` need `bun test` and `bun run build` to pass.
  Add a test next to the module you touched.

## Adding an example canvas

```bash
cp -r mockups/canvases/templates mockups/canvases/<slug>
```

Then run the `clone-prototype` skill (measured from your own captures) or
`new-ui-mock` (no reference). A new example should reproduce screens you have
the right to capture, record the measurements behind every token, and ship
with a `README.md` that says what was measured and what was excluded.

## Repository automation

Everything under `.github/`:

- `CODEOWNERS`: who is asked to review pull requests, by path.
- `dependabot.yml`: weekly dependency updates for `canvas/` (bun) and for any
  GitHub Actions workflows.
- `pull_request_template.md`: the checklist every pull request starts with.
- `ISSUE_TEMPLATE/`: bug and feature forms, plus links to private
  vulnerability reporting and the hosted canvas.

Branch and tag protection, secret scanning, CodeQL and Actions permissions are
repository settings, not files; see `SECURITY.md`.

`.github/` is the one folder without a `README.md`: GitHub renders
`.github/README.md` in place of the root README on the repository page.

## Decisions

A decision worth rereading goes in `docs/YYYY-MM-DD-slug.md`.

## Reporting problems

Bugs and feature requests go through the issue templates. Security problems go
through private vulnerability reporting; see `SECURITY.md`.

## License

By contributing you agree that your contribution is licensed under the
Apache License 2.0, the same as the rest of the repository.
