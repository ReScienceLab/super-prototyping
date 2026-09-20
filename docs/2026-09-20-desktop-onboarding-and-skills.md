# The app copies skills into the project; the toolkit installs itself

2026-09-20, following on from the desktop shell in #111 (PR #116). The dmg
gives a project no skills at all: a marketplace install gets `skills/` for
free, a dmg does not, so the app itself has to put them there. This note is
what was built for that, and the decisions behind it.

## The rule

**Opening a project copies the app's bundled skills into it, one SKILL.md
marked with a version, and every later open refreshes a marked copy that has
fallen behind — never the other way.** The copy and the refresh are one
function in `canvas/server`, the code the app and `sp start` already share,
so a terminal user gets the same refresh a window user does. The app's own
job shrinks to one thing: ask which agent's directory to write into.

## What was decided, and why

| Decision | Why |
|---|---|
| The app no longer detects, installs or mentions the toolkit | Each of the three skills already says "not on PATH? `uv tool install …`", so an agent reading one installs it unprompted. The toolkit dialog and the `sp root` call in `main.ts` go, and `launch.ts`'s `installCommand` and `missingToolkitMessage` (and their tests) go with them. |
| The copy-and-refresh logic lives in `canvas/server`, not in Python and not only in Electron | `dist/server.mjs` is the one piece of code the app and the CLI both run. Putting it in Electron alone would save a file but leave CLI users with no refresh; putting it in the Python toolkit would split it from the skills it copies, which live in this tree. |
| The server does not know what an agent is | It takes a list of project-relative directories to write into and nothing else; refresh only looks for the marker. The agent table, the detection heuristics and the picker are all in the app's `launch.ts`, already covered by `bun test`. |
| Copy the skills, never symlink into the `.app` bundle | Kiro does not follow a symlinked skill directory; eight more products are simply unresearched; a `/Applications/…` path committed to a repo is guaranteed to dangle for a teammate or a cloud agent; and uninstalling the app would leave every link broken. |
| One agent writes to exactly one directory | Claude Code and Cline do not read `.agents/skills`, so it cannot be the only target; writing an agent's skills to two directories doubles the diff, and three products that share `.agents/skills` each handle a duplicate a different way — one warns, one picks a copy at random, one lists the skill twice. |
| The default target is `.agents/skills`; five products are the exception | Everything that reads `.agents/skills` unconditionally gets it, and a multi-select union usually collapses to one or two directories. The five that do not read it — Claude Code, Cline, CodeBuddy, Kiro, and Trae, which needs a manual project setting turned on first — get their own. |
| The source is the plugin tree the app carries inside itself | A dmg user has no plugin installed anywhere else to copy from. The app bundles the same tree Homebrew already ships as one folder, and an agent's own `sp root` has to be able to find that same tree once it is installed (see below). |
| Copying pins the `uv tool install` line to the app's own version | The three SKILL.md files' install URL names no tag today, so it installs whatever is on `main`. The copy replaces `super-prototyping#subdirectory=tools` with `super-prototyping@super-prototyping--v<version>#subdirectory=tools`, so the toolkit an agent installs from a copied skill is the one that version of the skill was written against. This is what replaces the version-skew dialog the app might otherwise have needed. |
| The marker lives in the SKILL.md frontmatter, under `metadata` | An optional field in the agentskills.io spec. Verified on two products with a marked fixture skill installed for real: Claude Code invokes it, and Codex lists it beside an unmarked control. The other nineteen are in the open questions. |
| Refresh runs at server start | Both the app and `sp start` go through it there. The app has no other moment that means "this project might have a copy," and a copy only matters once someone opens that project again. |
| Only upgrade, never downgrade | A teammate on 1.6 who commits a refreshed skill must not have it undone by someone opening the same project on 1.5, or the two overwrite each other back and forth forever. |
| A marked folder is a build artifact: the whole folder is replaced on upgrade, never diffed | Wanting a customized copy means copying it under a different name; removing the marker means we stop touching it. |
| A same-named, unmarked folder is left alone | It is the user's own file. The picker warns and skips it once, on install; refresh says nothing and skips it every time. This repo's own `.claude/skills` and `.agents/skills` are exactly this case — symlinks to the unmarked source in `skills/`. |
| No "skills updated" dialog | `git diff` is the signal. |
| No configuration file in the home directory | Already the rule for this plugin. Which agent was chosen is recorded by which project directories exist; switching agents means deleting a directory and running the picker again. The one file the app does keep is `onboarded.json`, the projects it has already shown the picker for, so a skipped project stays skipped; it lives under the state directory beside the pidfile and log, and `sp clean` removes it. |

