# .claude-plugin

`plugin.json` is the plugin definition Claude Code reads: name, version,
description, and `"skills": "./skills/"` pointing at the real skills tree.

`marketplace.json` makes this repo its own single-plugin marketplace, so
`/plugin marketplace add ReScienceLab/super-prototyping` works against the
repo directly with no separate registry to maintain. Its one entry uses
`"source": "./"` — the plugin is this repo.

It is deliberately not `strict: false`. `plugin.json` stays the single
definition, and a second plugin later is one added entry here rather than a
restructure.

Both versions, plus `.codex-plugin/plugin.json` and `tools/pyproject.toml`,
move together through `scripts/bump-version.sh`. Never edit a version by hand.
