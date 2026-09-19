# Running as an app, installing as a package: where we are and what to do

2026-09-19. Four questions arrived together and share one answer. Can the
canvas run on a computer as a web-based app, the way Figma is an app rather
than a plugin inside something else? Can the project be installed into a
user-level directory through Homebrew and the like? How does OpenDesign
package itself for Mac, Windows and Linux? And how do comparable canvas and
AI design products get people running out of the box on their own machines?
The first two come down to the same missing piece: today nothing can run the canvas except the Vite dev server,
started from a source checkout that a plugin install happens to contain. Ship
a prebuilt canvas with a small server of its own, and both the app and the
package follow. This note is the survey behind that claim, with the sequence
to do it in.

## What we have today

The install is two commands, from README's table. The plugin (the `skills/`
tree plus the whole checkout, 151 MB full or 6.7 MB sparse) lands in each
product's own plugin cache. The toolkit lands wherever `uv tool install` puts
its venvs, from a `git+https://…@tag#subdirectory=tools` URL, and shims
`refkit`, `artgen` and `sp-canvas` onto PATH. Its runtime dependencies are
Pillow and numpy only. `refkit shoot` and `diff` call Chrome at a hard-coded
macOS path (`tools/refkit.py:45`).

`sp-canvas start` (`tools/sp_canvas.py:243-338`) does not serve anything
itself. It searches for a checkout of the app across every product's plugin
cache, or `SUPER_PROTOTYPING_ROOT`, or the current git repo, recognising one by
`canvas/package.json` naming `prototyping-canvas`. It then requires Bun, runs
`bun install --frozen-lockfile` on first use (228 MB of `node_modules`, with
native `sharp`), and launches `bun run dev` in tmux or as a detached process
with a pidfile in `$HOME`. The `canvas/dist` that `bun run build` produces is
never touched by any command.

Everything the canvas does beyond drawing lives in `configureServer` of
`canvas/vite.config.ts` (lines 605 to 1581), which is dev-server only. There is
no preview-server counterpart, so `bun run preview` and any static host serve
none of it:

| responsibility | lines | size |
|---|---|---|
| same-origin guard on `/__sp` | 612-618 | 7 |
| static board files | 624-647 | 24 |
| `/__sp/shoot`, spawning `refkit` | 653-731 | 79 |
| `/__sp/board-status`, writing `layout.json` | 736-782 | 47 |
| `/__sp/comments`, writing `comments.json` | 806-845 | 40 |
| `/__sp/clone-canvas` | 850-897 | 48 |
| `/__sp/agent/*`, spawning `claude` or `codex`, SSE, images | 899-1431 | 533 |
| recursive watcher with batching | 1436-1580 | 145 |

Board discovery is a generated virtual module (lines 117 to 603) imported
synchronously at module scope by five files. In dev it emits `/@fs` imports;
in a build it emits each board as a real file under `board/<slug>/` and swaps
the loaders to `fetch`. The hosted canvas on Cloudflare Pages is that build,
with the boards baked in from `mockups/canvases` at build time, and every
writable feature gated client-side on `import.meta.env.DEV`: chat panel, clone,
status, comments (which fall back to `localStorage`). The Pages build command
is dashboard-side and not in the repo.

The good news in that table: the hard logic is already extracted into plain
modules that a different server can import unchanged. `agentRun.ts`,
`agents.ts`, `boardWatch.ts`, `boardStatusEdit.ts`, `claudeStream.ts` and
`svgSignature.ts` are about 960 lines with their own tests. The Vite plugin is
mostly routing and process glue around them.

## What a local app needs

A "localhost app" is a production build served by a small server that also
answers `/__sp`, watches the boards, and opens the browser. Against this
codebase that means:

- **A runtime board index.** The virtual module is the one piece a prebuilt
  bundle cannot keep: a build bakes in the boards of the machine it was built
  on. Discovery becomes a JSON endpoint and the five module-scope imports
  become an async bootstrap. This is the largest real change, around the 156
  lines of `load()` plus the five call sites.
- **A live channel.** Reload and status pushes go over Vite's HMR socket today
  (`server.ws.send`, `server.hot.send`, `import.meta.hot.on` in
  `canvasLibrary.ts:372-377`). A server-sent event stream replaces it, about
  thirty lines each side. The agent endpoints already use SSE.
