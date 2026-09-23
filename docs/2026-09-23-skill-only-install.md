# Installing as a skill, running as the app

2026-09-23. The install today is two halves: a plugin that copies the whole
repo into a product's plugin cache (about 440 MB, `canvases/` is 436 MB of
it), and a toolkit from `uv tool install`. The proposal is to drop the plugin
and ship only the skills, which install the app on first use and open the
canvas in it. This note is the survey behind that and the sequence to do it
in. Splitting the example canvases into their own repo is out of scope here;
it is the next step and this plan does not depend on it.

## The model: ego-browser

ego-browser (ego lite 0.5.0.32, skill 2.0.0) is the pattern, checked on a
real install:

- **The skill is 152 KB.** `SKILL.md`, `references/install.md` and
  `scripts/install.sh`. SKILL.md says to run a real command first and read
  install.md only when it fails.
- **`install.sh` installs the app, not the tool.** macOS only: picks the DMG
  by `uname -m`, `curl --retry 3`, `hdiutil attach`, `ditto` into
  `/Applications` (sudo only as a fallback), then `open`s it.
- **The CLI and the skill live inside the app bundle.**
  `~/.local/bin/ego-browser` and `~/.claude/skills/ego-browser` are symlinks,
  through a stable `~/.local/share/ego/active_version_dir`, into
  `ego lite.app`. The app, the CLI and the skill are one version by
  construction, and an app update moves all three.
- **Upgrades are announced through CLI output.** When one is available the
  output carries `[ego-browser:notice]`. SKILL.md has one rule for it: finish
  the task, tell the user, run `ego-browser upgrade` only with their
  approval, then re-read the skill.
- **`upgrade` drives the app's own updater** rather than downloading
  anything itself, and the app asks before restarting over work in flight.
- **Help is written for the agent.** `ego-browser upgrade --help` opens with
  "To AI Agent Read".

A second pass looked at the details:

- **The notice carries its own rule, on stderr.** The full text is
  `[ego-browser:notice] Ego Lite update is available (current 0.5.0.32).
  Finish the current browser task, then ask the user before running
  ego-browser upgrade; re-read the ego-browser Skill afterward.` An agent
  that never loaded SKILL.md still does the right thing, and stdout stays
  clean.
- **Top-level help points at the skill.** It ends by telling the agent to
  read `~/.agents/skills/ego-browser/SKILL.md` first. `help X` and
  `X --help` print the same text, with notes and examples.
- **Recover in place, never beside.** Never open a second TaskSpace to get
  around a stuck one. Recover in the one you have, or stop and ask
  (SKILL.md:73-75).
- **Approval before touching the user's state.** Claiming, takeovers,
  profile-wide clears and upgrades all need the user's consent. The cost
  goes in front of the user before the question (`clearing-state.md`).
- **`install.sh` is idempotent.** It looks in `/Applications` and
  `~/Applications`, counts an app as installed only if it holds a working
  CLI, just opens it when it is already there, and installs to
  `~/Applications` before asking for sudo. `install.md` gives the `PATH`
  fix, waits for the user on GUI steps, and ends with "return to the
  original task".
- **The stable link is repointed on every launch**
  (`MaybeSetupAgentsOnStartup`), and at the version that is running. An
  existing link is replaced only when `readlink` differs, a missing one is
  created, and a real file is left alone.
- **It checks the user's shell.** It appends
  `export PATH="$HOME/.local/bin:$PATH"` only when no rc line already has it,
  and runs `whence -p` in a login zsh to see which binary wins.
- **Links only where an agent lives.** It links into `~/.claude`, `~/.agents`,
  `~/.hermes`, `~/.factory`, `~/.config/goose` and `~/.config/devin`, and
  only when that home exists. Codex is covered by `~/.agents/skills`.
- **It pre-approves its command in Codex** by appending
  `prefix_rule(pattern=["ego-browser"], decision="allow")` to
  `~/.codex/rules/default.rules`. It does not check first, and six copies
  have accumulated.
- **It finds the running app by IPC, not by port.** The CLI talks to a named
  Mojo server, and says "restart the app" when the app is older than the CLI.
