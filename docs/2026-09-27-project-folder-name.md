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
`project.json` name. It skips a name that is empty, starts with a dot, or is
already another folder's. It also skips a name that no folder can have on
Windows (checked on every platform, since shared projects open there too).
It closes the project's file watchers first, because Windows won't rename a
watched folder (checked: `EPERM` while watched, fine after). Then it sends
every open page a `moved` event. The window moves its tab
(`spShell.moved`) whichever project is in front, and a page of the moved
project reloads at the new address. The session's `projects[]` switches to
the new path, so the next message runs in it.

The old name stays an alias for the rest of the server's life. Several
requests can arrive after the rename and still carry the old name:

- a page's last canvas save as it unloads;
- a message sent just as the turn ended;
- a click on a home card drawn before the move.

The alias catches these. A GET on the old name redirects to the new one, so
the project opens in only one tab.

A folder the person named themselves keeps its name, whatever `project.json`
says. The prompt tells the agent to leave the folder alone, so it doesn't
offer to rename it.
