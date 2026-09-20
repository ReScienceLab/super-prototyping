# The canvas ships as a macOS app, around the localhost server

2026-09-19. Issue #111 asked for a window around the canvas that `sp
start` serves, for the person who does not live in a terminal, and said to
ship a dmg only if people asked. The maintainer decided the dmg is worth doing
now. This note records which shell was picked and what the app has to keep in
step with the command line.

## The rule

**The app is the server plus a window, and the server is `dist/server.mjs`
unchanged.** `desktop/main.ts` forks the same bundle the release attaches as
`canvas-dist.tgz`, on the same port precedence, with the same three
environment variables, and points a window at `http://127.0.0.1:<port>/`.
Nothing under `canvas/` knows whether a window or a browser is looking at it,
and `/__sp` has one implementation. A feature the app needs is a feature the
server gets, and the command line gets it the same day.

## Electron, not Tauri

Tauri makes a smaller bundle, but the server is a Node program: `server.mjs`
spawns agents, watches the boards directory and serves files, and Tauri would
have to carry it as a sidecar with a Node runtime beside it, or grow the
endpoints again in Rust, which is the duplication the rule forbids. Electron
has Node built in, so the server runs as a `utilityProcess` of the app: one
runtime, no sidecar, one place the port comes from. The cost is a dmg of about
130 MB per architecture instead of about 10, which the people this is for will
not weigh against opening a terminal.

## What it shares with the command line, on purpose

- **The directories.** `SUPER_PROTOTYPING_HOME`, `XDG_STATE_HOME` and the
  `~/.local/state/super-prototyping` default resolve by the rule in
  `sp_canvas.py`, and Electron's own profile goes under `<state>/desktop`
  rather than `~/Library/Application Support`. Nothing migrates and
  `sp clean` removes it. No App Sandbox, because the app reads boards
  from whichever project directory the user picks.
- **The port.** `--port`, then `SP_CANVAS_PORT`, then 5173. The canvas
  document lives in IndexedDB under the origin, so a stable port is what keeps
  a user's canvas from one launch to the next; a free port only when 5173
  already answers, which is a canvas the command line started. A port that was
  asked for and is taken is an error before anything starts, not a second
  server racing the first: Electron loses a utility process's early output
  when a window is being created as it starts, so the app never opens its
  window before its own server answers.
- **The plugin root.** The app does not ask for it; it is built with one
  inside it, `Contents/Resources/plugin`, the same skills-plus-canvas tree a
  Homebrew or product install has, and `SUPER_PROTOTYPING_ROOT` points the
  server at it so an agent the canvas spawns is pointed at the same skills
  the app just installed into the project (an env value already set still
  wins, for a developer pointing the packaged app at a checkout). The toolkit
  is not in the dmg and the app no longer mentions it: `uv tool install` is
  its installer on every product, and the skills the app installs tell the
  agent to run it, pinned to the app's own version. A GUI app does not
  inherit the shell's PATH, so `~/.local/bin`, `~/.bun/bin`,
  `/opt/homebrew/bin`, `~/.cargo/bin` and `/usr/local/bin` are appended to it
  first, and the server and every agent it spawns inherit the result.

## What was deliberately left out

- **Remembering anything.** No last project, no window position, no
  configuration file: the command line has none and the app is not where one
  starts. `open -a "Super Prototyping" --args /path/to/project` skips the
  picker.
- **A universal binary, a cask, a version-skew dialog.** Two dmgs from one
  runner; a cask once there is a signed release to point one at; and no
  dialog comparing the app's version against the toolkit's — the pinned
  `uv tool install` URL the app writes into each skill it copies is what
  keeps the two in step now, detailed in the next day's note. `sp start`'s
  own skew note still covers a terminal user who mixes an old toolkit with a
  newer plugin checkout.
- **A retrying notarisation hook.** electron-builder's own `notarize: true`
  runs `notarytool submit --wait` and `stapler staple`. OpenDesign's wrapper
  answers a failure this pipeline has not had.

## Signing

Signing and notarisation turn on when the release job finds its secrets and
stay off otherwise, so a checkout with nothing configured still builds an
unsigned `.app`. `release.yml` documents the secrets by name; their values,
and every identifier around them, live outside the repo.