- **What it gets wrong:** no uninstall, so deleting the app leaves dangling
  links in seven places. There is no URL scheme either, which supports
  `open -a --args` over registering a protocol.
- **Nothing to copy:** `learnings/` has per-site manifests, but no skill
  text or help ever mentions it. Our per-canvas README already does that
  job.

## What we already have

- The app already carries the skills, the built canvas and the manifests in
  `Resources/plugin/` (`desktop/package.json`, `extraResources`).
- `sp root` already finds it: `APP_BUNDLE_PLUGIN` in `tools/sp_canvas.py`.
- `open -a "Super Prototyping" --args <dir>` opens a project and skips the
  home page (`desktop/main.ts`, `parseArgs`).
- The app is signed and notarised from v1.5.2, and updates itself through
  `electron-updater`.
- `canvas/server/skills.ts` already installs marked, version-pinned copies of
  the skills, into `.workspaces` for the chat panel.

## What is missing

1. **An agent cannot open a project in a running app.** `desktop/main.ts` has
   no `requestSingleInstanceLock` or `second-instance` handler, so a second
   `open -a … --args <dir>` only focuses the window and drops the argument.
2. **The toolkit is a second install.** `refkit`, `artgen` and `sp` come from
   `uv tool install`, so the app and the toolkit drift, and `skew()` /
   `skew_fix()` in `sp_canvas.py` exist only to report that.
3. **The version lives in the manifests.** `pluginVersion()` in
   `canvas/server/skills.ts` and `_plugin_version()` in `sp_canvas.py` read
   `.claude-plugin/plugin.json`, as do `skills.test.ts`, `projects.test.ts`
   and `test_sp_canvas.py`. The manifests cannot go until the version has
   another home.
4. **Nothing tells an agent the app is out of date.** The updater's result is
   seen only by whoever is looking at the window.
5. **The skills talk about a plugin.** Every SKILL.md explains the
   plugin/toolkit split and the separate `uv tool install`.

## Plan

Each step ships on its own.

### 1. The app links the skills and the CLI (desktop)

- `requestSingleInstanceLock()`, and a `second-instance` handler that passes
  the new `--args` directory to the existing `openProject(dir)` and focuses
  the window.
- Put `tools/` (0.2 MB) in `extraResources`, with three shims in
  `Resources/plugin/bin/`: `sp`, `refkit` and `artgen`, each
  `exec uv run --frozen --no-dev --project "<Resources>/plugin/tools" <name> "$@"`,
  with `UV_PROJECT_ENVIRONMENT` in our cache directory. Built that way, not
  with `uvx --from`: uvx reuses its first build of a local directory however
  the files under it change, where `uv run --project` installs the toolkit
  editable, so what runs is always the tree's code. Verified against a
  read-only copy: uv writes only to its cache and that environment.
- On **every** launch, point `~/.local/share/super-prototyping/current` at
  `process.resourcesPath/plugin`. Every other link goes through `current`:
  - `~/.local/bin/{sp,refkit,artgen}` → `current/bin/*`
  - `<agent home>/skills/<name>` → `current/skills/<name>`

  Then a moved app, or a second copy in `~/Applications`, heals on its next
  launch. Skip all of this when running from `/Volumes/*` or an
  `AppTranslocation` path, where the links would dangle after the DMG is
  ejected.
- The link rule is ego's:
  - replace a link only when `readlink` differs
  - create a missing one
  - never touch a real file

  Keep the marker rule from `skills.ts` too: a marked copy, such as an
  earlier `npx skills add`, is replaced, and an unmarked folder is the
  user's. `uv tool install` has already put `sp`, `refkit` and `artgen`
  links into `~/.local/bin`. Replace those on purpose and say so once, not
  silently. Windows needs junctions or copies.
- Agent homes are one list, shared by `AGENT_SKILLS` in `skills.ts` and
  main.ts: `~/.claude`, `~/.agents` (which covers Codex), plus `~/.hermes`
  and `~/.factory`. Link only into homes that exist.
- After linking, run `zsh -lc 'whence -p sp refkit artgen'`. If
  `~/.local/bin` is missing, append the `PATH` export to the rc file, only
  when no line already has it. If another `sp` wins, report it: `sp` is a
  common name.