- **No module graph.** Three `moduleGraph.invalidateModule` calls become
  "do not cache".
- **A capability flag that is not `import.meta.env.DEV`.** Eight sites use it
  to mean "there is a server". A localhost app is a production build with a
  server, so the flag has to come from a runtime probe of `/__sp` or a build
  define.
- **`sharp` at build time.** Brand thumbnails are the one native dependency;
  make them when the bundle is built, not when it is served.
- **A server process.** The `/__sp` handlers are TypeScript and spawn
  processes, so the natural host is a small Node or Bun script bundled with
  `dist`. Rewriting them in Python inside `sp-canvas` would keep the install to
  one runtime but means porting 533 lines of agent streaming that has tests in
  TypeScript. Not worth it first; revisit if the Bun requirement proves to be
  the thing that stops people.

Nothing conceptual breaks. Spawning `claude` and writing boards are local
operations already, and the same-origin model from
`docs/2026-09-17-canvas-chat-panel.md` holds because the server still binds
loopback.

## Three shapes, and the pick

**A localhost app, served by `sp-canvas`.** The list above, then
`webbrowser.open()` in `cmd_start`. Everything in `src/` stays. The Bun
requirement moves from the user's machine to CI. This is the pick: it is the
prerequisite for every packaging channel below and the smallest diff that
makes the canvas an app.

**A desktop shell, Tauri or Electron.** Wraps the localhost app exactly, so all
of the above is still required, and adds a native build matrix, signing and
notarisation, and per-platform `sharp`. It buys a dock icon and drops the port
handling. Do it after the localhost app, if and when the canvas needs to stop
looking like a dev server, not instead of it.

**A hosted authoring app.** Every `/__sp` handler needs the user's filesystem
and PATH, and the agent runs with permissions off. Hosting that means
per-user containers, authentication and a security model that replaces the
loopback-only one wholesale. That is a different product. The hosted canvas
stays what it is, a read-only showcase.

## What OpenDesign does, and what to borrow

OpenDesign (`~/Developer/GitPlayground/open-design`, version 0.22.1) is the
closest neighbour: a design canvas with a TypeScript daemon that spawns the
same agent CLIs. It ships three surfaces over one backend. `od` is a CLI that
starts an Express daemon on 127.0.0.1:7456, serves a static export of the web
app from it, and opens the browser with `open`, `xdg-open` or `cmd /c start`.
The desktop app is Electron 41 with the same daemon inside. Docker runs the
same daemon headless. The web app has no server logic of its own; in dev a
Next rewrite proxies `/api`, `/artifacts` and `/frames` to the daemon, in
production the daemon serves the static files next to those routes. That is
the localhost app above, and it confirms the prefix contract is what makes dev and
prod share one backend.

Its distribution is narrower than its README suggests. There is no npm
publish (`package.json` is private, `od` runs only from a built checkout), no
PyPI, no Homebrew formula or cask, and no Linux release asset by default
(`ENABLE_LINUX_X64` gates an AppImage; the README says to run from source).
What it does ship: signed and notarised DMGs for both Mac architectures, an
NSIS per-user installer for Windows, a Docker image on GHCR, and a curl script
that only installs its MCP server into an agent. Releases are built by four
explicit CI jobs (`macos-14`, `macos-15-intel`, `windows-latest`,
`ubuntu-latest`) with electron-builder, notarised with a retrying
`notarytool` hook, and uploaded to Cloudflare R2 with GitHub Releases as a
curated subset. A weekly cron cuts a release branch and a follow-up workflow
bumps main. All of that is a team's worth of release engineering, and most of
it exists to serve the Electron path.

Cross-platform is where it has paid its dues, and four pieces transfer to us
nearly verbatim:

- **Windows spawning.** `packages/platform/src/command.ts` (about thirty
  lines): a `.cmd` shim must go through `cmd.exe /d /s /c "..."` with
  `windowsVerbatimArguments`, and any `%VAR%` in a user prompt has to be
  rewritten to `"^%"` or `cmd.exe` expands it. `claude` and `codex` install as
  `.cmd` shims on Windows, so our agent endpoint hits both bugs the day it
  runs there.