## Which directory each agent gets

| Target | Agents that write here |
|---|---|
| `.agents/skills` | Codex, Cursor, Devin, Gemini CLI, GitHub Copilot, OpenCode, Amp, Roo Code, Kilo Code, Hermes, Pi, Goose, Factory Droid, Junie, Antigravity, Qwen Code |
| `.claude/skills` | Claude Code |
| `.cline/skills` | Cline |
| `.trae/skills` | Trae |
| `.codebuddy/skills` | CodeBuddy |
| `.kiro/skills` | Kiro |

Cursor's own docs list `.cursor/skills` and `.agents/skills` as equally
valid without saying which wins; `.agents/skills` was picked so it shares a
copy with Codex and Devin rather than opening a seventh directory. Gemini
CLI de-duplicates a skill by name on its own, workspace layer over user
layer, so writing only `.agents/skills` never creates the duplicate in the
first place. Qwen and Roo both prefer their own directory over `.agents`
when both exist, which is moot as long as a project only ever gets one copy
from us.

Selecting more than one agent takes the union of their directories. The
bytes are identical, so which directory "wins" never matters; the only
visible noise is when Claude Code is picked alongside any `.agents`-family
agent: Kilo prints a duplicate-skill warning, OpenCode picks one copy at
random to show, and Devin lists the same skill twice, as `/agents:x` and
`/claude:x`. Accepted, and written down here rather than hidden.

## Detection, and what to say after installing

A pure function in `launch.ts` is handed three probes — is this binary on
PATH, does this directory exist under home, is this `.app` in
`/Applications` or `~/Applications` — and returns which agents look
installed, any one of the three counting. The picker pre-checks whatever it
finds. It opens on its own once per project, when the project holds no
marked copy and is not yet in `onboarded.json`; after that, File › Install
skills… is the way back to it.

| Agent | Executable | Config dir | `.app` | Worth telling the user after install |
|---|---|---|---|---|
| Claude Code | `claude` | `~/.claude` | Claude.app | a user-level `~/.claude/skills` of the same name shadows the project's |
| Codex | `codex` | `~/.codex` | | |
| Cursor | `cursor` | `~/.cursor` | Cursor.app | its CLI binary is `agent`, which collides with Grok CLI's, so it is not used for detection |
| Devin | `devin` | `~/.config/devin` | Devin.app | cloud Devin most likely reads only what has been committed (its docs say only "indexed repos") |
| Gemini CLI | `gemini` | `~/.gemini` | | the project has to be marked trusted first |
| GitHub Copilot | `copilot` | `~/.copilot` | | |
| OpenCode | `opencode` | `~/.config/opencode` | | |
| Amp | `amp` | `~/.config/amp` | Amp.app | its three user-level directories shadow the project's; Orbs reads only what has been committed |
| Cline | `cline` | `~/.cline` | Cline.app | a global same-named folder shadows the project's |
| Roo Code | `roo` | `~/.roo` | | |
| Kilo Code | `kilo` | `~/.kilo` | | |
| Hermes | `hermes` | `~/.hermes` | | must be a git repository, and needs one `hermes skills trust` run |
| Pi | `pi` | `~/.pi/agent` | | the project has to be trusted first |
| Goose | `goose` | `~/.config/goose` | Goose.app | |
| Factory Droid | `droid` | `~/.factory` | | |
| Junie | `junie` | `~/.junie` | | the project has to be trusted first |
| Antigravity | `agy` | `~/.gemini/config` | Antigravity.app | |
| Qwen Code | `qwen` | `~/.qwen` | | |
| Trae | — | `~/.trae`, `~/.trae-cn` | | writes only `.trae/skills`; `.agents` needs a project setting turned on by hand |
| CodeBuddy | `codebuddy`, `cbc` | `~/.codebuddy` | | not installed on the machine this was researched on; detection follows its docs |
| Kiro | `kiro-cli` | `~/.kiro` | not used: its installer adds one, but the bundle name is unconfirmed | not installed either; a skill whose name has an underscore is dropped silently — none of ours does |

