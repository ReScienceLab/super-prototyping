# Releasing the plugin: what we have, what everyone else does, what to do

2026-09-09. The repo has been installable as a plugin since 2026-09-05, but it
has never been *released*: no tag, no GitHub Release, no CI, and every manifest
still says `1.0.0`. This note is the survey behind the fix: how Claude Code and
Codex actually decide that an installed plugin is out of date, what the plugins
people install do about it, and the smallest mechanism that fits this repo.

The headline finding is not a missing nicety. **Anyone who installed this
plugin can never receive an update, no matter how many commits land on main.**

## How an update is decided

Claude Code resolves a plugin's version from the first of these that is set:
`plugin.json`'s `version`, then the marketplace entry's `version` ("if also set
in the marketplace entry, `plugin.json` wins"), then the source itself — the
resolved commit SHA for a git source, the SHA-256 digest for an archive, and
the literal `unknown` for an npm source or a directory outside a git repo.
That resolved string is both the cache directory name
(`~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`) and the cache
key: `/plugin update` and the background auto-update compare it against what is
installed, and **when the string has not changed there is no download**. The
docs say it outright: setting `version` "pins the plugin to that version
string, so users only receive updates when you bump it."

Locally, the record of that is `~/.claude/plugins/installed_plugins.json`
(schema v2), which stores `installPath`, `version`, `installedAt`,
`lastUpdated` and `gitCommitSha` per install; `convex@claude-plugins-official`
sits at `1.14.0` with `1.10.0` still on disk beside it: an updated plugin's
old directory is marked orphaned and swept about 14 days later, so that a
session which already loaded it keeps working.

We declare `1.0.0` in three fields at once (`.claude-plugin/marketplace.json`
at both `metadata.version` and `plugins[0].version`, and
`.claude-plugin/plugin.json`). So `plugin.json` pins the version, the entry
would pin it anyway if it did not, the cache key never moves, and `/plugin
update super-prototyping` reports success while copying nothing. The README's
line, "`/plugin update super-prototyping` picks up a new release", is only true
once the number moves, and it never has.

This is a well-worn trap, not a subtlety we invented: `everything-claude-code`
filed and fixed the identical bug (issue #36, "marketplace.json also needs
version field removed for auto-updates"), and found the same two fields,
`metadata.version` and `plugins[0].version`, holding their cache directory at
`1.0.0/`.

There are exactly two coherent contracts, and the choice is ours:

- **Pinned:** keep `version` and bump it on every release. Users move in steps
  we choose, `refkit --version` means something, and the tag names a release.
- **Rolling:** delete `version` everywhere and let the commit SHA be the
  version. Every merge to main is a release for everyone. Zero ceremony, no
  release notes, and no way to hold a bad merge back from users.

## Where we are today

- `scripts/bump-version.sh` already moves all seven version fields at once and
  has a `--check` mode; `.version-bump.json` lists them, and `tagPrefix` is
  `super-prototyping--v`.
- That prefix is not arbitrary: `claude plugin tag` (CLI 2.1.263) creates
  exactly `{name}--v{version}`, validating that `plugin.json` and the enclosing
  marketplace entry agree, and refusing a dirty tree. Run against this worktree
  today (`--dry-run --force`, since the tree is dirty) it prints
  `Tag: super-prototyping--v1.0.0` and the two git commands it would run. The
  release convention we want is already implemented in the CLI our users
  install from.
- `claude plugin validate <path> --strict` passes on both manifests today.
  Nothing runs it.
- `git tag` is empty, `gh release list` is empty, and `.github/` holds only
  `CODEOWNERS`, `dependabot.yml`, issue templates and a PR template, with no
  workflows. CodeQL runs through GitHub's default setup and the canvas deploys
  through the Cloudflare Pages integration, so neither is a workflow file, and
  neither runs `bun run lint`, `bun run test`, `bun run build` or the Python
  tests. Nothing today would stop a release that does not build.
- The toolkit is installed with an unpinned git URL:
  `uv tool install "git+https://github.com/ReScienceLab/super-prototyping#subdirectory=tools"`.
  It always takes the default branch's HEAD, so the plugin (pinned at a
  version) and the toolkit (floating on main) can be arbitrarily far apart.
  `tools/pyproject.toml` is one of the files `bump-version.sh` moves, so the
  version it reports is a release number that no install path actually selects.
- The Codex path in the README is a `git clone` plus `scripts/install-skills.sh`
  symlinks, with `git pull` as the upgrade. That predates Codex having plugins
  of its own; `codex-cli` 0.145 has `codex plugin marketplace add
  <owner/repo[@ref]>` with `--ref` and `--sparse`,
  `codex plugin add <plugin>@<marketplace>`, and
  `codex plugin marketplace upgrade`. It looks for a catalogue at
  `<repo-root>/.agents/plugins/marketplace.json` and falls back to
  `.claude-plugin/marketplace.json`, then `.cursor-plugin/marketplace.json`, so
  this repo is *already* installable that way through the Claude manifest.
  Probed today, `codex plugin add super-prototyping@super-prototyping` installs
  `1.0.0` with all three skills. Nothing tells a user so: the README still
  sends them to `git clone`.

## What the plugins people install actually do

**The official marketplace** (`anthropics/claude-plugins-official`, 292 entries
as cached on 2026-09-09) is the clearest picture of practice at scale:

| entry shape | count |
| --- | --- |
| `source: "url"` (whole repo) | 152 |
| `source: "git-subdir"` (sparse clone of a subdirectory) | 88 |
| local `"./plugins/<name>"` or `"./external_plugins/<name>"`, vendored | 52 |
| pinned to a tag ref + sha | 2 |
| pinned to a branch ref + sha | 85 |
| sha only, no ref | 153 |
| entries carrying an explicit `version` | 14 |

Two things stand out. First, every one of the 240 external entries is pinned to
a **sha**, and only two of them name a *tag* (`v1.5.5` and
`greptile--v1.2.3`); the rest ride `main`, `master` or nothing at all. Second,
the marketplace, not the plugin author, does the moving: a nightly workflow
(`bump-plugin-shas.yml`, 07:23 UTC, capped at 60 entries a run) compares each
entry's pinned sha against upstream HEAD (or, for the fourteen entries listed
`releases-only` in `.github/bump-tracking.json`, against the latest published
release tag), validates the plugin at the new sha with `claude plugin
validate`, and opens one PR per entry, which is how a failing entry stays
isolated instead of holding up the batch. `validate-plugins.yml` and
`scan-plugins.yml` are the required checks. Renames are handled by a top-level
`renames` map (9 of them) rather than by breaking installs.