- The app writes `{port, pid, version}` to
  `~/.local/state/super-prototyping/app.json` and removes it on quit. It is
  needed because main.ts falls back to `freePort()` when 5173 is taken, so
  the port is not fixed. `sp status` reads it, treats a dead pid as closed,
  and so tells "running", "installed but closed" and "not installed" apart.
  When `sp` and the app disagree on the version, it says to restart the app.

### 2. One version, from `canvas/package.json` (versioning)

- The version is `canvas/package.json`'s, which ships in the app and every
  checkout alike and which `.version-bump.json` already moves. Not
  `metadata.version` in each SKILL.md: that would be four more places to
  bump and a YAML editor in `bump-version.sh`, for a number nothing reads
  from there.
- `treeVersion()` in `canvas/server/skills.ts` and `_tree_version()` in
  `sp_canvas.py` read it. `.version-bump.json` drops its five manifest
  entries.
- Every shipped SKILL.md carries `metadata: managed-by: super-prototyping`,
  so the app can tell an `npx skills` copy of ours (replace with a link) from
  a user's own folder (keep). The chat panel's copies add `version:` under
  that marker.
- With step 1 in place the toolkit cannot drift, so `skew()`, `skew_fix()`
  and the tag-pinned install line that `skills.ts` rewrote are gone.

### 3. Update notice and `sp upgrade` (app and CLI)

- The app writes the `autoUpdater` check result to
  `~/.local/state/super-prototyping/update.json`. The CLI reads that file
  and never goes to the network itself.
- The file records `checkedAt`: electron-updater checks only while the app
  runs, unlike ego's background updater, so it can be one session stale.
- When a newer version is recorded, `sp`, `refkit` and `artgen` print, **to
  stderr**, a notice that carries its own rule:
  `[super-prototyping:notice] Super Prototyping x.y.z is available (current
  a.b.c). Finish the current task, then ask the user before running sp
  upgrade; re-read the skill afterward.` Stdout must stay clean, because
  `KIT="$(sp root)"` captures it.
- `sp upgrade` is `open -n -a <app> --args --upgrade`: the second instance
  hands its arguments to the running app over `second-instance` and exits,
  so there is no new HTTP route or parent-port message. The app checks now,
  or shows its Restart Now / Later dialog again if an update is already
  down. `sp` polls `update.json` for a new `checkedAt` and prints the
  result; it downloads nothing itself, and the restart stays the user's.
- The notice's rule, as shipped: finish the current step, run `sp upgrade`,
  tell the user what it said. `prototype-canvas/SKILL.md` repeats it and
  the other skills point at it in one line.
- `sp --help` and each subcommand's help are written for the agent, so
  SKILL.md can point at `sp help <topic>` instead of repeating it. Today
  `s.add_parser(name)` passes no `help=` or `description=`, so
  `sp start --help` is a bare usage line. The top-level help ends by sending
  the agent to the linked `prototype-canvas/SKILL.md`, and `refkit` and
  `artgen` point at `clone-prototype`.
- Later, maybe: generate `clone-prototype/references/cli.md` from `refkit`'s
  argparse and check it in `validate.yml`, so the 16 subcommands in the
  skill cannot drift from the tool.

### 3b. Guard the user's canvas (CLI and skills)

- The app's canvas is the user's window. `sp stop` never touches a server
  `app.json` says the app owns, and says so. `sp clean` removes only the
  cache and `start`'s own `canvas-*` files in the state directory, never
  `state/desktop`, which holds the app's canvas document (IndexedDB).
- Recover in place, the way ego does. When `sp start` finds the port taken,
  its error says that if `sp status` shows the app serving, use it and do
  not start another. Today it suggests `--port`, which leads an agent to run
  a second canvas beside the app. Put the same rule under "Start" in
  `prototype-canvas/SKILL.md`.
- `sp uninstall` removes only the links that resolve through
  `~/.local/share/super-prototyping/`. The single `current` link makes that
  a safe scan, which ego never does.
