# Installing, upgrading and removing

Read this when `sp`, `refkit` or `artgen` is not found, when one of them
prints a `[super-prototyping:notice]` line, or when the user asks to upgrade
or uninstall.

Super Prototyping installs as one thing, the app (macOS or Windows). Every launch
of it links the three commands into `~/.local/bin` and these skills into
`~/.claude/skills`, `~/.agents/skills`, `~/.hermes/skills` and
`~/.factory/skills` (each only where that directory's agent home exists), all
through `~/.local/share/super-prototyping/current`, which it points at
itself. A moved or updated app repoints the links on its next launch. The
commands run the toolkit with `uv run`, so they need uv.

## Not found

1. Run the installer. It is safe to run again: it opens an app already in
   `/Applications` or `~/Applications` instead of downloading one.
   ```bash
   sh <this skill's dir>/scripts/install.sh
   # Windows, from Git Bash or PowerShell:
   powershell -ExecutionPolicy Bypass -File <this skill's dir>/scripts/install.ps1
   ```
   On macOS it copies the latest release's app into `/Applications` (or
   `~/Applications`), installs uv if it is missing, and opens the app, which
   links `sp` a few seconds later. If `~/.local/bin/sp` is not there after
   half a minute, ask the user to look at the app's window. On Windows it
   installs uv first, then the app, and the app installs `sp`, `refkit` and
   `artgen` with uv on its first launch, which takes a minute: wait for
   `~/.local/bin/sp.exe`.
2. Put `~/.local/bin` on this shell's PATH. The app adds it to `~/.zshrc` or
   `~/.bash_profile` for new shells (uv's installer does it on Windows), but
   the shell you are in started before:
   ```bash
   export PATH="$HOME/.local/bin:$PATH"
   ```
3. Check `sp --version`, then go back to what the user asked for. Installing
   is a step on the way, not the task.

On Linux or a remote box there is no app. There, work from a checkout of the
repo with `sp start`.

## The notice

Any of the three commands may end with one line on stderr:

```
[super-prototyping:notice] Super Prototyping 1.6.0 is available (this is 1.5.3). Finish the current step, then run `sp upgrade` and tell the user what it says.
```

The app checks for updates while it runs and writes what it found to
`~/.local/state/super-prototyping/update.json`; the commands read that file,
so the notice needs no network. Do what the line says, at
the next break in the work: never mid-step, and never instead of the user's
task.

## Upgrading

```bash
sp upgrade
```

asks the running app (starting it if needed) to check now, and prints what it
found: up to date, downloading, or downloaded. A downloaded update installs
when the user clicks Restart Now in the app's dialog, or the next time the app
quits. Tell the user which one it is; the restart is theirs to choose, since
it closes the canvas they may be looking at.

## Uninstalling

```bash
sp uninstall
```

removes the command and skill links that resolve through `current`, the PATH
lines the app added to the shell rc files, the Codex `prefix_rule` lines it
added, and `current` itself. Anything the user put in those places is left
alone. The app would link everything again on its next launch, so the user
also moves `Super Prototyping.app` to the Trash. Projects, boards, and the
directories `sp paths` lists are not touched.
