# What a person puts on a canvas is saved in the canvas folder

2026-09-24. Reviewed by two adversarial passes (correctness against the code and tldraw 5.4;
scope against the rules in CLAUDE.md); what they changed is at the end.

A project is local-first: its folder is the project. Until now only the agent's work was in it.
The boards, `layout.json` and `comments.json` were on disk. Anything a person pasted onto a canvas
lived in the browser's IndexedDB, where the agent could not see it, where it was lost with the
browser profile, and where Git never saw it. This puts it in the canvas folder too, so a canvas
can be read, versioned, copied, and later served from someone else's machine.

## The rules

1. **Two owners, one page.** The agent's output is boards and `layout.json`'s pictures and cards.
   `layout.json` lays it out, it is locked, and every load rebuilds it from the files. Everything
   else on the page is the person's: whatever they pasted or dropped there. *(Since
   `2026-09-24-agent-free-layout.md`, the agent also places shapes of its own anywhere, through
   the page. They are saved in `canvas.json` stamped as its, and are not locked.)*
2. **Anything tldraw can paste can be pasted.** That covers images, videos, SVG, text, links and
   tldraw's own shapes. tldraw's default handlers decide what each becomes. What tldraw can show
   but not edit is shown and not edited.
3. **A copy of the agent's work is the person's.** ⌘C on a board or picture copies its link, as
   it does today. Pasting that link onto the canvas makes an image the person owns. For a board,
   the server draws it first, the same drawing the chat gets. An image is what tldraw edits:
   move, resize, crop, rotate, draw over. A board's HTML was never editable on the canvas, and
   the copy is not HTML.
4. **The agent reads everything and changes only its own.** It reads the person's content from
   the folder. It does not move, edit or delete that content. To answer a sketch, it adds
   something beside it.
5. **Everything is addressable.** The person's content gets the same hover **+** (add to chat)
   and the same ⌘C (copy link) that boards and pictures have.
6. **A new canvas is made on the spot.** The strip's **+** makes an empty canvas called
   "Untitled" and puts its tab into inline rename.

## On disk

```
canvases/<slug>/
  layout.json      the agent's: name, ground, rows
  NN-*.html        the agent's boards
  comments.json    review threads
  canvas.json      the person's content, as tldraw records          (new)
  files/           the files those records point at                 (new)
    <asset-id>.png   a pasted or dropped image, video or file
```

`files/` is its own folder and not `assets/`. `assets/` is the generator's input, and a change
under it reloads the page (`boardWatch.ts`). A paste must not reload the page it was made on.

A folder counts as a canvas once it has a board **or** a `layout.json` (`boardIndex`). That is
what lets an empty canvas exist.

### `canvas.json`

```json
{
  "tldraw": { "schemaVersion": 2, "sequences": { "com.tldraw.shape.geo": 10, "…": 0 } },
  "records": [
    { "typeName": "asset", "id": "asset:…", "type": "image", "props": { "src": "./files/asset-….png", … } },
    { "typeName": "binding", "id": "binding:…", "fromId": "shape:…", "toId": "shape:…", … },
    { "typeName": "shape", "id": "shape:…", "x": 1200, "y": 40, … }
  ]
}
```

- `tldraw` is `store.schema.serialize()`. On load, records go through
  `schema.migrateStoreSnapshot`, so a file written today still opens after a tldraw upgrade.
- `records` are the page's shapes that are not library shapes, the bindings from them, and
  the assets they use. They are sorted by id and written as two-space JSON with a trailing
  newline, so a Git diff moves line by line, as with `comments.json`.
- **A shape at the page's root has no `parentId`.** Page ids are minted per browser, so the folder
  is the page. The field is put back before the record reaches the store, the way
  `comments.json` does with `pageId`. The file never holds a made-up value: tldraw's validator
  accepts only `page:…` or `shape:…`. A shape inside another shape keeps its `shape:…` parent.