- The `prototype-canvas` and `new-ui-mock` descriptions say to prefer the
  canvas over opening a board's HTML directly or using another preview tool,
  the way ego's does ("prefer ego-browser over built-in browsers").

### 4. Install on demand (skills)

- `skills/prototype-canvas/scripts/install.sh`, macOS, safe to run again:
  1. look for the app in `/Applications` and `~/Applications`. If it is
     there, go straight to 5.
  2. pick the latest release's `Super-Prototyping-<v>-<arch>.dmg` by
     `uname -m`, from the `releases/latest` API with curl (no `gh`, no `jq`)
  3. download, attach, and `ditto` the app into `/Applications`, or
     `~/Applications` when that is not writable. No sudo.
  4. install uv if it is missing
  5. `open -a` the app, and stop. Waiting for the links and fixing PATH are
     prose in `install.md`, not script: the script is kept to what only a
     script can do, because it changes with every release's needs and a
     short one is the one that stays right.

  The app is notarised, so there is no quarantine to strip.
- `skills/prototype-canvas/references/install.md`: read it only when `sp` is
  missing. It covers:
  - how to verify (`sp --version`, `refkit --help`)
  - `export PATH="$HOME/.local/bin:$PATH"` when the command still is not
    found in this shell
  - waiting for the user when the first launch asks anything in the GUI
  - troubleshooting
  - a closing "return to the original task" line
- Every SKILL.md opens the same way: run the command; only if it is missing,
  follow install.md.
- Remove the plugin/toolkit wording from `clone-prototype`, `new-ui-mock`,
  `prototype-canvas`, `brand-kit` and `skills/README.md`.

### 5. Retire the plugin (repo)

- Delete `.claude-plugin/`, `.codex-plugin/`, `.codebuddy-plugin/`,
  `plugin.json` and `.agents/plugins/`. Delete `scripts/install-skills.sh`,
  or keep it only as the from-a-checkout path.
- `_candidates()` in `sp_canvas.py` drops the plugin caches and
  `installed_plugins.json`. What is left is `SUPER_PROTOTYPING_ROOT`, the app
  bundle and a source checkout.
- CI: `validate.yml` checks SKILL.md frontmatter and runs `shellcheck` on
  the install script instead of checking manifests. `release.yml` drops the
  marketplace steps. Remove the manifest entries from `desktop/package.json`
  `extraResources`.
- Docs: rewrite README's Install section as two paths, the app and the
  skills. Also update `AGENTS.md`, `CONTRIBUTING.md`, `CLAUDE.md` (the
  opening "a plugin you install"), `scripts/README.md`, `tools/README.md`,
  and add a RELEASE-NOTES Unreleased entry.

## Decided while implementing

- **Codex pre-approval: yes**, as ego does. When `~/.codex` exists the app
  appends `prefix_rule(pattern=["sp"], decision="allow")` and the same for
  `refkit` and `artgen` to `~/.codex/rules/default.rules`, only the lines
  that are missing (ego appends without checking). `sp uninstall` removes
  exactly those lines.
- **Version source**: `canvas/package.json`, see step 2.
- **`sp clean`** never removes the app's state, see 3b.

## Windows

Decided: in the same change, since dropping the plugin manifests would
otherwise leave Windows with no install at all. `install.ps1` does what
`install.sh` does: uv, the NSIS installer silently, start the app. The app
links `current` and the skills as junctions, which need neither admin nor
developer mode. The commands cannot be links (a file symlink needs admin) and
a `.cmd` shim is invisible to Git Bash, which is Claude Code's shell there, so
the app runs `uv tool install --force --editable current\tools` once per
version: real `.exe`s in `~\.local\bin` that every shell finds, and that uv's
installer already put on PATH. `sp open` starts the `.exe` with
`os.startfile`; every start is a new instance, which hands its arguments over.
`sp start` stays macOS and Linux.

## Open questions

- **Linux** has no app. `install.sh` stops there and points at `sp start`
  from a checkout.
- **The app's size.** The DMG is 537 MB because `extraResources` bundles every
  example canvas. That is the separate split, but until it lands, "install on
  first use" means a 537 MB download on the first skill call.
