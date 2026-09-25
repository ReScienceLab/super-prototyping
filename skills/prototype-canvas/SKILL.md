---
name: prototype-canvas
description: Start and operate the local tldraw design canvas that shows HTML artboards. Start the canvas app against a project's board folders, add or switch boards, place boards, images, video and notes anywhere on a canvas with sp canvas, and act on annotated screenshots of the canvas. Use when asked to open/launch the canvas, put a mockup, an image or a video on the canvas, annotate or draw on it, fix overlapping frames after a layout.json edit, or respond to a screenshot of the canvas with notes drawn on it.
license: Apache-2.0
compatibility: Requires the Super Prototyping app (macOS or Windows), which puts the sp command on PATH, and uv, which sp runs with. scripts/install.sh (install.ps1 on Windows) installs both. Where the app cannot run, sp start needs node or bun and a modern browser.
metadata:
  managed-by: super-prototyping
---

# Prototype canvas

A local tldraw app that discovers every `.html` file under
`canvases/<slug>/` and renders it as a shape. There is no shape map
to edit and no code change needed to add a board.

A project is a folder under `~/Documents/Super Prototyping`
(`PROTOTYPING_PROJECTS_DIR` moves it), and its boards are in that folder's
`canvases`. No folder anywhere else is ever a project, so deleting one from
the app can only ever trash what was made there. Working in another
repository, write the boards to
`~/Documents/Super Prototyping/<project>/canvases/<slug>/`, not to the repo.
The app is installed outside every project, so upgrading it never touches a
board you wrote. Every launch of the app
puts `sp`, `refkit` and `artgen` on PATH and links these skills into each
agent's skills directory.

## Start

```bash
sp open
```

That opens the Super Prototyping app on its home page, starting it if it is
not running, and prints the canvas address and the projects folder. It is the
way to show the user the canvas. A project's boards are at
`<address>p/<project>/`.

`sp` not found? Run `sh <this skill's dir>/scripts/install.sh` (Windows:
`powershell -ExecutionPolicy Bypass -File <this skill's dir>/scripts/install.ps1`).
It installs uv and the app and opens the app, which links `sp`. Then follow
`references/install.md` to put it on this shell's PATH and go back to the
task.

**`[super-prototyping:notice]` on stderr** from `sp`, `refkit` or `artgen`
means the app found a newer release. The line says what to do: finish the
step you are on, run `sp upgrade`, and tell the user what it printed. Do not
upgrade in the middle of a step, and do not stop the user's task over it.

`sp start` serves the canvas without the app, for where it cannot run: CI,
Linux, a remote box. On first run it fetches the canvas built for its version
into `~/.cache/super-prototyping/<version>/`, serves it on 127.0.0.1:5173
with node or bun, waits for the port to bind, and prints the address. A
checkout being worked on serves its own `canvas/dist` instead, rebuilt with
bun when a source is newer. It refuses a port that already answers rather
than reusing it, and says so when that port is the app's.

- **Boards** are `canvases` under a project in the projects folder, each
  project served at `/p/<name>/`. The address printed is the home page.
- **Port** with `--port N`, or `SP_CANVAS_PORT` for a machine that always
  uses another one. A port that already answers is never reused: it may be
  another project's canvas, so `start` refuses rather than showing you the
  wrong boards.
- **Two `sp start`s on two ports can run two canvases.** The session name,
  the log and the pidfile are all keyed by port, so a second `start` on a
  free port leaves the first one alone. `stop` and `status` take `--port` for the same
  reason, and `stop` only ever kills the canvas it started.
- `sp root` prints which tree it found, the app's or a checkout's, and with
  `-v` everywhere it looked. The first thing to run when the canvas is not
  what you expected. `sp status` says whether the app is running, and on
  which port.
- **It writes two directories**: that cache, and
  `~/.local/state/super-prototyping/` for its pidfile and log, the same on
  macOS as on Linux; the app keeps its own state beside them.
  `SUPER_PROTOTYPING_HOME` moves both under one root. `sp paths`
  prints them and every variable in use; `sp clean` removes the cache and
  `start`'s own files, never the app's.
