# The app copies skills into the project; the toolkit installs itself

2026-09-20, following on from the desktop shell in #111 (PR #116). The dmg
gives a project no skills at all. A marketplace install gets `skills/` for
free and a dmg does not, so the app itself has to put them there. This note
records what was built for that, and the decisions behind it.

## The rule

**Opening a project copies the app's bundled skills into it, one SKILL.md
marked with a version, and every later open refreshes a marked copy that has
fallen behind and never downgrades one.** The copy and the refresh are one
function in `canvas/server`, the code the app and `sp start` already share, so
a terminal user gets the same refresh a window user does. The app's own job
shrinks to one window that asks which agents are here, then which project.

## What was decided, and why

| Decision | Why |
|---|---|
| The app no longer detects, installs or mentions the toolkit | Each of the three skills already says "not on PATH? `uv tool install …`", so an agent reading one installs it unprompted. The toolkit dialog and the `sp root` call in `main.ts` go, and `launch.ts`'s `installCommand` and `missingToolkitMessage` (and their tests) go with them. |
| The copy-and-refresh logic is in `canvas/server`, not in Python and not only in Electron | `dist/server.mjs` is the one piece of code the app and the CLI both run. Putting it in Electron alone would save a file but leave CLI users with no refresh. Putting it in the Python toolkit would split it from the skills it copies, which are in this tree. |
| The server does not know what an agent is | It takes a list of project-relative directories to write into and nothing else, and refresh only looks for the marker. The agent table, the detection heuristics and the startup page's rows are all in the app's `launch.ts`, already covered by `bun test`. |
| Copy the skills, never symlink into the `.app` bundle | Kiro does not follow a symlinked skill directory, and eight more products are unresearched. A `/Applications/…` path committed to a repo dangles for a teammate or a cloud agent. Uninstalling the app would leave every link broken. |
| One agent writes to exactly one directory | Claude Code and Cline do not read `.agents/skills`, so it cannot be the only target. Writing an agent's skills to two directories doubles the diff, and three products that share `.agents/skills` each handle a duplicate a different way. One warns, one picks a copy at random, and one lists the skill twice. |
| The default target is `.agents/skills`; five products are the exception | Everything that reads `.agents/skills` unconditionally gets it, and a multi-select union usually collapses to one or two directories. Five do not read it and get their own: Claude Code, Cline, CodeBuddy, Kiro, and Trae, which needs a manual project setting turned on first. |
| The source is the plugin tree the app carries inside itself | A dmg user has no plugin installed anywhere else to copy from. The app bundles the same skills-plus-canvas tree a product install has, as one folder, and an agent's own `sp root` has to be able to find that same tree once it is installed (see below). |
| Copying pins the `uv tool install` line to the app's own version | The three SKILL.md files' install URL names no tag today, so it installs whatever is on `main`. The copy replaces `super-prototyping#subdirectory=tools` with `super-prototyping@super-prototyping--v<version>#subdirectory=tools`, so the toolkit an agent installs from a copied skill is the one that version of the skill was written against. This is what replaces the version-skew dialog the app might otherwise have needed. |
| The marker is in the SKILL.md frontmatter, under `metadata` | `metadata` is an optional field in the agentskills.io spec. It was verified on two products with a marked fixture skill installed for real. Claude Code invokes it, and Codex lists it beside an unmarked control. The other nineteen are in the open questions. |
| Refresh runs at server start | Both the app and `sp start` go through it there. The app has no other moment that means "this project might have a copy," and a copy only matters once someone opens that project again. |
| Only upgrade, never downgrade | A teammate on 1.6 who commits a refreshed skill must not have it undone by someone opening the same project on 1.5, or the two overwrite each other back and forth forever. |
| A marked folder is a build artifact, so an upgrade replaces the whole folder and never diffs it | Wanting a customized copy means copying it under a different name. Removing the marker means we stop touching it. |
| A same-named, unmarked folder is left alone | It is the user's own file. The install reports it as left alone. Refresh says nothing and skips it every time. This repo's own `.claude/skills` and `.agents/skills` are this case, since they are symlinks to the unmarked source in `skills/`. |
| No "skills updated" dialog | `git diff` is the signal. |
| What the install did is a toast in the canvas | The app puts it in the canvas's address as `?toast=<json>`, and the canvas shows it at its bottom right once it is up, where tldraw puts its own notices, and takes it out of the address. A native alert was a modal in the app's icon and macOS's type, in front of a startup page about to be replaced. |
| No configuration file in the home directory | That is already the rule for this plugin. Which project directories exist records which agent was chosen, and switching agents means deleting a directory. The app remembers nothing else, neither the last project nor the last answer. The startup page asks again on every launch and defaults to what detection found. Installing is idempotent, so the same answer again writes nothing, and a different answer adds that agent's directory. |
| The startup page comes before the project, every launch, and picks one agent | The first thing on screen is which agent to work with, not a folder panel. There are two cards, Claude Code and Codex. Each says whether it was found and carries the evidence as its tooltip, and the first found one starts selected. The other researched agents stay in the table, unoffered, until one is asked for. The page picks one agent, not a set, because a project is worked on with one agent at a time. A second agent is one more launch, which costs nothing because the install is idempotent. It is a page in the app's one window, at the canvas's size, and the canvas replaces it. Next leads to its second step, open-or-create, and Create to a third, the name, each with Back. The second step also shows the folders in `Documents/Super Prototyping` as a grid of cards, last edited first, each with an icon, its name, where it is and when it was last edited, and a click opens one with the agent from step one. The icon is the `icon.png` of the project's first canvas that has one, so a project looks like the app it prototypes, and a folder until it has one. The list is read from disk at launch and never stored, so the app still remembers nothing. The page has no artwork and its cards carry a title and no helper text, so the projects are what the second step shows. `open -a … --args <dir>` skips the page, for a scripted launch, and installs nothing. |
| Creating a project asks for a name and nothing else | This is Screen Studio's pattern. A new project goes to `~/Documents/Super Prototyping/<name>`, so there is no place to decide and no save panel. That folder holds the user's projects, which are data and not configuration, so the no-config rule above holds. A name already taken there is not reused silently, and not refused with a native alert either. The page says so under the field and offers the way out, which is another name or a link that opens that project instead. A name that starts with a dot or has a slash in it is not one folder under that directory, and the page says that the same way. |
| A new project is an empty `mockups/canvases`, and the app shows its own examples beside it | An empty folder opens on an empty canvas, and what a new project should open on is Start here with every example under it. The app ships this repo's `mockups/canvases` whole and passes it to the server as `PROTOTYPING_EXAMPLES_DIR`. The server lists those canvases beside the project's, lets a folder of the project's own that has a board in it shadow the example of the same name, answers a status or comment write to one with 403, and clones one into the project, which is how an example gets reused. The chat agent is told when the canvas it is asked about is an example, and to change a copy in the project instead. Codex's sandbox does not include the examples folder, so Codex cannot write there at all. Copying them into each project was 420 MB a project, in a Documents folder iCloud may sync, and a copy never updates. Links into the app bundle break when the app moves, and a write through one breaks the app's signature. `sp start` does not set the variable, because a checkout already has the examples as its boards, and an install shows a project's own. The cost is the download. The examples are about 440 MB, a quarter of it boards and the rest the assets their generators read, and the dmg goes from about 130 MB to about 510 per architecture. Shipping the boards alone would save most of that and leave a clone that cannot be regenerated. |