The implication for us is direct: we are a *self-hosted, single-plugin*
marketplace, so there is no nightly bot upstream of us. We are both halves,
and whatever they automate we do by hand or not at all.

**`obra/superpowers`** (v6.3.0) is the closest sibling, the same shape as this
repo: one skills library published to many agent products
(`.claude-plugin`, `.codex-plugin`, `.cursor-plugin`, `.devin-plugin`,
`.hermes-plugin`, `.kimi-plugin`, `gemini-extension.json`), and it is where our
`.version-bump.json` and `scripts/bump-version.sh` came from. Its marketplace
entry carries `"version": "6.3.0"` with `"source": "./"`, like ours minus our
`metadata.version`, so the pinned contract, bumped every release. It keeps a
`RELEASE-NOTES.md` written for humans ("Worktree removal no longer destroys
untracked files"), cuts a GitHub Release per version, and has **no CI workflows at all**: `.github/`
holds funding and templates only. Its `.version-bump.json` has one thing ours
lacks: an `audit` block that greps the tree for stray version strings the spec
does not cover.

**`greptileai/claude-plugin`** tags `greptile--v1.2.3` and cuts a GitHub
Release for each, i.e. the literal output of `claude plugin tag`, and the
official marketplace pins that tag *and* its sha, one of only two entries so
pinned. Worth
knowing that the tag in the entry is downstream of the marketplace's own
`releases-only` list as much as of greptile's convention: the bot follows
releases for those fourteen, so an author who cuts releases gets pinned to
them.

**`get-convex/convex-backend-skill`** (the one third-party plugin installed on
this machine) carries `"version": "1.14.0"` in `plugin.json`, no tags and no
releases, and a `validate.yml` that on every PR, and on push to main, parses
each JSON manifest,
`node --check`s the hook scripts, runs their unit tests, and finishes with
`claude plugin validate . --strict` and the same against the marketplace
manifest. The marketplace pins it by sha and bumps nightly. Version discipline
in the manifest, freshness handled upstream.

**`wshobson/agents`** publishes 94 plugins, every one with an explicit
`version`, plus `validate.yml` (JSON, manifests, hooks) and `code-quality.yml`
(ruff/ty). No releases, no tags; the versions in the manifests are the whole
release mechanism.

The pattern across all of them: **an explicit version in the manifest is the
release; a tag and release notes are how humans read it; CI is how you find out
before users do.** None of them is published through a package registry.

## What to do here

Keep the pinned contract. We already have the parts that are tedious to build
(`bump-version.sh`, `.version-bump.json`, the tag prefix `claude plugin tag`
expects, a versioned Python package); what is missing is anything that moves
the number, and anything that runs before it moves. Rolling would throw the
first set away and hand users main's HEAD, which is wrong for a plugin whose
skills are read by agents and whose canvas app is built on the user's machine.

1. **Make a release actually reach people.** The next merge to main is only a
   release once `scripts/bump-version.sh 1.1.0` runs. Replace the README's
   two-line "Releasing:" note with the supported sequence, in this order,
   because
   `claude plugin tag` refuses a dirty tree and checks the two manifests agree:
   bump → commit → `claude plugin tag --push -m 'super-prototyping %s'` →
   `gh release create super-prototyping--v1.1.0 --notes-file …`.
2. **Add `RELEASE-NOTES.md`**, written for the person deciding whether to
   update, not generated from commit subjects. Superpowers' is the model.
3. **Add two workflows.** A `validate.yml` on PR and push to main:
   `claude plugin validate . --strict`, `claude plugin validate
   .claude-plugin/plugin.json --strict`, `scripts/bump-version.sh --check`,
   then `bun run lint && bun run test && bun run build` in `canvas/` and the
   Python tests in `tools/`. And a `release.yml` on `workflow_dispatch` taking
   the version, running the same gates, then bump, commit, tag, release. The
   ordering gotcha is the whole reason to script it.

   *What shipped is that in two halves.* "Protect main" requires a pull request
   and lists no bypass actors, so no workflow can push the bump to main: the
   dispatch runs the gates, bumps and opens a release PR, and merging that PR
   is what fires the tag-and-release job. Tag *creation* is allowed by the tag
   ruleset, which is why the second half can finish the job. Two consequences
   worth knowing: a PR opened by `GITHUB_TOKEN` triggers no `pull_request`
   workflows, so the release PR carries no Validate run of its own (the gates
   ran on the commit being released, and `claude plugin tag` validates again);
   and the tag job has to check that the version *changed* in the
   push, or any later edit to `plugin.json` would cut a release of whatever
   number is sitting in it.
4. **Pin the toolkit to the release.** `uv` accepts a ref in the same URL. The
   syntax was resolved for real today against `@main`; the tag form works once
   a tag exists, which is what item 1 is for:

   ```bash
   uv tool install "git+https://github.com/ReScienceLab/super-prototyping@super-prototyping--v1.1.0#subdirectory=tools"
   ```

   Say that in the README next to `/plugin install`, and keep
   `--force` for the unpinned form. The two halves of the install then carry
   the same number, which is what `bump-version.sh` was always for.
5. **Make skew visible.** `sp-canvas root` already finds the installed plugin;
   have it compare that plugin's `plugin.json` version against
   `importlib.metadata.version("super-prototyping-tools")` and print one line
   when they differ. A user who updated the plugin and forgot the toolkit
   currently gets a confusing failure much later.
6. **Document the Codex install, and give Codex its own catalogue.** The
   install works today through the fallback, so the first half is a README
   change: `codex plugin marketplace add ReScienceLab/super-prototyping`, then
   `codex plugin add super-prototyping@super-prototyping`, refreshed with
   `codex plugin marketplace upgrade`. Adding `.agents/plugins/marketplace.json`
   is then not what makes it possible but what stops Codex reading a manifest
   written for a different product: the file Codex prefers carries the fields
   only it has. Superpowers' is the shape to copy: a marketplace `name`, an
   `interface.displayName`, and one plugin with `name`, a
   `{"source": "url", "url": "./"}` source, a `policy` block and a `category`.
   It carries no version; Codex caches to
   `plugins/cache/<marketplace>/<plugin>/<version>/`, the same version-keyed
   cache Claude Code uses, so one `bump-version.sh` run releases both products.
   (Which file it reads that version *from* we could not separate: superpowers
   and this repo both declare the same number in `.codex-plugin` and
   `.claude-plugin`. It does not matter while `bump-version.sh` moves them
   together, which is the point of the script.)

Deliberately not doing:

- **Not switching `source: "./"` to a pinned `github`/`url` source.** It would
  serve the tagged commit instead of the marketplace clone's HEAD, but
  `sparsePaths` applies to the marketplace source, so the 6.7 MB install
  documented in the README would go back to 151 MB. A plugin source has no
  sparse option of its own — `git-subdir` is the one kind that clones sparsely
  and it wants a subdirectory, which a root-level plugin does not have. With a
  self-hosted marketplace whose only entry is itself, bumping the version buys
  the same control at no cost.
- **Not publishing the toolkit to PyPI yet.** It would make
  `uv tool upgrade super-prototyping-tools` work, which is the one thing a git
  install cannot do well, but it adds a second release surface and a name to
  own. Revisit if users ask; the tagged git URL covers the need.
- **Not adopting release-please / semantic-release.** They exist to derive
  versions from conventional commits and generate changelogs; we have a handful
  of files in one repo and a script that already moves them, and the notes worth
  writing are not commit subjects.

Which products that version reaches, and which file each of them reads
to find it, is the companion note: `docs/2026-09-09-multi-product-install.md`.

## Checked

Claude Code 2.1.263, codex-cli 0.145.0 and uv 0.11.29 on this machine.
`claude plugin validate --strict` passes on both manifests, and `claude plugin
tag --dry-run --force` (plain `--dry-run` refuses this dirty tree, which is the
check item 1 leans on) prints `Tag: super-prototyping--v1.0.0`. The resolution
order, the 14-day orphan sweep and the cache layout are from the plugins
reference; the `installed_plugins.json` v2 fields were read from
`~/.claude/plugins`. The marketplace numbers were recomputed from the locally
cached `claude-plugins-official` manifest (292 entries, fetched 2026-09-09),
and the workflow details from that repo on GitHub. The uv
ref-plus-subdirectory syntax was resolved for real against `@main` and produced
`super-prototyping-tools @ git+…@f56f52fe…#subdirectory=tools`. The Codex
behaviour was probed in throwaway `CODEX_HOME`s: adding this repo at
`origin/main`, which has no `.agents/plugins/marketplace.json`, reports the
catalogue it used as `.claude-plugin/marketplace.json` and lists one plugin,
which `codex plugin add super-prototyping@super-prototyping` installs as
`1.0.0`; adding `obra/superpowers`, which does ship one, reports
`.agents/plugins/marketplace.json` and installs `6.3.0` into
`plugins/cache/superpowers-dev/superpowers/6.3.0`; and the
`.agents/plugins/marketplace.json` this repo now ships was probed the same way,
which is how we know Codex reads it in preference and installs `1.0.0` from it.
The fallback order
`.agents/plugins/marketplace.json`, `.agents/plugins/api_marketplace.json`,
`.claude-plugin/marketplace.json`, `.cursor-plugin/marketplace.json` is in the
0.145.0 binary. One caveat that cost an hour: `codex plugin add` fails against
a marketplace added with `--sparse` ("unable to read sha1 file … unable to
checkout working tree" — it re-clones the sparse snapshot and git cannot read
the objects that were left out), so the small-install trick is Claude Code's
only for now.
