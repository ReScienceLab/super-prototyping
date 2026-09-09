# scripts

Two release-and-install scripts. Neither is needed to *use* the plugin.

**`install-skills.sh`** links `skills/*` into the skill roots of every product
on the machine that reads one (Codex, CodeBuddy, Hermes, Pi, Trae, Trae CN) and
installs the Python toolkit that
puts `refkit`, `artgen` and `sp-canvas` on PATH. Links, not copies, so one
`git pull` in this checkout updates every product at once. `--list` shows what
it would do and changes nothing; `--tools-only` skips the linking. Most of those
products also have an install command of their own, and README's install table
prefers it: a linked checkout is whatever you last pulled, where an install is a
release. This is the route for a product with no such command (Trae), for a
release too old to have one, and for anyone who would rather run every product
off one checkout.

**`bump-version.sh`** moves the release version in every file listed in
`.version-bump.json` at once — the four plugin manifests, the marketplace entry
twice over, and `tools/pyproject.toml`. `--check` verifies they agree and prints
each one, which is the useful thing to run before tagging. Manifests drifting
apart is what makes "which version am I on" unanswerable, and it happens the
first time one of them is edited by hand.

```bash
scripts/bump-version.sh --check
scripts/bump-version.sh 1.1.0
```

Nobody has to run the bump by hand, though: dispatching the **Release**
workflow with a version runs it on a branch and opens the release PR, and
merging that PR tags `super-prototyping--v1.1.0` and cuts the release from
`RELEASE-NOTES.md`. Bumping locally is for seeing the diff before asking for
it.
