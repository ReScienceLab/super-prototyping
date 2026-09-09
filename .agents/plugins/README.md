# .agents/plugins

`marketplace.json` is the catalogue Codex reads when this repo is added with
`codex plugin marketplace add ReScienceLab/super-prototyping`. It lists one
plugin — this repo — whose source is `./`, so the marketplace and the plugin
are the same checkout.

Codex would work without this file: it looks for
`.agents/plugins/marketplace.json`, then `.agents/plugins/api_marketplace.json`,
then `.claude-plugin/marketplace.json`, and the Claude catalogue is a fine
enough description of the same plugin. The file exists so that what Codex reads
is written for Codex: `interface.displayName`, the `policy` block and
`category` have no Claude Code equivalent, and a future divergence between the
two products has a place to live.

It carries no version. The version comes from the plugin manifests, which
`scripts/bump-version.sh` moves together, and Codex caches the install under
it: `plugins/cache/<marketplace>/<plugin>/<version>/`.

`.agents/skills` beside it is a symlink to `skills/`, for products that read a
skills directory directly.