- **PATH from a GUI launch.** `wellKnownUserToolchainBins()` in
  `packages/platform/src/toolchain.ts` appends `~/.nvm/versions/node/*/bin`,
  `~/.bun/bin`, `/opt/homebrew/bin`, `%APPDATA%\npm` and twenty more to PATH,
  because an app launched from the Dock or a `.desktop` file inherits a PATH
  without any of them. When nothing resolves, the searched directories are
  shown to the user as a diagnostic. Not needed while `sp-canvas` starts from
  a shell; needed the moment a desktop shell or `open -a` exists.
- **One data-directory contract.** `OD_DATA_DIR` is resolved once, every
  other path derives from it, and subprocesses receive it back. Their
  `AGENTS.md` forbids any component from inferring it from app name, port or
  `userData`. With a Python toolkit and a TypeScript server both writing
  state, one env var read by both sides is what stops them drifting.
- **Probes run in a temp directory.** A capability check like `codex --version`
  gets `cwd: os.tmpdir()` so it cannot drop a lockfile into the user's repo.

Also worth copying once we ship a Windows build: per-user NSIS install with no
elevation, so no UAC prompt and uninstall leaves data alone; and on Linux
`--appimage-extract-and-run`, because FUSE is missing often enough.

What not to borrow: the custom `od://` Electron protocol (only there so a
respawned sidecar on a new port is transparent), electron-builder config
generated at runtime, R2 as the primary store, `asar: false`, the weekly
release train, and the Next three-output-mode juggling that a Vite SPA served
from one `dist` folder removes outright. Nothing in it helps the Python half;
PyPI is the standard route there.

The lesson for cross-platform: the CLI-plus-browser path is what OpenDesign
actually supports on all three OSes, because it needs only Node and a
browser. The desktop installers are macOS and Windows only, and Linux is the
lane they left switched off. So for us, step 3 in the sequence below, done
with the four transferable pieces above, is the cross-platform story. A
desktop shell adds installers, not platforms.

## How comparable products ship, and where we stand

Two surveys, one of canvas and whiteboard tools (Excalidraw, tldraw, draw.io,
Penpot, AFFiNE, Obsidian Canvas, Rnote, Onlook, Pencil, Lunacy) and one of
AI design tools (Figma Make, Paper, Pencil, Stitch, Lovable, v0, Bolt,
Magic Patterns, Subframe, Uizard, Relume, Claude Design). Sources are the
products' own docs and download pages; the full per-product notes are in the
session, this keeps what changes our plan.

**The tools with the least setup share four habits.**

- No account for the local mode. draw.io, Excalidraw, Obsidian, Rnote, Lunacy
  and AFFiNE's desktop app open to a blank canvas with no login; sign-in gates
  only sync or collaboration. The two that demand an account even locally,
  Penpot and Pencil, are also the two with the most setup steps.
- One download or one command. A signed installer, a `brew install --cask`,
  a `winget install`, or `npm create tldraw@latest`. Docker Compose stacks
  (Penpot, Onlook self-host) are the outlier and document the most steps.
- Plain files on disk as the source of truth. Obsidian's `.canvas` JSON,
  draw.io's XML, tldraw's `.tldraw` bundle. Penpot's Postgres volume is the
  exception and its own docs warn to back it up.
- AI is additive, never gating. AFFiNE's bring-your-own-key, Pencil and
  Subframe reusing an existing Claude or ChatGPT login, tldraw offline letting
  an already-authenticated agent CLI call into the running app. Friction
  appears exactly where a key or account is required to open the canvas at
  all (Onlook self-host needs three keys).