All 21 rows trace to a cited source in the underlying research. The count
itself is the first open question below.

## The marker

```yaml
---
name: prototype-canvas
description: …
license: Apache-2.0
compatibility: …
metadata:
  managed-by: super-prototyping
  version: 1.5.0
---
```

Copying appends `metadata:` and its two lines onto the end of the
frontmatter, and pins the install line in the body to that same version's
tag. Neither exists in the source `skills/*/SKILL.md`: the marker only means
something once a copy is sitting outside this tree. The filename stays
exactly `SKILL.md`, frontmatter stays at byte zero, encoding stays UTF-8
with no BOM — Gemini CLI and Claude Code both skip a skill silently on any
of those three being off, so the copy cannot relax them to make room for the
marker.

## Refresh

`refresh(projectDir, root)` runs once, at server start, from both the app
and `sp start`. A `null` project directory — the server started by hand with
no `PROTOTYPING_PROJECT_DIR` — does nothing, the same way the existing
`/__sp` agent endpoints answer 503 rather than guess a project. Otherwise it
scans `<project>/.*/skills/*/SKILL.md` for the marker and compares each
copy's `metadata.version` against the tree's own (`.claude-plugin/plugin.json`).
Lower gets the whole folder replaced; an unparsable version counts as the
lowest there is, since the marker being present at all means it is ours to
overwrite. Equal, higher, or unmarked: left alone, silently — refresh never
prints and never asks. Versions compare as versions, not as strings, so
`1.5.0-rc.1 < 1.5.0 < 1.6.0`.

`GET /__sp/skills` and `POST /__sp/skills` (project-relative directories in,
which ones were written versus skipped for already having an unmarked
folder, out) are the app's only way to trigger a copy outside of that
automatic refresh — the "Install skills…" menu item calls the same POST
against a project and port already running.

## What was deliberately left out

- Any toolkit detection, install prompt or version check inside the app.
  The skill text carries that now.
- Detecting that a user edited a copy, by hash or otherwise. The answer,
  when someone loses an edit this way, is to rename the folder — not to
  merge into it — so there is nothing to detect for yet.
- Cleaning up a skill that gets renamed or removed from the tree. Due when
  that first happens, not before.
- A separate `skills-lock.json`. The marker travels with the folder; a
  second file recording the same fact is a second place for it to disagree.
- Symlinking into the project as an alternative mode.
- Committing the copies automatically. `git diff` is the user's decision.
- Automating any product's own trust prompt (Gemini CLI, Pi, Junie). One
  line in the post-install notes per product is all this does.
- Long-tail products with no writable project directory at all — ZeroClaw,
  Replit, Databricks, Superconductor, claude.ai's web client, Cowork.
- An `sp skills` subcommand. A CLI user's skills come from their own agent's
  plugin install; refresh is all they need, and refresh already lives in
  the server every `sp start` runs.

## Open questions

- **How many rows the picker actually shows.** It shows all 21 researched
  agents today. The other shape is six — the ones this repo already ships an
  install command for (Claude Code, Codex, CodeBuddy, Hermes, Pi, Trae) —
  plus one row reading "something else, using `.agents/skills`". Same code
  either way; the difference is picker length versus detection coverage,
  and it is a data change, not a mechanism change, whichever way it lands.
- **Whether any other product's parser rejects `metadata` in the
  frontmatter.** Claude Code and Codex do not: a marked fixture, installed
  for real, was invoked by the first and listed by the second next to an
  unmarked control. The other nineteen have not been tried; a rejection
  there means moving the marker to a sidecar file instead, not abandoning
  it.
- **Whether refreshing on every server start is too eager.** It writes to a
  project the user did not, in that moment, ask to have written to — the
  directory itself was their earlier choice, and `git diff` is meant to be
  the whole notice. The more conservative version only refreshes from a
  server the app itself started, never from a bare `sp start`; this note's
  position is that the current rule is fine, but it has not been tried on
  a project with real reviewers yet.
- **Zed.** Not in the research this note draws on, so not in either table
  above. Add a row once it has been looked at.
