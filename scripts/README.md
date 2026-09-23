# scripts

**`bump-version.sh`** moves the release version in every file listed in
`.version-bump.json` at once: `canvas/package.json`, which the skills and `sp`
read, `desktop/package.json` and `tools/pyproject.toml`. `--check` verifies
they agree and prints each one, which is the useful thing to run before
tagging. Files drifting apart is what makes "which version am I on"
unanswerable, and it happens the first time one of them is edited by hand.

```bash
scripts/bump-version.sh --check
scripts/bump-version.sh 1.1.0
```

Nobody has to run the bump by hand, though: dispatching the **Release**
workflow with a version runs it on a branch and opens the release PR, and
merging that PR tags `super-prototyping--v1.1.0` and cuts the release from
`RELEASE-NOTES.md`. Bumping locally is for seeing the diff before asking for
it.
