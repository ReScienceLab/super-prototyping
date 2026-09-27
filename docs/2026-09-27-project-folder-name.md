# An unnamed project's folder takes its agent's name after the turn

2026-09-27. A project made from an idea with no name is an `Untitled N`
folder. Its agent's first message asks it to write a name into
`project.json`, which the bar and the home page show, but the folder kept
`Untitled N` in Finder.

## Why not ask the agent to rename the folder

We tried it. The agent renamed the folder, and the next chat message failed
with "no such project". Everything open on the project holds the old folder's
name: the page's address `/p/<name>/`, its tab, the chat's `SP_PROJECT` and
`--add-dir`, and the session's `projects[]`. The agent can't reach any of
these, and it is still running inside the folder it would be moving.

## What the app does

When a turn ends cleanly and no other turn is running, `named` in
`canvas/server/projects.ts` renames an `Untitled( N)?` folder to the
`project.json` name. It skips a name that is empty, starts with a dot,
contains a slash, or is already another folder's. It closes the project's
file watchers first, because Windows won't rename a watched folder. Then it
sends the open pages a `moved` event. The page reloads at the new address,
and the window moves its tab first (`spShell.moved`). The session's
`projects[]` switches to the new path, so the next message runs in it.

A folder the person named themselves keeps its name, whatever `project.json`
says. The prompt tells the agent to leave the folder alone, so it doesn't
offer to rename it.