- Deep-link a page with `?canvas=<slug>`, e.g.
  `http://127.0.0.1:5173/?canvas=notion-ios`, and one board of it with
  `#<file>` after that, e.g. `?canvas=notion-ios#02-search-ask-ai`: it opens
  in the inspector with the camera on it. Give the board link when pointing
  at one screen.
- **Read a board as a web page.** The "Export to Figma" button in the top bar
  opens every board of the page in one scrolling document, each at its own
  size, at `sheet.html?canvas=<slug>`; the button in the bottom right of the
  inspector's preview opens the one board it is showing, at
  `/board/<slug>/<file>.html`. Both are ordinary addresses serving the board's
  own HTML, so they can be linked, reloaded, and read by the browser
  extensions — a Figma importer, say — that refuse to work on a generated
  page. This is where to read type at the size it ships at, rather than at
  whatever the canvas is zoomed to. The sheet opens on what to do with it: the
  html.to.design browser extension, which captures a localhost page that the
  Figma plugin's own servers cannot reach, and the paste or plugin route from
  there into a file.

Keep it on loopback. This is a local design tool, not a service to expose.

A project with no boards yet opens on a notice naming the directory the
canvas resolved, rather than an empty grid: an empty boards folder and a canvas
pointed at the wrong one look identical otherwise.

**A folder created after boot appears on its own.** The server watches the
boards directory and rebuilds its index when a board folder or file is added
or removed. Rewriting a board swaps the new version in without reloading the
page, so a generator can be re-run with the canvas open while the person
keeps drawing on it. If a `?canvas=<slug>` link still
matches no page, the folder has no `.html` file in it yet — an empty folder is
not a board.

The styles panel is hidden by default; toggle it from the toolbar. Always-snap
is on by default. The setting is per browser, so turning it off in tldraw's
preferences menu sticks.

## Boards

One folder under the boards directory = one tldraw page; one `.html` file =
one shape. Switch with the page menu at the top-left; do not build a separate
switcher. `references/layout.md` has the `layout.json` schema, the caption
rules, and the 478 × 980 / sandbox constraints every artboard lives under.

**After editing `layout.json`, right-click the canvas and choose Force
refresh.** Shape creation is idempotent. It fills in what is missing but never
moves a shape that already exists, so inserting or reordering a row entry
leaves the old shape at its old position, overlapping the new one. Force
refresh deletes every `canvas-file` / `canvas-row-heading` /
`canvas-file-label` shape on all pages and rebuilds them from the current
files. Content-only edits to a placed file do **not**
need it: the canvas swaps the rewritten board in by itself.

## Place things on the canvas

`sp canvas` reads what is on a canvas and places shapes, images, video and
boards anywhere on it. The project's canvas open in the app runs each command
with tldraw's own editor and answers once the result is saved to
`canvas.json`, so a command that returned is on disk.

```bash
sp canvas <op> --canvas <slug> '<json>'     # - instead of the JSON reads it from stdin
```

The chat panel's agent already has the project and the port. From anywhere
else, add `--project <name>`, the name in the canvas's address (`/p/<name>/`).
A command needs the project open in the app. With none open it waits ten
seconds for one, then fails and says so: ask the person to open the project
(`sp open`, then the project) and run it again. Never write `canvas.json`
yourself instead.

| op | JSON | does |
|---|---|---|
| `get` | none | Every shape: `id`, `type`, `owner` (`layout`, `agent` or `person`), page bounds `x` `y` `w` `h`, and `parent`, `name`, `text` where it has them. `arrows` lists each arrow's `from` and `to`. |
| `create` | `{"shapes": [...]}` | Adds shapes, below. Answers `{"created": [ids]}`. |
| `update` | `{"shapes": [{"id", "type", ...}]}` | Changes your own shapes. `x`/`y` are the page bounds' corner, as `get` gives them. |
| `delete` | `{"ids": [...]}` | Deletes your own shapes. |
| `align` | `{"ids", "operation"}` | `left`, `right`, `top`, `bottom`, `center-horizontal`, `center-vertical`, `center`. |
| `distribute` | `{"ids", "operation"}` | `horizontal` or `vertical`, three ids or more. |
| `stack` | `{"ids", "operation", "gap"?}` | `horizontal` or `vertical`. |
| `pack` | `{"ids", "gap"?}` | Packs them into a block. |
| `frame` | `{"ids", "name"?, "padding"?}` | Wraps them in a new frame, 32 px of padding by default. Answers `{"frame": id}`. |
| `select`, `zoom` | `{"ids"?}` | Selects them, or moves the view onto them. No ids: `select` clears the selection, `zoom` fits the whole canvas. The canvas in front only. |
| `shot` | `{"ids"?}` and `-o <file>.png` | A PNG of them, or of the whole canvas. The canvas in front only. Look at it to check the result. |