## Which directory each agent gets

| Target | Agents that write here |
|---|---|
| `.agents/skills` | Codex, Cursor, Devin, Gemini CLI, GitHub Copilot, OpenCode, Amp, Roo Code, Kilo Code, Hermes, Pi, Goose, Factory Droid, Junie, Antigravity, Qwen Code |
| `.claude/skills` | Claude Code |
| `.cline/skills` | Cline |
| `.trae/skills` | Trae |
| `.codebuddy/skills` | CodeBuddy |
| `.kiro/skills` | Kiro |

Cursor's own docs list `.cursor/skills` and `.agents/skills` as equally valid
without saying which wins. We picked `.agents/skills` so that Cursor shares a
copy with Codex and Devin rather than opening a seventh directory. Gemini CLI
de-duplicates a skill by name on its own, workspace layer over user layer, so
writing only `.agents/skills` never creates the duplicate in the first place.
Qwen and Roo both prefer their own directory over `.agents` when both exist,
which is moot as long as a project only ever gets one copy from us.

Selecting more than one agent takes the union of their directories. The bytes
are identical, so which directory "wins" never matters. The only visible noise
comes when Claude Code is picked alongside any `.agents`-family agent: Kilo
prints a duplicate-skill warning, OpenCode picks one copy at random to show,
and Devin lists the same skill twice, as `/agents:x` and `/claude:x`. We
accept that, and write it down here rather than hide it.

## Detection, and what to say after installing

A pure function in `launch.ts` takes three probes: is this binary on PATH,
does this directory exist under home, and is this `.app` in `/Applications` or
`~/Applications`. It returns, per agent, what it found in those words:
`claude on PATH`, `~/.codex`, `Cursor.app`. The startup page says "Found on
this machine" or "Not found" on each of its two cards, keeps those words as
the card's tooltip, and starts on the first card with something in it.
Detection runs on every launch, before a project is named, because the machine
can change between launches, the answer is cheap, and installing the same
answer again writes nothing.

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
| Trae | none | `~/.trae`, `~/.trae-cn` | | writes only `.trae/skills`; `.agents` needs a project setting turned on by hand |
| CodeBuddy | `codebuddy`, `cbc` | `~/.codebuddy` | | not installed on the machine this was researched on; detection follows its docs |
| Kiro | `kiro-cli` | `~/.kiro` | not used: its installer adds one, but the bundle name is unconfirmed | not installed either; a skill whose name has an underscore is dropped silently, and none of ours has one |

