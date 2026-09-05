# scripts

Two release-and-install scripts. Neither is needed to *use* the plugin.

**`install-skills.sh`** links `skills/*` into the skill roots of products that
have no marketplace — Codex, Hermes, Pi — and installs the Python toolkit that
puts `refkit`, `artgen` and `sp-canvas` on PATH. Links, not copies, so one
`git pull` in this checkout updates every product at once. `--list` shows what
it would do and changes nothing; `--tools-only` skips the linking. Claude Code
users do not need it: `/plugin install` covers the skills, and only the
toolkit line from the README is left to run.

**`bump-version.sh`** moves the release version in every file listed in
`.version-bump.json` at once — the two plugin manifests, the marketplace entry
and `tools/pyproject.toml`. `--check` verifies they agree and prints each one,
which is the useful thing to run before tagging. Four manifests drifting apart
is what makes "which version am I on" unanswerable, and it happens the first
time one of them is edited by hand.

```bash
scripts/bump-version.sh --check
scripts/bump-version.sh 1.1.0
git commit -am "release 1.1.0" && git tag super-prototyping--v1.1.0
```
