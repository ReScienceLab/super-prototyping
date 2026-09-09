# One skills tree, six install commands

2026-09-09. The plugin shipped with two manifests, for Claude Code and Codex,
and a script that symlinked `skills/` for everyone else. A symlinked checkout
has no version, so the argument in `docs/2026-09-09-plugin-release-mechanism.md`
(the version is the cache key, an install only moves when it moves) applies to a
product's own install command and to nothing else. This note records which file
each product reads, how that was established, and what was deliberately not
shipped.

## The rule

**A manifest per product, never a skill per product.** Every manifest points at
the same `skills/` tree, and `scripts/bump-version.sh` moves every version in
one commit. A product that reads `skills/*/SKILL.md` directly gets no manifest
at all.

## What each product reads

| Product | Reads | Install |
|---|---|---|
| Claude Code | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` | `/plugin marketplace add` + `/plugin install` |
| Codex | `.agents/plugins/marketplace.json` → `.claude-plugin/marketplace.json`; `.codex-plugin/plugin.json` | `codex plugin marketplace add` + `codex plugin add` |
| WorkBuddy / CodeBuddy | `.codebuddy-plugin/plugin.json` → `.workbuddy-plugin/plugin.json` → `.claude-plugin/plugin.json` | `codebuddy plugin marketplace add` + `codebuddy plugin install` |
| Hermes | root `plugin.json` (Agent Plugins v1.0.0) + `skills/*/SKILL.md` | `hermes plugins install ReScienceLab/super-prototyping --enable` |
| Pi | `skills/` by convention, no manifest | `pi install git:github.com/ReScienceLab/super-prototyping@<tag>` |
| Trae, Trae CN, and the rest | `SKILL.md` under a skills root | `npx skills add ReScienceLab/super-prototyping` |

Sources, all read on 2026-09-09: the CodeBuddy fallback order and its
`{plugin-name}--v{version}` tag convention from
[its plugins reference](https://www.codebuddy.ai/docs/cli/plugins-reference);
Hermes' portable-package layout and `--enable` from the
[plugin developer guide](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/plugins/index.md);
the [Agent Plugins v1.0.0 schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json)
for the two required fields; Pi's convention directories and pinned git refs
from its
[packages doc](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md);
and the skill roots (`~/.codebuddy/skills`, `~/.hermes/skills`,
`~/.pi/agent/skills`, `~/.trae/skills`, `~/.trae-cn/skills`) from the
[`skills` CLI](https://github.com/vercel-labs/skills)'s agent table, which
matches each product's own docs. Codex's fallback chain was read out of the
0.145.0 binary and probed live; that story is in the release-mechanism note.

## Three things that look like manifests and are not

**`.workbuddy-plugin/plugin.json` and `.claude-plugin/plugin.json` for
CodeBuddy.** Both are accepted, both fall back to the one we ship. Three copies
of one manifest is three chances to disagree.

**A `.codebuddy-plugin/marketplace.json`.** CodeBuddy's docs name the plugin
manifest paths and do not name a catalogue path. Its Claude compatibility
covers `.claude-plugin/marketplace.json`; a guessed file found first and
misread is worse than no file.

**A Pi extension.** Pi loads `extensions/*.ts` too, and `superpowers` uses one
to inject a bootstrap prompt. This plugin's skills are invoked by name like any
other skill, so the convention `skills/` directory is the whole integration and
a TypeScript extension would be code to maintain for nothing.

**A root `package.json`.** Pi's `installGit` runs `npm install` at the package
root whenever it finds one there, so a `pi` manifest would buy a listing on
pi.dev and charge every Pi install an npm step. Without it the install is a
clone and a checkout, which is also the shape of its cost: full history, no
sparse or shallow option, and the reconcile step in `pi update` wipes untracked
files in that clone, so nobody should edit inside it.

## What the version buys, per product

Claude Code, Codex and CodeBuddy each cache under
`…/plugins/cache/<marketplace>/<plugin>/<version>/`, so all three are moved by
one bump. Hermes pins a commit and moves on `hermes plugins update`. Pi pins
whatever ref it was given and never moves it on its own, which is why the
install line names a release tag; moving it is another `pi install`. `npx
skills` and `scripts/install-skills.sh` track a checkout rather than a release.
That is the trade for working in a product with no install command, and the
README says so where someone choosing between them will read it.
