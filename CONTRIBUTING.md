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

The viewer discovers `canvases/*/*.html` on its own. There is no
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
- **A user-visible change adds its line** to `## Unreleased` in
  `RELEASE-NOTES.md`, in the same pull request that makes it.
- **Viewer changes** in `canvas/` need `bun run lint`, `bun run test` and
  `bun run build` to pass. Once `bun install` has run, `sp start` rebuilds
  `canvas/dist` when a source is newer than it, so a checkout being edited
  serves what is on disk; before that it serves the release `canvas/package.json` names.
  Add a test next to the module you touched.

## Adding an example canvas

```bash
cp -r canvases/templates canvases/<slug>
```

Then run the `clone-prototype` skill (measured from your own captures) or
`new-ui-mock` (no reference). A new example should reproduce screens you have
the right to capture, record the measurements behind every token, and ship
with a `README.md` that says what was measured and what was excluded.

## Repository automation

Everything under `.github/`:

- `workflows/validate.yml`: the gates, on every pull request — the versions
  agree, the canvas lints, tests and builds, the macOS app tests
  and builds, and the toolkit's tests pass. Run the same commands locally from the root README.
- `workflows/release.yml`: dispatch it with a version and it opens the release
  PR; merging that PR tags `super-prototyping--v<version>`, cuts the GitHub
  Release from the matching `RELEASE-NOTES.md` section, and attaches
  `canvas-dist.tgz`, the canvas built without the example boards. A macOS
  runner then attaches the two `Super-Prototyping-<version>-<arch>.dmg` files,
  signed and notarised when the secrets the job names are set, and a Windows
  runner attaches `Super-Prototyping-<version>-x64.exe`, unsigned. Each also
  attaches what an installed app updates itself from: the macOS zips, the
  blockmaps, and last the feed, `latest-mac.yml` or `latest.yml`. It is in two
  halves because branch protection means CI cannot push to `main`.
- `CODEOWNERS`: who is asked to review pull requests, by path.
- `dependabot.yml`: weekly dependency updates for `canvas/` and `desktop/`
  (bun) and for any GitHub Actions workflows.
- `pull_request_template.md`: the checklist every pull request starts with.
- `ISSUE_TEMPLATE/`: bug and feature forms, plus links to private
  vulnerability reporting and the hosted canvas.

Branch and tag protection, secret scanning, CodeQL and Actions permissions are
repository settings, not files; see `SECURITY.md`.

`.github/` must not get a `README.md`: GitHub renders `.github/README.md` in
place of the root README on the repository page.

## Cutting a release

A merge to `main` reaches nobody. The app updates itself from the latest
release, and every skill and command it links follows it, so an install only
moves when the version does. The version is what the updater compares, not
bookkeeping.

**What the number means.** Semver, read from the user's side. Patch: a fix that
changes no instruction a skill gives. Minor: a new skill, a new `refkit`
subcommand, a canvas feature. Major: a board, `layout.json` or command-line
change that makes an existing project's folders wrong. The app, the canvas and
the toolkit share one number and are released together, because a skill from one
release calls a command from the other.

**The steps.**

1. Read what is under `## Unreleased` in `RELEASE-NOTES.md` and group it the
   way the released sections are. Every pull request should have left its line
   there already; anything missing has to be reconstructed from the log, which
   is the one part of a release that cannot be done well late.
2. Run the gates locally (the block in the root README). The workflow runs them
   again; failing them here is faster.
3. Actions → **Release** → *Run workflow*, with the new version. It re-runs the
   gates, runs `scripts/bump-version.sh <version>`, and opens a
   `release/<version>` pull request. It stops there deliberately: "Protect main"
   requires a pull request and nothing bypasses it.
4. On that PR, rename `## Unreleased` to `## v<version>` and open a fresh empty
   `## Unreleased` above it. The tag job reads exactly that heading.
5. Merge. The push to `main` tags `super-prototyping--v<version>`, cuts the GitHub Release from that notes section, and
   attaches `canvas-dist.tgz`, the two dmgs and the Windows installer to it.

**Then check the release exists**, because everything downstream keys off the
tag: the tag on the Releases page, and `sp upgrade` on a machine with the app,
which should offer the new version.

**When a step fails.** The tag job runs only when the push moved the version
forward and no tag names it yet, so a re-run, an unrelated push to `main`, and
a revert of the release pull request all leave the tags alone. Dispatching a
version whose branch already exists replays the bump on top of that branch
rather than force-pushing over it, so the notes written at step 4 survive. If
the workflow cannot open the pull request, the branch is already pushed and
nothing is lost: open it by hand from
`main...release/<version>`, and turn on Settings → Actions → General → "Allow
GitHub Actions to create and approve pull requests", which is what it needed.
The bundle is attached last, after the release is cut, so a failure there leaves
the release whole. To add it by hand: in `canvas/`, run `bun run build` with
`PROTOTYPING_CANVASES_DIR` pointing at an empty directory, then
`tar -czf canvas-dist.tgz dist`, then
`gh release upload super-prototyping--v<version> canvas-dist.tgz`. The dmgs
can be added by hand the same way. The `dmg` job in `release.yml` is the list
of commands, and `CSC_IDENTITY_AUTO_DISCOVERY=false` in place of the signing
variables builds them unsigned. The Windows installer is the `nsis` job's
commands, run on Windows. Attach `latest-mac.yml` and `latest.yml` after the
files they name: an installed app reads them to update itself.
The whole thing is doable by hand too. Run `scripts/bump-version.sh <version>`,
open a pull request, then tag the merge `super-prototyping--v<version>` and push
the tag; the workflow is that sequence with the gates in front of it.

## Decisions

A decision worth rereading goes in `docs/YYYY-MM-DD-slug.md`.

## Reporting problems

Bugs and feature requests go through the issue templates. Security problems go
through private vulnerability reporting; see `SECURITY.md`.

## License

By contributing you agree that your contribution is licensed under the
Apache License 2.0, the same as the rest of the repository.
