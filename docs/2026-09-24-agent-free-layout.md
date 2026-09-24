# The agent places things anywhere on a canvas, through the page

2026-09-24. Issue #171. Reviewed with Fable 5.1 over three rounds before any of it was written.

Until now the agent's only way onto a canvas was a board, laid out by `layout.json` in rows and
locked there. It could not put six keyframes of the person's recording beside it, frame them and
draw an arrow from the recording. Now it can, from a shell, with `sp canvas`:

```
agent's shell  (SP_PROJECT, SP_CANVAS_PORT: set by server/agent.ts when it starts the agent)
  └─ sp canvas <op> --canvas <slug> '<json>'                  tools/sp_canvas.py
       ├─ an image or video: uploaded to POST /__sp/canvas-file first, `file` becomes `src`
       └─ POST /p/<project>/__sp/canvas {slug, command}       server/sp.ts
            └─ SSE `command` to the canvas page opened last   (/__sp/events?bridge=1 only)
                 └─ dispatch(slug, command)                   src/agentBridge.ts
                      ├─ editor.run(…, { history: "ignore", ignoreShapeLock: true })
                      ├─ saveNow(slug): canvas.json written, or the command fails
                      └─ POST /__sp/canvas-reply {id, ok, result | error}
```

What it places is stamped `meta.by: "agent"`, saved in `canvas.json` beside the person's content,
and **not locked**: the person moves and resizes it like anything of their own. What `layout.json`
places stays locked.

## No lock on the page

The first idea was to lock the canvas while the agent works on it. It is the wrong model:

- A lock has to be released. An agent in a terminal has no end of turn the page can see, and one
  that crashes holds it until a lease runs out. That is a lease, a timeout, and a page that sits
  frozen in the meantime.
- #172 went the other way on purpose: a board the agent rewrites is swapped in place rather than
  reloading the page, so the person can keep drawing while the agent writes.
- tldraw has no document lock. `isLocked` is per shape and `isReadonly` is a viewing mode. Its own
  multiplayer is optimistic: the server orders changes and a client rebases.

So it is optimistic here too. The page runs one command at a time, and **the person's move wins**:
each shape carries `meta.placed`, its page bounds after the agent last wrote it. An update or a
layout op that would move or resize a shape whose bounds no longer match is refused with
`moved_by_person` and the bounds it has now. The agent reads the canvas again and plans around
it. `force` skips the check, for when the person asks for a shape to be put back.

- **Page bounds, not `x`/`y`.** Framing a shape rewrites its `x`/`y` into the frame's space and
  leaves its page bounds alone, so a check on `x`/`y` would call every framed shape moved.
- **A shape the person has moved keeps its old `placed`** through any later write of the agent's
  that is not `force`d, so the check stays armed. An arrow bound at both ends is never checked:
  its bounds follow its ends, not the person.
- **Text and style changes are not checked.** They move nothing.
- A frame of the agent's that the person has dragged one of their own shapes into is not moved or
  deleted (`holds_persons_shapes`): that would move or delete the person's shape with it.

## The page runs every command

Only a tldraw `Editor` places a shape the way the page would: bindings, geometry, a text shape's
size, schema validation. It needs a DOM, so it runs in a page and not in the server. The server
therefore writes nothing: it hands the command to the canvas page and hands back the page's
answer, and the page saves through the same path as every edit of the person's. One writer per
canvas, as `2026-09-24-canvas-content-on-disk.md` set up.

- **The page opened last**, and only a canvas page: the sheet and the brand kit listen to the same
  events and run no commands, so a canvas page asks with `?bridge=1`. The app has one canvas frame,
  so that is nearly always the only one.
- **Answered once it is on disk.** The page answers after `saveNow(slug)`, which writes the canvas
  now and fails if the server does not take it. A command that returned is in `canvas.json`.
- **Commands before the editor.** The event stream opens before the editor mounts, and an
  `EventSource` keeps nothing it has delivered, so a command that arrives in between waits in
  `canvasIndex.ts` for the bridge.
- **120 s** before the server gives up on an answer, which is refkit's own limit for a shot: a
  `shot` of six boards nobody has drawn yet renders them one after another. A page that closes
  first fails its commands at once.
- **The agent's changes stay out of the person's undo stack**, as a remote change does in tldraw's
  multiplayer. When the person undoes a drag of a shape the agent has moved since, tldraw puts back
  the whole record from before the drag, `placed` included, so the check still agrees with the
  geometry.

## With no canvas open

The command waits 10 s for a canvas page, which covers a reload, a Force refresh and a tab being
opened. Then it fails with a 409 saying which project, and that the person has to open it. The
home page does not count as closed: the canvas frame is only hidden, and it still runs commands.

What is left is a real case: the chat belongs to the app, not a project, so a conversation can
turn to a project that is not the one on screen; and an agent in a terminal may have run only
`sp start`. The options, and why not:

- **The server writes `canvas.json`.** A second executor, rewriting tldraw's geometry and bindings
  in Node, and `get` could not measure a text or a drawn shape.
- **Queue the command until a page opens.** The agent would get no `get`, no `moved_by_person`, and
  so no loop of reading, placing and checking.
- **Switch the frame to that project.** It takes the screen from the person.
- **A hidden page for that project.** It works, until the person opens the same project and there
  are two writers, which needs a merge. Worth it when placing on another project is common.

Failing plainly costs the person one click, and keeps one executor and one writer. Boards are not
affected: the agent still writes a board's HTML to any project.

## Resizing follows tldraw

Images and video keep their proportions and a board resizes freely, Shift keeping its
proportions, as tldraw does by default. Resizing an image freely would need a gesture of its own:
tldraw reads `isAspectRatioLocked` once when a drag starts, and Shift and Alt are taken.

## A board in a shot

`CanvasFileShapeUtil` had no `toSvg`, so a board in `editor.toImage` came out blank: it is an
`<iframe>`. It now asks `/__sp/shoot` for the board drawn at its size, which serves `sp canvas
shot` and the person's own export alike. A shot is of the canvas in front of the person only, as
are `select` and `zoom`: the agent never switches the person's view.

tldraw waits for every shape's picture together, and past `maxExportDelayMs` leaves all of them
out, not just the late one. Its 5 s is less than a changed board takes to draw, so the canvas
waits the server's 120 s instead, and a board that cannot be drawn is left out of the image
rather than failing the rest.

## Not in this change

- `x`/`y` in `layout.json`. A board the agent placed freely is a shape in `canvas.json`, and one
  position per board is enough; such a board is left out of the grid of unlisted boards.
- A `place` op. `get` gives every shape's bounds; the skill says how to find free space.
- `embed` and `bookmark` shapes. Nothing asked for them, and they export blank.
- The blue and green rings on a board the agent rewrote, for a board it placed freely.
