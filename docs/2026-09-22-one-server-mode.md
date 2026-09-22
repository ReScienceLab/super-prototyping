# One server mode

2026-09-22. The canvas server had two modes. The app started it with a projects folder and got
every project at `/p/<name>/`, a home page over them, and the examples beside each
(`2026-09-21-home-page.md`). `sp start` started it with one boards folder and got that project at
`/`, no home page, no examples, and no way to open another project without a second server on a
second port. The page had to know which it was on, and a feature the app got did not reach the
command line the same day, which `2026-09-19-desktop-shell.md` said it must. The second mode was
the older one, kept because nothing had removed it.

## One mode

`canvas/server/main.ts` always serves a projects folder: `~/Documents/Super Prototyping`, or
`PROTOTYPING_PROJECTS_DIR`. Every folder in it is a project at `/p/<name>/`, served by one
`createSpServer` each, mounted by `canvas/server/projects.ts`. A project from outside the
folder is opened by name the same way, by `--open <dir>` on the command line, or over the
utility process's parent port for the app, and stays listed while its folder exists. `/` goes
to the project opened last, with the query string kept, so `sp start`'s printed address and
its deep links still work; with nothing opened it is a 404 that says how to open one. The
examples are always `<plugin root>/canvases`, which every install has: the plugin is
the whole repository, and the app ships the folder under its plugin root.

`sp start [dir]` runs exactly that, with `--open` for the directory named or the current one,
and hands the server only `SUPER_PROTOTYPING_ROOT`. `--canvases` and `PROTOTYPING_CANVASES_DIR`
are gone: a project's boards are its `canvases`, spelled once in the server
(`CANVASES` in `boards.ts`) and once in `sp_canvas.py`, so moving them is one edit each.
`PROTOTYPING_CANVASES_DIR` remains a build-time knob only, for the index the build writes into
`dist`, which the release workflow points at an empty folder. `PROTOTYPING_PROJECT_DIR` and
`PROTOTYPING_EXAMPLES_DIR` are gone with the mode that needed them.

## Making and opening projects is the server's

New project and Open folder were Electron's: a dialog and an IPC channel, so a browser tab could
not have them. They are now two endpoints under the same-origin guard every write has:
`POST /__sp/projects` with a name makes `<projects dir>/<name>/canvases`, validated as
the app's dialog did, and `POST /__sp/projects/open` shows the OS's own folder picker, by
`osascript` on macOS, PowerShell on Windows and `zenity` on Linux, and answers 501 with what to
do when there is none. Both take the agent to install skills for, and answer the project's
address with the toast that names the copies in its query, as opening a project always did.
What the app did to a project when it opened one, the skills refresh and the install, is the
server's too. The page sends both itself, in the app as in a browser, and the app's parent
port is for what only the app can know: the folder on its command line, and the project to open
at launch.

`last.json` keeps the agent and the version, not the project last opened: the page opens
projects through the server, which the app never hears about, so the launch opens the newest
project in the folder, and makes a first one through the same endpoint when there is none.

## A project's boards are its `canvases`

They were `<project>/mockups/canvases`, a level that said nothing: a project holds only data, and
its boards are the one folder of it the canvas reads. They are `<project>/canvases` now, and this
repository's own examples moved the same way, to a root `canvases/` beside the `canvas/` app.
An existing project is moved rather than asked about. The server renames `mockups/canvases` to
`canvases` for every project in the projects folder when it starts and for a folder as it is
opened, and `sp start` does the same before it makes the folder, since the server would otherwise
find `canvases` already there and leave the old one behind. `mockups` goes too when that empties
it. A project with both is left alone, because which is current is the user's to say. The one
spelling kept is the tldraw document's: a shape's id is `../../mockups/canvases/<slug>/<file>`
(`boardKey` in `canvasLibrary.ts`), and every stored document is keyed by it.

## Known corners

A double click on New project makes one project and answers 409 for the other; Open folder
ignores a second click while its picker is up. A Documents folder that OneDrive or a Known Folder redirect has moved is found by
Electron's `app.getPath("documents")` and not by the server's `~/Documents`, so under the app the
two agree only because the app passes its answer down.
