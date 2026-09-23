# A project's cover is a path, not a picture

2026-09-23. A project's card on the home page showed a strip of its first canvas's screens. It
now shows one cover, like a Figma file's thumbnail: the first canvas's own cover by default, or
whatever someone right-clicked on the canvas and set as cover.

## What is stored

Only a choice is stored, in `<project>/project.json`:
`{ "cover": { "path": "<slug>/<file>", "box"?: [x, y, w, h] } }`. The default is never written
down. It is worked out from what is already there, the first canvas in strip order and that
folder's `cover` and `coverBox` in `layout.json`, so it cannot fall out of step with them. A
choice whose file has gone falls back to the default rather than showing a hole.

No pixels are stored. A saved PNG would be a second copy of the board that goes stale with every
regeneration, and would need a place in the project, a name and a rule for when to redo it. The
card asks the server's existing `/__sp/shoot` for a capture of the path instead, which is cached
by the board's mtime, and falls back to a scaled iframe where there is no Chrome. The hosted build
has no projects, so it has no covers to shoot.

The file sits at the project's root rather than in a canvas folder, because the cover is the
project's: one per project, and moving it from one canvas to another should not edit two
`layout.json`s. It is a new file rather than a key in some existing one because there is no
project-level file yet. Add the next project-level setting to it.

## One rule, both sides

`canvas/src/cover.ts` resolves a cover from the index and the file and reads nothing else, so the
server (`projects.json`, and the check on `POST /__sp/project-cover`) and the page use the same
code. The server accepts a path only if resolving it gives it back, which also keeps it inside
the project's canvases.

## Cropping

A cover keeps its whole `box` and may grow up to 10% past fitting it, the crop taking the rest
off the long side, so a phone keeps its status bar and home indicator and a wide board fills the
card. An element chosen as cover is that `box`, so the crop centres on it with the board around.
