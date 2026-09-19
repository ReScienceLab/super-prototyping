# The canvas runs as a localhost app, not a dev server

2026-09-19. `sp-canvas start` used to boot Vite in the plugin's cache
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
- **A bundle download.** `sp-canvas start` builds `canvas/dist` in place
  when it is missing or older than the sources, which needs `bun` exactly as
  the dev server did. Fetching a prebuilt `canvas-dist.tgz` per release is
  #106 and #109, and lands once the release workflow attaches one.
- **A desktop shell, hosted authoring, a second data-directory variable.**
  `PROTOTYPING_CANVASES_DIR` and `PROTOTYPING_PROJECT_DIR` are resolved once
  in the launcher and passed to the server and, through it, to every agent it
  spawns. That is the OpenDesign `OD_DATA_DIR` discipline with the two names
  this plugin already had.

## Borrowed from OpenDesign

The launcher keeps its pidfile and log under the platform's state directory
(`~/Library/Application Support/super-prototyping`, `$XDG_STATE_HOME`,
`%LOCALAPPDATA%`) rather than in `$HOME`, opens the browser once the port
answers, and the capability probes (`claude --version`, `codex --version`)
run with the temp directory as their working directory, so a CLI that reads
project configuration on start cannot be steered by the project it is asked
about.