- **An asset's `src` is relative to the canvas folder.** It is `./files/<name>`, or
  `../<other-slug>/files/<name>` for a file pasted from another canvas. It is never a data URI,
  which would put megabytes in a diff, and never an absolute URL, which would tie the file to one
  host. In the store it is `./board/<slug>/files/<name>`, the address the server serves it at
  relative to the page, so it passes tldraw's `srcUrl` validator, which wants `./` or `/`, and
  loads with no `resolve` of its own. An image pasted before this change keeps its data URI.
- A binding to a library shape is kept, since those ids are deterministic
  (`shape:canvas-file:<path>`). One whose end is gone is dropped on load.

## Load and save

This is the pattern `canvasComments.ts` already uses.

- **On load the file wins.** For each of the project's pages that has a `canvas.json`, its
  non-library shapes, bindings and assets are replaced with the file's, inside
  `store.mergeRemoteChanges`. That keeps the load off the undo stack and out of the save
  listener. Examples, the welcome page and the hosted build keep the browser's copy, as today.
- **A page with no file yet is saved on the first pass.** The page writes out whatever this
  browser had on it, and nothing is lost.
- **Every change is saved.** `store.listen(…, { source: 'user', scope: 'document' })`, debounced
  by 500 ms, serializes each project page, and one whose body changed is posted to
  `POST __sp/canvas-content { slug, file }`. An emptied page keeps the file with no records:
  no file means a page never saved, whose browser copy is written out, so removing it would
  bring back what was deleted in every other window. The page is the only writer, and the
  agent's bridge edits go through the same store and the same debounce, so the person's writes
  and the agent's writes cannot race each other.
- **An edit from outside reloads the page.** When a `git pull`, a hand edit or another window
  writes `canvas.json`, the watcher classes it as `"content"` and reloads, and the file wins on
  the reload. The server remembers the bytes it last wrote, so the page's own save is not echoed
  back as a reload. Between two windows the last write wins, as with `comments.json`.

## Pasted files

Pasted files go through tldraw's own path, the `TLAssetStore` on the store (`assets` in
`storeOptions`, App.tsx):

- `upload(asset, file)` on a project page posts the bytes to
  `POST __sp/canvas-file?slug=&name=<asset-id>.<ext>`. The server streams the body to
  `files/<name>.part` and renames it into place, so a file of any size costs no memory and a
  cut-off upload leaves no half file under the real name. On a page with no folder of its own,
  it inlines as today.
- Images and videos (mp4, webm, mov) are taken, and anything else is refused with 415. A served
  page has no size cap (`maxAssetSize` is `Infinity`): the files stay on this machine.
- `/board` serves `files/*` with `Content-Length` and answers `Range` requests, so a long video
  seeks without being read whole.
- Nothing is deleted automatically. Deleting a shape and then undoing it has to find its file
  still there. A file no record points at stays until someone removes it, and Git shows it.

## Pasting a link

tldraw calls a pasted URL `url` content. One handler sits in front of tldraw's default:

- A link to one of this project's boards or pictures becomes an image the person owns, as in
  rule 3. The bytes go through the asset store above as a dropped file would, via
  `putExternalContent({ type: 'files' })`.
- A link to one of the person's own shapes duplicates it (`getContentFromCurrentPage`, then
  `putContentOntoCurrentPage`). This is needed because ⌘C copies a link rather than tldraw's
  JSON, so without it, copy and paste of the person's own content would stop working.
- Anything else goes to tldraw's default, which makes a bookmark.

## Add to chat, and links

- **The hover + and the selection + answer for a person's shape.** They already do for a board or
  a picture. The inspector does not: a click on a person's shape still selects it.
- **The chat gets a picture of the shape.** `editor.toImage` draws it, and it is sent as
  `{ kind: "board", name, src }`, where `name` is where the agent reads it:
  `<slug>/files/<file>` for a pasted file, `<slug>/canvas.json#<shape-id>` for anything else.
