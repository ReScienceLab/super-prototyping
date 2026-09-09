# .codex-plugin

The Codex-side manifest, mirroring `.claude-plugin/plugin.json`. Same name,
same version, same `"skills": "./skills/"` — one skills tree, a thin manifest
per product, so a skill is never forked to be ported.

Codex does have a marketplace, as of `codex-cli` 0.145:
`codex plugin marketplace add ReScienceLab/super-prototyping` then
`codex plugin add super-prototyping@super-prototyping` copies the plugin into
`plugins/cache/<marketplace>/<plugin>/<version>/`, keyed by the version in this
manifest. The catalogue it reads is `.agents/plugins/marketplace.json`.
`scripts/install-skills.sh` is still there for a Codex too old for the plugin
commands, and for products that have no such command at all: it symlinks each
`skills/*` into their skill roots.

Its version moves with the others through `scripts/bump-version.sh`.
