# .codebuddy-plugin

The CodeBuddy-side manifest, mirroring `.claude-plugin/plugin.json` the way
`.codex-plugin/` does. Same name, same version, same `"skills": "./skills/"`.
CodeBuddy is the CLI behind Tencent's WorkBuddy.

CodeBuddy reads a plugin manifest from `.codebuddy-plugin/plugin.json` first,
then `.workbuddy-plugin/plugin.json`, then `.claude-plugin/plugin.json`, and it
is built to the Claude Code plugin specification, so this repo was installable
before this file existed. It exists for the same reason the Codex one does: what
a product reads should be written for that product, and a divergence between the
two then has somewhere to live. The other two spellings are not duplicated here.
Three copies of one manifest is three chances to disagree, and the fallback
already covers them.

The catalogue `codebuddy plugin marketplace add ReScienceLab/super-prototyping`
reads is `.claude-plugin/marketplace.json`, by that same compatibility. The docs
do not name a `.codebuddy-plugin/marketplace.json`, so this directory
deliberately does not guess at one: a file found first and misread is worse than
no file at all.

Install:

```bash
codebuddy plugin marketplace add ReScienceLab/super-prototyping
codebuddy plugin install super-prototyping --scope user
```

CodeBuddy resolves the version from this manifest and caches the install under
`~/.codebuddy/plugins/cache/<marketplace>/<plugin>/<version>/`, and it resolves
version constraints against `{plugin-name}--v{version}` tags — the same tag this
repo already cuts. So the version here is the cache key, and it moves with the
others through `scripts/bump-version.sh`. Never edit it by hand.