- **A person's shape has a link.** It is the canvas's address with `#<shape-id>`. ⌘C copies it,
  pasting it into the chat attaches it, and opening it zooms to the shape.

## The agent: reads everything, changes its own

- The `prototype-canvas` skill says so in plain words. `canvas.json` and `files/` are the
  person's: read them to see what is on the canvas, never edit them, and answer by adding a
  board, or a shape through the bridge, beside the person's content.
- **The bridge enforces it.** `create` stamps `meta: { by: "agent" }`. `update` and `delete`
  refuse any id without that stamp. The agent's bridge shapes are saved in
  `canvas.json` like everything else, and the stamp tells them apart.
- Files are not guarded. A deny rule for Claude Code's `Edit` tool would not stop its `Write`
  tool or a shell, and other agents have no such rule. The skill states the rule, and Git can
  restore what an agent changes anyway.

## A new canvas from "+"

- `POST __sp/new-canvas` makes `canvases/untitled/` (`untitled-2`, … when the name is taken),
  holding a `layout.json` of `{ "name": "Untitled" }`, and answers `{ slug }`. It takes the
  change off the watcher. The page that asked stores the slug in `sessionStorage` and reloads
  itself, since only a reload shows a changed set of canvases, and lands on the new tab with its
  name selected.
- Enter or blur posts `POST __sp/canvas-name { slug, name }`, which sets `name` through
  `withLayoutKey`, the same as the ground, and broadcasts `layout`. Escape keeps "Untitled".
  Double-clicking a tab renames it later.
- The folder keeps its slug. Renaming the folder would re-key its page and break every link to it.
- "No canvases yet. Ask the agent for one." is gone.

## Later: self-hosting and sharing

Nothing here assumes one browser on one machine:

- **All state is files in the project folder, and every reference in them is relative.** A
  project can be copied, committed, cloned or served elsewhere and open the same. The browser
  keeps only per-viewer state: camera, open panel, the comment handle.
- **Every write is an HTTP call under the project's base URL.** There are four, `canvas-content`,
  `canvas-file`, `new-canvas` and `canvas-name`, and `sameOrigin` guards each one today. An
  authenticated server puts its check at that same boundary, and the page does not change.
- **Live multi-user editing is tldraw's `TLSocketRoom`.** One per page, with a storage adapter
  that reads and writes this same `canvas.json`. The file format stays fixed, and the
  transport can change without touching it. That is also where last-write-wins between two
  writers ends. Until then it is the same as `comments.json`.

## Not in this change

- **Drawing tools and the style panel stay off.** `Toolbar` and `StylePanel` are still `null`.
  Paste and direct manipulation are the scope. A drawn shape would be saved like a pasted one, so
  turning the tools on later needs nothing from this design.
- **IndexedDB stays as the store's local copy.** With every document record of a project page
  now on disk, dropping it for session-only state is a later simplification.

## What the review changed

- `src` was a bare `drawing/…`, which fails tldraw's `srcUrl` validator on load. Root shapes
  carried `"parentId": "page"`, which fails `parentIdValidator`. Both are fixed above.
- Server-side garbage collection of files raced undo: delete an image, wait for the save, undo,
  and the file was gone. It is cut.
- The `base`-hash precondition with 409-and-merge, the live `drawing` SSE event, and a separate
  copy endpoint are cut. `comments.json` shows last-write-wins plus a reload is enough here.
- `--disallowedTools` is cut, because it covers `Edit` only and not `Write` or a shell.
- A copied board was to be an unlocked board that could not be edited inside. It is now an image,
  which tldraw can edit, and which needs no second kind of board shape.
- `drawing.json` and `drawing/` are renamed, since drawing tools are off and the names read as ink.
- One file per owner was proposed and not taken: the page is the only writer, so there is no race
  for it to remove.
