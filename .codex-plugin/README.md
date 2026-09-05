# .codex-plugin

The Codex-side manifest, mirroring `.claude-plugin/plugin.json`. Same name,
same version, same `"skills": "./skills/"` — one skills tree, a thin manifest
per product, so a skill is never forked to be ported.

Codex has no marketplace, so nothing here is fetched automatically. Users
clone the repo and run `scripts/install-skills.sh`, which symlinks each
`skills/*` into `~/.codex/skills`. This file is the declaration of what that
install contains.

Its version moves with the others through `scripts/bump-version.sh`.