All 21 rows trace to a cited source in the underlying research. Two are
offered on the startup page. The rest is what detection knows, kept until a
row is asked for, which takes one flag on it.

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

Copying appends `metadata:` and its two lines onto the end of the frontmatter,
and pins the install line in the body to that same version's tag. Neither
exists in the source `skills/*/SKILL.md`, because the marker only means
something once a copy is sitting outside this tree. The filename stays exactly
`SKILL.md`, the frontmatter stays at byte zero, and the encoding stays UTF-8
with no BOM. Gemini CLI and Claude Code both skip a skill silently when any of
those three is off, so the copy cannot relax them to make room for the marker.

## Refresh

`refresh(projectDir, root)` runs once, at server start, from both the app and
`sp start`. A `null` project directory, which is the server started by hand
with no `PROTOTYPING_PROJECT_DIR`, does nothing, the same way the existing
`/__sp` agent endpoints answer 503 rather than guess a project. Otherwise it
scans `<project>/.*/skills/*/SKILL.md` for the marker and compares each copy's
`metadata.version` against the tree's own, from `.claude-plugin/plugin.json`.
A lower version gets the whole folder replaced. An unparsable version counts
as the lowest there is, since the marker being present at all means it is ours
to overwrite. A copy that is equal, higher, unmarked or missing is left alone.
Refresh never prints and never asks. It never adds a skill either, because a
folder someone deleted on purpose has to stay deleted and refresh cannot tell
that from one never installed. A skill the tree has gained since arrives
through the startup page's install, with the same choice on the next launch.
Versions compare as versions, not as strings, so `1.5.0-rc.1 < 1.5.0 < 1.6.0`.

`GET /__sp/skills` and `POST /__sp/skills` are the app's only way to trigger a
copy outside of that automatic refresh. The POST takes project-relative
directories and answers which ones were written and which were skipped for
already having an unmarked folder. The startup page's chosen agent becomes
that POST once the server is up. There is no menu item for later, because the
page comes back on the next launch, and a different choice then adds that
agent's directory.

## What was deliberately left out

- Any toolkit detection, install prompt or version check inside the app. The
  skill text covers that now.
- A menu item to install skills later, and a record of which projects were
  already asked. The startup page comes back on every launch and defaults the
  same way, and the same answer again writes nothing, so there is nothing to
  remember and nothing to reopen.
- Detecting that a user edited a copy, by hash or otherwise. The answer, when
  someone loses an edit this way, is to rename the folder, not to merge into
  it, so there is nothing to detect for yet.
- Cleaning up a skill that gets renamed or removed from the tree. That is due
  when it first happens, not before.
- A separate `skills-lock.json`. The marker is inside the folder, and a second
  file recording the same fact is a second place for it to disagree.
- Symlinking into the project as an alternative mode.
- Committing the copies automatically. `git diff` is the user's decision.
- Automating any product's own trust prompt (Gemini CLI, Pi, Junie). One line
  in the post-install notes per product is all this does.
- Long-tail products with no writable project directory at all: ZeroClaw,
  Replit, Databricks, Superconductor, claude.ai's web client, Cowork.
- An `sp skills` subcommand. A CLI user's skills come from their own agent's
  plugin install. Refresh is all they need, and refresh is already in the
  server every `sp start` runs.

## Open questions

- **Whether the startup page grows past two rows.** It offers Claude Code and
  Codex, and the table behind it has 21. The other shape is the six this repo
  ships an install command for (adding CodeBuddy, Hermes, Pi, Trae) plus one
  row reading "something else, using `.agents/skills`". The code is the same
  either way. Whichever way it lands, it is a data change and not a mechanism
  change.
- **Whether any other product's parser rejects `metadata` in the
  frontmatter.** Claude Code and Codex do not. With a marked fixture installed
  for real, the first invoked it and the second listed it next to an unmarked
  control. The other nineteen have not been tried. A rejection there means
  moving the marker to a sidecar file instead, not abandoning it.
- **Whether refreshing on every server start is too eager.** It writes to a
  project the user did not, in that moment, ask to have written to. The
  directory itself was their earlier choice, and `git diff` is meant to be the
  whole notice. The more conservative version only refreshes from a server the
  app itself started, never from a bare `sp start`. This note's position is
  that the current rule is fine, but it has not been tried on a project with
  real reviewers yet.
- **Zed.** Zed is not in the research this note draws on, so it is in neither
  table above. Add a row once it has been looked at.