What `create` takes:

- **Image or video**: `{"type": "image", "x", "y", "file": "<path on this machine>"}`,
  or `"video"`. `sp` copies the file into the canvas folder's `files/` first.
  Give `w` or `h` to scale it evenly, both to set its size, neither to keep
  its own.
- **Board**: `{"type": "canvas-file", "board": "<file>.html", "x", "y"}`, a
  board of this canvas folder, at its own size unless `w` and `h` say
  otherwise. Place only a board that no `layout.json` row lists, or it shows
  twice. One you placed stays out of the grid of unlisted boards.
- **Text, note, geo**: `{"type": "text", "x", "y", "text": "..."}`. Other
  props go under `props`, never `w`/`h` at the top level.
- **Arrow**: `{"type": "arrow", "x", "y", "from": "<id>", "to": "<id>"}`
  binds both ends, so it follows them. It cannot bind to a layout shape.
- An `id` of your own (`"shape:keyframes-title"`) lets a later command name
  the shape. Every command is checked whole first: one bad shape and nothing
  is written.

Work out coordinates from `get`, never guess them. To put something beside
a shape, start at its right edge plus 40 and check the new bounds against
every other shape's, moving down past any it would cover. The person's own
content is never to be covered.

What you create is yours to move and to change, and the person's to move and
resize too: images and video keep their proportions, a board stretches freely
(Shift keeps them). Content `layout.json` places stays locked. **When the
person has moved a shape of yours, theirs is the last word**: an update or a
layout op that would move it again fails with `moved_by_person`, listing each
shape's bounds `now`. Run `get` again and plan around where they put it. A
shape that only went along with the frame the person dragged has not moved.
`"force": true` overrides it; use it only when the person asked for the shape
to be put back.

Refusals come back as JSON on stderr with a non-zero exit, `{"error",
"message", ...}`: `not_agents` (not yours), `moved_by_person`,
`holds_persons_shapes` (the person dragged a shape of theirs into your
frame), `locked` (the person locked it), `not_current_page` (the person is
looking at another canvas), `exists`, `not_writable`, `bad_command`, and
`failed` (the page could not save it; say so rather than retrying blindly).
Your changes stay out of the person's undo.

Six keyframes of the person's screen recording, from `$WORK/frames`, put in
a frame beside it with an arrow from the recording:

```bash
sp canvas get --canvas video-notes
# {"id": "shape:rec", "type": "video", "owner": "person", "x": 0, "y": 0, "w": 720, "h": 405, ...}
sp canvas create --canvas video-notes - <<EOF
{"shapes": [
  {"id": "shape:k1", "type": "image", "x": 760, "y": 0, "w": 240, "file": "$WORK/frames/1.png"},
  {"id": "shape:k2", "type": "image", "x": 760, "y": 0, "w": 240, "file": "$WORK/frames/2.png"},
  {"id": "shape:k3", "type": "image", "x": 760, "y": 0, "w": 240, "file": "$WORK/frames/3.png"},
  {"id": "shape:k4", "type": "image", "x": 760, "y": 0, "w": 240, "file": "$WORK/frames/4.png"},
  {"id": "shape:k5", "type": "image", "x": 760, "y": 0, "w": 240, "file": "$WORK/frames/5.png"},
  {"id": "shape:k6", "type": "image", "x": 760, "y": 0, "w": 240, "file": "$WORK/frames/6.png"}]}
EOF
K='"shape:k1", "shape:k2", "shape:k3", "shape:k4", "shape:k5", "shape:k6"'
sp canvas pack --canvas video-notes "{\"ids\": [$K], \"gap\": 16}"
sp canvas frame --canvas video-notes "{\"ids\": [$K], \"name\": \"Keyframes\"}"
# {"frame": "shape:…"}
sp canvas create --canvas video-notes '{"shapes": [{"type": "arrow", "x": 0, "y": 0,
  "from": "shape:rec", "to": "shape:…"}]}'
sp canvas shot --canvas video-notes -o scratch/canvas.png
```

