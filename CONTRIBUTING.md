# Contributing

Thanks for helping. This file covers the mechanics; `CLAUDE.md` and
`skills/prototype-canvas/references/layout.md` cover the conventions inside a
canvas folder in detail, and the pull request template repeats the ones that
matter most.

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
- **Commit the evidence**: `layout.json`, `icon.png`, `assets/`,
  `probes.json`, `crops.json` — and `assets.json` where a folder has one:
  a `name → data URI` map of pre-encoded images the generator inlines.
- **Never commit third-party captures.** `ref-*.html` and `assets/refs/` are
  ignored by git for a reason. Do not work around the ignore.
- **Scratch output goes in `scratch/`** inside the folder, never in the repo
  root or a dot directory.
- **Every canvas folder has a `README.md`**, carrying the evidence
  `skills/clone-prototype/references/documenting.md` asks for. Elsewhere a new
  document needs a reader who would go looking for it. **No folder has its own
  `.gitignore`.**
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

- `workflows/validate.yml`: the gates, on every pull request — the manifests
  agree and validate, the canvas lints, tests and builds, and the toolkit's
  tests pass. Run the same commands locally from the root README.
- `workflows/release.yml`: dispatch it with a version and it opens the release
  PR; merging that PR tags `super-prototyping--v<version>` and cuts the GitHub
  Release from the matching `RELEASE-NOTES.md` section. It is in two halves
  because branch protection means CI cannot push to `main`.
- `CODEOWNERS`: who is asked to review pull requests, by path.
- `dependabot.yml`: weekly dependency updates for `canvas/` (bun) and for any
  GitHub Actions workflows.
- `pull_request_template.md`: the checklist every pull request starts with.
- `ISSUE_TEMPLATE/`: bug and feature forms, plus links to private
  vulnerability reporting and the hosted canvas.

Branch and tag protection, secret scanning, CodeQL and Actions permissions are
repository settings, not files; see `SECURITY.md`.

`.github/` must not get a `README.md`: GitHub renders `.github/README.md` in
place of the root README on the repository page.

## Cutting a release

A merge to `main` reaches nobody. Every product resolves this plugin's version
from its manifest and caches the install under it, Claude Code at
`~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/` and Codex and
CodeBuddy at their own equivalents, so an install only moves when the version
does. The version is the cache key, not bookkeeping.
`docs/2026-09-09-plugin-release-mechanism.md` is the long form of why.

**What the number means.** Semver, read from the user's side. Patch: a fix that
changes no instruction a skill gives. Minor: a new skill, a new `refkit`
subcommand, a canvas feature. Major: a board, `layout.json` or command-line
change that makes an existing project's folders wrong. The plugin and the
toolkit share one number and are released together, because a skill from one
release calls a command from the other.

**The steps.**

1. Write the release's section in `RELEASE-NOTES.md` under `## Unreleased`,
   grouped as it already is. Say what a user sees, not what a commit did.
2. Run the gates locally (the block in the root README). The workflow runs them
   again; failing them here is faster.
3. Actions → **Release** → *Run workflow*, with the new version. It re-runs the
   gates, runs `scripts/bump-version.sh <version>`, and opens a
   `release/<version>` pull request. It stops there deliberately: "Protect main"
   requires a pull request and nothing bypasses it.
4. On that PR, rename `## Unreleased` to `## v<version>` and open a fresh empty
   `## Unreleased` above it. The tag job reads exactly that heading.
5. Merge. The push to `main` tags `super-prototyping--v<version>` through
   `claude plugin tag` and cuts the GitHub Release from that notes section.

**Then check the release exists**, because everything downstream keys off the
tag: the tag on the Releases page, `/plugin update super-prototyping` in Claude
Code, and `uv tool install --force
"git+https://github.com/ReScienceLab/super-prototyping@super-prototyping--v<version>#subdirectory=tools"`.

**When a step fails.** The tag job only runs when the push actually changed the
version and no such tag exists, so a re-run or an unrelated push to `main`
cannot tag twice. If the workflow cannot open the pull request, the branch is
already pushed and nothing is lost: open it by hand from
`main...release/<version>`, and turn on Settings → Actions → General → "Allow
GitHub Actions to create and approve pull requests", which is what it needed.
The whole thing is doable by hand too. Run `scripts/bump-version.sh <version>`,
open a pull request, then `claude plugin tag . --push -m 'super-prototyping %s'`
after it merges; the workflow is that sequence with the gates in front of it.

## Decisions

A decision worth rereading goes in `docs/YYYY-MM-DD-slug.md`.

## Reporting problems

Bugs and feature requests go through the issue templates. Security problems go
through private vulnerability reporting; see `SECURITY.md`.

## License

By contributing you agree that your contribution is licensed under the
Apache License 2.0, the same as the rest of the repository.