**Among the AI tools, local is rare.** Stitch, Lovable, v0, Bolt, Magic
Patterns, Uizard, Relume and Claude Design are hosted only; their "local" story
is a git sync of the generated repo. The ones that run on the user's machine
are Pencil (desktop, extension and CLI sharing one engine, on all three OSes,
authenticating through the user's existing Claude or OpenAI login), Paper
(desktop on all three OSes), Subframe (macOS only, driving the user's own
Claude Code or Codex), and tldraw offline (tldraw's own closed-source desktop
app: brew cask, winget id, dmg, exe and AppImage, with a local HTTP API that
Claude Code and Codex call into). tldraw offline is the closest precedent for
what we are: the same canvas engine, the same agent CLIs, the same
loopback-only model, and its README carries the same warning we would have to,
that an agent with access to the app can read and edit documents.

**Where we already stand.** On three of the four habits the canvas is already
right, by accident of being a plugin: there is no account, boards are HTML and
`layout.json` in the user's repo, and the agent runs through the `claude` or
`codex` CLI the user has already signed into, so there is no key to manage.
Nothing in the surveys argues for a hosted tier, a proprietary file, or a
second login, and three products show that adding one costs users.

The habit we fail is the first-run path. Today it is: install the plugin in
one product, `uv tool install` from a git URL, have Bun on PATH, have tmux or
accept a detached process, run `sp-canvas start`, then open a URL by hand.
Pencil's is `npm install -g @pencil.dev/cli`; tldraw offline's is
`brew install --cask`. That gap, not any feature, is what stops out-of-the-box
use, and it is what the sequence below closes: a prebuilt bundle so Bun is
not needed, one package that installs both halves, and a browser that opens
itself.

**Cross-platform, honestly.** The toolkit has only ever run on macOS. `refkit`
calls Chrome at a fixed `/Applications` path, `sp-canvas` prefers tmux, and
the agent endpoint spawns `claude` the POSIX way, which on Windows means the
`.cmd` shim problem OpenDesign solved. Linux is a small step: browser
discovery in `refkit` and nothing else. Windows is a real one, and the
products that ship there did it with a packaged app and a `winget` id, not a
CLI. So: Linux with the localhost app, Windows with the desktop shell, if and
when it is built.

## User-level install and Homebrew

**Formula, not cask.** This is a CLI with web assets, which Homebrew routes to
a formula; casks are for `.app` bundles.

**A tap of our own, not homebrew-core.** Core's bar
(<https://docs.brew.sh/Acceptable-Formulae>) wants a stable tag with a sha256,
which we have, but also a DFSG-compatible licence for everything shipped and no
proprietary runtime. Two things stand in the way: tldraw's SDK licence, which
is free with a watermark and paid without, and `refkit`'s hard dependency on
Chrome. A third-party tap (`brew tap ReScienceLab/tap`, a repo named
`ReScienceLab/homebrew-tap`, <https://docs.brew.sh/Taps>) needs neither
resolved. Submit to
core only after a licence read says tldraw clears it, and after `refkit`
discovers a browser rather than assuming one.

**How the formula looks.** The Python pattern from
<https://docs.brew.sh/Language-Specific-Formulae>: `depends_on "python@3.x"`,
one `resource` per transitive dependency written by
`brew update-python-resources` (few, with only Pillow and numpy), and
`virtualenv_install_with_resources`. The canvas comes in as a second
`resource` pointing at a prebuilt bundle attached to the GitHub Release, so the
formula depends on no JavaScript toolchain at all. `bun` is in homebrew-core
(1.4.2 today, checked with `brew info`), so building at install time is
possible, but building in CI once is the pattern every release-automation
action assumes and it keeps the formula's install to a download. The tag
spelling `super-prototyping--v1.4.1` needs a `livecheck` block with a regex
(<https://docs.brew.sh/Brew-Livecheck>), and `brew bump-formula-pr` or
`dawidd6/action-homebrew-bump-formula` can open the tap PR from our own
`release.yml` right after `gh release create`.

**Other channels, by effort.** Publishing `super-prototyping-tools` to PyPI
with trusted publishing is the smallest lift of all, since `pyproject.toml`
already declares the scripts, and it gives `uv tool install` and `pipx` a
version rather than a git URL. It only helps `sp-canvas` once the canvas
bundle ships inside the wheel or is fetched by tag. `npm i -g` would make the
canvas the entry point, but `canvas/package.json` is private with no `bin`, and
it would split one install across two ecosystems. The root `install.sh` is
the curl installer, for every product (`2026-09-19-curl-installer.md`). A
single static binary would mean rewriting both halves; out of scope.

**Practices to adopt as part of this.** Pidfiles and logs go under
`~/.local/state/super-prototyping/`, not `$HOME`. The canvas bundle goes
under `~/.cache/super-prototyping/`, never into a formula's Cellar path,
which Homebrew treats as immutable. The section on home-directory files
below has the full decision and its sources. Keep the plugin-versus-toolkit skew check
at `sp-canvas start`; a formula that installs both halves at one version
removes the drift the two-command install has today. Give `refkit` browser
discovery, since a packaged tool that only works with Chrome at one macOS path
will be the first bug report from Linux.

## Files in the home directory

A packaged app raises the question of what it leaves in `$HOME`. Today the
answer is two loose dotfiles, `~/.super-prototyping-canvas-<port>.pid` and
`.log` (`tools/sp_canvas.py:36-41`), plus browser storage for chat history and
comments' offline fallback. No configuration file exists; every input is a
flag or an environment variable. Three surveys, of the specifications and
well-known CLIs, of packaged apps and package managers, and of configuration
file practice, say that is close to right and name what to fix.

**The specifications.** The XDG Base Directory spec (0.8,
<https://specifications.freedesktop.org/basedir/latest/>) splits per-user
files four ways: config (`~/.config`), data that is not regenerable
(`~/.local/share`), state such as logs and history (`~/.local/state`), and
cache (`~/.cache`). It says to create a directory only when writing a file
into it, never eagerly. Apple's File System Programming Guide maps the same
split onto `~/Library/{Application Support,Caches,Logs}` but is written for
bundled apps and never mentions command-line tools. Windows splits roaming
`%APPDATA%` from machine-local `%LOCALAPPDATA%`. Python's `platformdirs`
returns the Apple paths on macOS unless an `XDG_*` variable is set; Node's
`env-paths` does the same.

**What the tools our users already have do.** Two camps, and they agree on
the part that matters:

| tool | layout | relocate with |
|---|---|---|
| uv | `~/.config/uv`, `~/.cache/uv`, `~/.local/share/uv`, on macOS too | `UV_CACHE_DIR`, `UV_TOOL_DIR` |
| gh | `~/.config/gh` on every Unix, `%APPDATA%` on Windows | `GH_CONFIG_DIR` |
| bat | moved from `~/Library` to `~/.config/bat` on request (PR #491) | `BAT_CONFIG_PATH` |
| pipx | `platformdirs`, so `~/Library/…` on macOS | `PIPX_HOME` |
| Claude Code | one tree, `~/.claude/` | `CLAUDE_CONFIG_DIR` |
| Codex | one tree, `~/.codex/` | `CODEX_HOME` |
| Bun | one tree, `~/.bun/` | `BUN_INSTALL` |
| npm | `~/.npmrc`, `~/.npm`; XDG requested since 2014, still open | |

The newer Unix-first CLIs (uv, gh, bat) use the XDG directories on macOS as
well as Linux. The agent CLIs use a single dot-directory. Every one of them
exposes one environment variable that relocates everything, which is the
property that matters for CI, containers and testing. The counter-examples
are npm, the AWS CLI and Docker, each with a decade-old open issue about
clutter in `$HOME`, and pipx, whose move to `platformdirs` was reverted twice
on macOS and Windows before it stuck.

**Configuration files.** None of git, gh, uv, cargo, npm or Codex writes a
config file on first run; each reads one only if the user made it. ripgrep
does not even look unless `RIPGREP_CONFIG_PATH` names a file. clig.dev's rule
is that a program may not modify configuration the user did not ask for, and
that a file is for values stable across every user of the program, while a
flag plus an environment variable covers a per-machine value like a port.
Precedence is the same everywhere: flag, then environment, then project
file, then user file, then default. When a file does exist it is TOML for
uv, cargo and Codex, chosen for comments; JSON for Claude Code, which has an
open request for comments. Wizards (`gh auth login`, `aws configure`) exist
only for a one-time credential exchange.

**Packaged apps and uninstall.** Electron's `userData` and Tauri's
`appDataDir` both resolve to one identifier-scoped directory under the OS's
per-user root, so the identifier chosen today fixes where a future shell
looks. Homebrew formulas have no `zap`; only casks do, and a cask's `zap`
lists exactly the paths under `$HOME` the app created (VS Code, Docker
Desktop and tldraw's casks are the models). `brew uninstall` of a formula
removes the keg and nothing else, and the Cellar is not a place for runtime
writes. Cleanup is opt-in everywhere: `--zap`, NSIS's
`deleteAppDataOnUninstall`, winget's client-side purge; Apple has no
mechanism at all. A Developer-ID app is not sandboxed unless it opts in, and
it must not, because the App Sandbox blocks reading arbitrary project
directories and spawning CLIs from PATH.

**The decision.** No configuration file. A port is a per-machine value and a
flag plus `SP_CANVAS_PORT` covers it; the boards directory already has
`PROTOTYPING_CANVASES_DIR`. If a second setting that a flag cannot reach
ever appears, it becomes a TOML file that is read if present and never
written by us. What we do write:

| what | where, by default | why |
|---|---|---|
| downloaded canvas bundle, one directory per version | `$XDG_CACHE_HOME/super-prototyping/<version>/` (`~/.cache/…`) | regenerable; Homebrew's Cellar is read-only in practice |
| pid file, log | `$XDG_STATE_HOME/super-prototyping/` (`~/.local/state/…`) | state, not config; today they are loose in `$HOME` |
| Windows | `%LOCALAPPDATA%\super-prototyping\{cache,state}\` | machine-local, never roaming |

Same paths on macOS as on Linux, following uv, gh and bat rather than
`platformdirs`' Apple default: the users of this tool have `~/.claude` and
`~/.cache/uv` already, and one convention across the two Unixes is simpler
to document and to `zap`. One variable, `SUPER_PROTOTYPING_HOME`, relocates
all three directories under a single root, the way `CODEX_HOME` and
`CLAUDE_CONFIG_DIR` do. The Python toolkit computes the paths and hands them
to the server it starts as environment variables; the server never derives
them itself, which is OpenDesign's `OD_DATA_DIR` rule. Directories are
created at the first write, per the spec. Nothing is written into
`~/.claude` or `~/.codex`; those are read to find the plugin and nothing
more. Browser storage keeps only conveniences: chat history, the queue, the
last board.

Two commands come with this, modelled on `uv cache dir` and
`uv cache clean`: `sp-canvas paths` prints every directory and variable in
use, and `sp-canvas clean` removes the cache and state directories. The
formula gets a `caveats` line naming them, because a formula cannot `zap`.
The identifier `super-prototyping` is fixed now, so a later cask's `zap` and
a later Tauri `identifier` point at the same folders and nothing migrates.

## The sequence

1. **Attach a canvas bundle to every release.** In the tag job of
   `.github/workflows/release.yml`, after the tag is pushed: `bun install`,
   `bun run build` with the example boards left out, tar `canvas/dist`, and
   `gh release upload`. Add `canvas/package.json` to `.version-bump.json` so
   the bundle carries the version too. Nothing user-facing changes yet.
2. **Publish the toolkit to PyPI** from the same job, with trusted publishing.
   README's install line becomes `uv tool install super-prototyping-tools`.
3. **Make the canvas a localhost app.** The runtime board index, the SSE
   channel, the capability probe, thumbnails at build time, and a small
   server script bundled into `dist` that serves it and answers `/__sp`.
   `sp-canvas start` fetches the bundle for its version into the cache dir,
   or uses the checkout's `dist` when there is one, starts the server and
   opens the browser. The dev server stays for working on the canvas itself.
   This is the one step with design in it, and it deserves its own note.
4. **A tap with one formula**, resources for Python, a resource for the
   bundle, livecheck for our tag spelling, and an auto-bump step in
   `release.yml`.
5. **Linux.** Browser discovery in `refkit` (look for Chrome, Chromium and
   Edge on PATH and in the usual places, macOS included), and a test run of
   steps 3 and 4 on Ubuntu. Homebrew on Linux installs the same formula.
6. **A desktop shell, with a Homebrew cask and a winget id**, only if steps 3
   to 5 leave people asking for a Dock icon or for Windows. That is the point
   to lift OpenDesign's Windows spawning and PATH augmentation, and to follow
   tldraw offline's channel list. A homebrew-core submission waits on the
   tldraw licence read either way.

Steps 1 and 2 are a day and change no behaviour. Step 3 is the work, and it
is bounded: the server logic already lives in tested modules, and the diff is
the glue around them plus the board index. Steps 3 and 4 together turn the
first run into `brew install ReScienceLab/tap/super-prototyping` followed by
`sp-canvas start`, which is the shape every low-friction product in the
survey has.
