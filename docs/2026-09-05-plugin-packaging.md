# The repo becomes an installable plugin: code here, data there

2026-09-05. Until now the only way to use this was to clone the repo and work
inside it. That makes every user a fork: their boards and our code sit in one
tree, so there is no upgrade path that does not risk their work. This note
records what changed and why the split falls where it does.

## The rule

**The plugin ships code. A user's project holds only data.**

Code, versioned and replaced wholesale on upgrade: `skills/`, `canvas/`,
`tools/`, `mockups/canvases/templates` and the worked examples the skills point
at.

Data, never touched by an upgrade: `mockups/canvases/<slug>/` in the user's own
project — the `gen.py`, the boards, `layout.json`, `assets/`, and the evidence
JSON beside them.

Everything below follows from that one line. When something is hard to place,
ask whether replacing it during an upgrade would destroy work; if yes it is
data.

## Two things had to be fixed for it to hold

**1. Board discovery could only read one hard-coded directory.**
`canvas/src/canvasLibrary.ts` used three `import.meta.glob` calls. A glob
pattern is a string literal that Vite resolves at build time into generated
code, so it could never read the boards of whoever installed the plugin — the
directory is not known until the app runs.

Replaced with a virtual module: the `prototyping-canvases` plugin in
`canvas/vite.config.ts` scans `PROTOTYPING_CANVASES_DIR` (default: this repo's
`mockups/canvases`) and generates the same three maps. `canvasLibrary.ts` now
has one import and no glob, and everything downstream is unchanged.

Two constraints on that generated module, both load-bearing:

- **The map keys keep the historical shape**,
  `../../mockups/canvases/<slug>/<file>`. A board's tldraw shape id is seeded
  from its key, and documents persist in the browser's IndexedDB. Change the
  key format and every user's hand-drawn annotation is orphaned.
- **`fileLoaders` stays lazy, `rawLayouts` and `rawIcons` stay eager.** That is
  what 2026-09-03's on-demand loading bought; the virtual module reproduces it
  rather than replacing it.

The dev server watches the boards directory and invalidates the module when a
folder or file is added or removed, so a board folder created after boot
appears on its own.

**2. A skill could not name the tools it calls.**
Every `SKILL.md` said `REPO="$(git rev-parse --show-toplevel)"` and then
`python3 "$REPO/tools/refkit.py"`. Installed as a plugin, `$REPO` is the
*user's* repo, which has no `tools/`.

The obvious fix — a plugin-root variable — does not exist. `${CLAUDE_PLUGIN_ROOT}`
is not exported to the Bash tool's environment (anthropics/claude-code#48230,
closed unimplemented), and `${CLAUDE_SKILL_DIR}` is Claude-only. Any path-based
spelling would need to differ per product, which defeats one `SKILL.md` for
all of them.

So `tools/` became a Python package, `super-prototyping-tools`, exporting
`refkit`, `artgen` and `sp-canvas` as console entry points. A skill says
`refkit grid ...` with no path in it, and that one spelling is correct
everywhere.

`sp-canvas root` closes the remaining gap: a skill that needs the *kit* (the
folder template, a worked example) asks for it. It searches
`SUPER_PROTOTYPING_ROOT`, then the `installPath` Claude Code records in
`~/.claude/plugins/installed_plugins.json`, then
`~/.claude/plugins/cache/*/super-prototyping/*` sorted by version (not by
mtime: two directories can share one, and then the older release wins at
random), then the per-product skill symlinks, then the current git checkout —
validating each candidate by reading `canvas/package.json`. It prints only the
path on stdout so `KIT="$(sp-canvas root)"` works; the search trace goes to
stderr behind `-v`.

## What the layout looks like now

- `skills/` is the real directory; `.claude/skills/` and `.agents/skills/` are
  symlinks to it. It used to be the other way round, which meant this checkout
  loaded a path no install has.
- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` make the
  repo its own single-plugin marketplace (`"source": "./"`). `.codex-plugin/`
  mirrors it. The marketplace is deliberately not `strict: false`:
  `plugin.json` stays the definition, so a second plugin later is an added
  entry rather than a restructure.
- `.version-bump.json` lists every file holding the version and
  `scripts/bump-version.sh` moves them together. Four manifests drifting apart
  is the failure mode that makes "which version am I on" unanswerable;
  `--check` answers it, and is a release-time step rather than a CI job — this
  repo has no workflows.
- `scripts/install-skills.sh` covers products with no marketplace by symlinking
  `skills/*` into their skill roots. Links, not copies: one `git pull` updates
  every product, and there is no forked copy to drift.

## Consequences accepted

- **The toolkit is a second install.** `/plugin install` cannot run `uv tool
  install` for you, so a Claude Code user runs two commands, not one. The
  alternative — vendoring the Python into the plugin and invoking it by path —
  is exactly the path-spelling problem above.
- **`clone-prototype` split.** It was 769 lines against the Agent Skills
  spec's ~500 recommendation. Measuring technique, comparison depth, the README
  contract and the pitfalls list moved into `references/`, each behind a
  two-line pointer. The phase order in `SKILL.md` is unchanged.
- **The examples are documentation now, not just examples.** The skills quote
  `$KIT/mockups/canvases/luma-ios/` and friends by path, so deleting or
  renaming one of those folders breaks a skill. They ship with the plugin.
