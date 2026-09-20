# The canvas runs as a localhost app, not a dev server

2026-09-19. `sp start` used to boot Vite in the plugin's cache
directory and hand the user a development server: HMR websocket, module
graph, `/@fs` imports of files outside the app root, `sharp` compiled on
first install. Issue #108 asked for the thing a user actually needs, a small
local server that serves a built canvas and the handful of endpoints that
write into a project. This note records what moved where, and the two
things that had to be true for the move to be small.

## The rule

**Everything under `/__sp` and `/board` is one server module, and both the
dev server and the shipped app mount it.** `canvas/server/sp.ts` holds the
same-origin guard, the board index, the live channel, board serving, the
five write endpoints and the watcher. `vite.config.ts` mounts it as a
middleware; `canvas/server/main.ts` mounts it behind a static file server
and is what `bun run build` bundles into `dist/server.mjs`. Nothing is
duplicated, and the rule for a new endpoint is where it goes.

## Two things that had to change for the app to be static

**1. The board index is fetched, not imported.** `virtual:canvases` was a
module Vite generated at load time, and every consumer imported it at module
scope. A static bundle cannot regenerate a module, so the index is JSON at
`/__sp/index.json`: the server scans the boards directory per request
(`boardIndex()` in `canvas/server/boards.ts`, which remembers each asset's
hash by size and mtime so a rescan is a stat per file), the build writes the
same shape into `dist` with `served: false`. The three
entries (`main.tsx`, `sheet.tsx`, `brand.tsx`) fetch it, then `import()` the
app, so everything that used to read the module at module scope reads
`canvasIndex()` at module scope instead and no consumer had to become async.
Board HTML, icons and brand images are addresses under `/board/<slug>/`,
served from the boards directory or emitted by the build, so one URL scheme
does for both.

The index carries `served`, which is the whole of "is there a server behind
`/__sp`". It replaces the eight `import.meta.env.DEV` sites that used to mean
it: the chat panel, the status badge, the clone button, the attach buttons,
where comments land. A hosted build says `false` and stays read-only.

**2. Live updates are server-sent events, not HMR.** `/__sp/events` is an
`EventSource`: `reload` for a board written, added or removed; `layout` with
the new layout.json for an edit that repaints without a reload. The same
two messages the watcher and the status endpoint used to send over Vite's
websocket, and the browser reconnects on its own. The module graph
invalidation went with it: nothing is transformed any more, so nothing can
be stale.

## What was deliberately left out

- **Brand thumbnails at runtime.** `sharp` runs only in the build, for the
  hosted site's own boards. The localhost app draws a project's brand images
  at their original size. That is a bandwidth saving the local case does not
  need and a native dependency the shipped server must not have.
- **A desktop shell, hosted authoring, a second data-directory variable.**
  `PROTOTYPING_CANVASES_DIR`, `PROTOTYPING_PROJECT_DIR` and
  `SUPER_PROTOTYPING_ROOT` are resolved once in the launcher and passed to
  the server and, through it, to every agent it spawns. That is the
  OpenDesign `OD_DATA_DIR` discipline with the names this plugin already had.
- **A build in the plugin directory.** `bun` is needed only in a checkout
  being worked on. An install runs the bundle below.

## Which app `sp start` runs

The release workflow attaches `canvas-dist.tgz` to every release (#106): one
top-level `dist/` holding the built page and `server.mjs`. The launcher
fetches the one for the toolkit's own version into
`$XDG_CACHE_HOME/super-prototyping/<version>/` on first start and runs it
from there with node or bun, so a plugin install needs no toolchain at all.
One directory per version, unpacked beside its name and renamed into place,
so a version is whole or absent and `sp clean` removes them all. A
download that fails says so, with the URL, and stops; it does not fall back
to a build the user did not ask for. The bundle runs from a directory with no
checkout above it, which is why the server takes the plugin root from
`SUPER_PROTOTYPING_ROOT` rather than deriving it from its own path: the root
is where the skill an agent is pointed at lives.

A checkout with `canvas/node_modules`, or with a `dist` already built, is a
developer's. It serves its own `dist`, rebuilt when a source is newer. The
bundle's version is the plugin manifest's, not the installed toolkit's: the
manifest is what `claude plugin tag` tagged, spelled as the tag is, where the
toolkit reports PEP 440's `1.5.0rc1` for the tag's `1.5.0-rc.1` and no
release is spelled that way. `start` already says when the two drift.

## Files in the home directory

Two directories and nothing else, following the survey in
`2026-09-19-standalone-app-and-install.md`: the cache above, and
`$XDG_STATE_HOME/super-prototyping/` for the pidfile and log. The same paths
on macOS as on Linux, as uv, gh and bat do, rather than `platformdirs`'
`~/Library`: the people running this have `~/.cache/uv` already, and one
convention across the two Unixes is one to document and one to remove. No
Windows path yet: `stop` and `clean` need `ps` and process groups, so the
launcher does not run there, and the survey's `%LOCALAPPDATA%` answer waits
for the desktop shell.
`SUPER_PROTOTYPING_HOME` puts both under one root, the way `CODEX_HOME` and
`CLAUDE_CONFIG_DIR` do. A directory is created at the first write into it,
so `status` on a fresh machine leaves no trace. No configuration file: the
port is `--port`, then `SP_CANVAS_PORT`, then 5173. `sp paths` prints
the two directories and every variable that moves one; `sp clean`
removes them, and refuses while a pidfile names a canvas that is still
running, since that pidfile is the only way `stop` would find it.

## Borrowed from OpenDesign

The launcher opens the browser once the port answers, and the capability
probes (`claude --version`, `codex --version`) run with the temp directory
as their working directory, so a CLI that reads project configuration on
start cannot be steered by the project it is asked about.