Then `get` again and check the frame's bounds against every other shape's
before telling the person it is done.

## What the person put on the canvas

Anything that is not a board or a `layout.json` picture or card is the
person's, what they pasted or dropped, or yours, what you placed with
`sp canvas` (`owner` in `get` says which). It is saved in the canvas folder:

- `canvas.json`: tldraw records (shapes, bindings, assets), sorted by id. A
  shape at the page's root has no `parentId`.
- `files/`: the files those records point at, by asset id. An asset's `src`
  is relative to the canvas folder (`./files/<name>`).

Read them to see what the person put there. A chip or a link named
`<slug>/canvas.json#<shape-id>` points at one record, and one named
`<slug>/files/<file>` points at one file. **Never edit either.** To answer a
sketch or a note, place a board or a shape beside it with `sp canvas`. What
it creates is stamped `meta.by: "agent"`, and every write refuses a shape
without that stamp.

Never let `sp canvas` commands inject arbitrary JavaScript, never load untrusted
HTML into a board, and never add `allow-same-origin` to the artboard iframe.

## Annotated screenshots

The review loop is a screenshot of the canvas with notes drawn on it, pasted
into chat. Boxes, arrows or numbers all work, from tldraw's own draw/text
tools or any image annotator.

1. Treat each annotation as an exact visual target, and say back what you read
   it as ("box 2: tighten the card gap") before touching anything.
2. Read the surrounding UI and the HTML source before editing.
3. Make the smallest source change that satisfies it.
4. Let the canvas pick up the board, then verify the same region visually.

Do not build an annotation-to-agent protocol. The screenshot is the bridge.

## The chat panel

The canvas has a panel on the left, in the app or under `sp start`: a
message to Claude Code or Codex — the mark on the header picks — Claude with
its permission prompts off and Codex in its workspace sandbox, and what it did
as it happens. The panel names the project and the canvas in front and tells
the agent, and points the agent at this skill before it touches a board
folder. A board it rewrites appears in place as any rewrite does, without
reloading the page.

A conversation is a session the agent resumes on every message, so it
remembers the ones before until New session starts another, and its history
button lists the sessions to carry one on. The agent runs in the session's own
folder, `.workspaces/<id>` under the projects folder, with the project in
front, if there is one, as a folder it may write: boards go in that project's
`canvases`, not in the working directory.

## State and persistence

The document lives in the browser's IndexedDB under `PERSISTENCE_KEY` in the
app's `src/App.tsx`. A board's identity is its path key, so renaming a folder
or a file orphans that board's shapes; Force refresh rebuilds them.
Ordinary layout drift is what refresh is for, not a persistence-key bump.

## Working on the canvas app itself

Only when changing the app, not when using it, and in a checkout of the
repo: `sp root`, run inside it, prints it.

```bash
cd "$(sp root)/canvas"
bun run lint && bun run test && bun run build
```

Then, in a fresh browser session: each board page loads with its frames,
headings and captions; the frames stay independently selectable; the inspector
opens on the board you click; Force refresh rebuilds a board cleanly.

Everything the canvas needs a server for lives in `canvas/server/`: `sp.ts`
answers `/__sp` and `/board` for one project, `projects.ts` mounts one of it
per project at `/p/<name>/` and makes or opens projects, the Vite dev server
mounts that for working on the app, and `main.ts` mounts it in front of `dist`
as the server `sp start` and the app run. Board discovery is `boards.ts`, served as `/__sp/index.json` and fetched
by the page before it loads, not an `import.meta.glob`. Bump
`PERSISTENCE_KEY` **only** when a change would leave existing documents
inconsistent with the code, such as a shape's props changing shape; a bump
discards every persisted hand-drawn annotation.
