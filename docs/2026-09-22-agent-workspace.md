# The chat's agent runs in a folder of its own, and remembers

2026-09-22, the second half of making the app global (the first is
`2026-09-22-onboarding-modal.md`). The app opens on a home page that is no
project's, with no project at all if there are none, so the chat panel beside it
cannot need one. Before this, the agent ran in the project the message was sent
from, each message was a process with no memory of the last, and the home page
refused to send.

## The rule

**A conversation is a session. Each session has a folder of its own,
`<projects dir>/.workspaces/<id>/`, which is the agent's working directory on
every turn, and a record beside it, `<id>.json`, that says how to resume it.
Each message names the project in front, if there is one, and the agent is given
that project as a folder it may write.** The agent server is mounted once at the
root, `/__sp/agent`, beside `/__sp/projects`, and no longer under each project.

```
<projects dir>/.workspaces/
  .claude/skills/          one copy of the plugin's skills, for every session
  .agents/skills/          the same, where Codex reads them
  <id>/                    a session's working directory, made at its first run
    .claude/skills         a link to the copy above (.agents/skills for Codex)
  <id>.json                {id, agent, resume, title, created, updated, projects, runs}
  .runs/<run id>/          events.jsonl, and image-<n>.<ext> / shot-<k>.<ext>
```

`projects()` skips dot folders, so `.workspaces` is never listed as a project.

## Decisions

| Decision | Why |
| --- | --- |
| The agent runs in the session's folder, not in the project | One session can start on the home page and move from project to project, so no project can be its working directory. Claude Code and Codex both key a resumable session to the directory it started in (`codex exec resume` filters by cwd), so the directory has to stay the same for every turn of one session, and differ between sessions so their files do not mix. |
| The project in front is named on every message | The panel sends `project` only when the tab in front is a project; home and an example send none. The server answers 404 for a name it does not have. The agent is told the project's path and its `canvases` folder, the canvas in front, the other projects by name and path, the examples and the skill to read first. A session's record keeps every project it has worked on, which is what History shows under its title. |
| Claude gets the project with `--add-dir`; Codex with `writable_roots` | Claude already runs with `bypassPermissions`, and `--add-dir` puts the project in its workspace. Codex runs `workspace-write` with the project, and the folder of attached images, as `sandbox_workspace_write.writable_roots`, set with `-c` because `codex exec resume` takes no `--sandbox` and no `--add-dir`. Nothing here uses `--dangerously-bypass-approvals-and-sandbox`. |
| Claude's context stays in `--append-system-prompt`, with `--system-prompt-snapshot off` | The brief was to move it into the message, as Codex has it, because the snapshot (on by default) freezes the system prompt at a session's first turn and a resumed turn would keep the first turn's project. Turning the snapshot off renders it again on each turn instead, and keeps the message the user's own text, so a slash command at its start is still Claude's. The flag needs Claude Code 2.1.275 or later. |
| The resume id is read from the agent's output | Claude's `init` event carries `session_id` and Codex's `thread.started` carries `thread_id` (`AgentDef.session`). The first turn passes no id of its own. Later turns pass `--resume <id>` or `exec resume <id>`. `claude -c` and `codex resume --last` are never used: with several sessions in the same parent they would pick whichever ran last. |
| The record is written with a temporary file and a rename, and held in memory while the server runs | A reader never sees half a file, and two quick turns of one session update one object instead of racing on a stale copy from disk. `GET /__sp/agent/sessions` lists every record, newest first, and says which one has a run going. It replaces `GET /__sp/agent/runs`. |
| A session is one agent's | A Claude session cannot be resumed by Codex. The server answers 409 to a message for the other agent, and the panel starts a new session when the agent is switched. |
| Picking a session in History resumes it | The next message carries on where it left off. Its turns are shown again. Each run is written to `.workspaces/.runs/<run id>/` as it goes: its events appended one JSON line at a time, and its pictures beside them (`image-<n>`, `shot-<k>`). The server holds the newest twenty in memory and replays any other from that folder, so a restart, which every update is, loses nothing. A run the server died in the middle of replays with an end saying so. It is the app's own copy rather than a read of Claude Code's or Codex's transcript, as Open Design and Hermes Agent do it: those files are the CLIs' own, change shape between releases, and hold no attachment by the number the message used. Sessions from before this was written show no turns. |
| The skills are one copy in `.workspaces`, linked into each session's folder | Claude Code finds skills in a parent of its working directory. Codex looks only in its working directory and a git repo's root, and a session's folder is neither under a repo nor holding the skills, so each folder gets a link. It is a junction on Windows, which needs no privilege to make. The copy is brought up to the plugin's version on every run, with the marker and the rules `skills.ts` had for projects. Copying into each session would leave a stale copy per conversation. |
| Nothing is written before the first message | A GET, the onboarding's answer and the server's start write nothing to the projects folder. `.workspaces` appears when a message is first sent. |
| Projects get no skills, and New project and Open folder take no agent | The skills live with the agent now. The per-project install and its refresh are gone, with `agent` in the `POST /__sp/projects` body and the toast that named the copies. Copies an earlier version put in a project are left where they are: they are the user's files now, and nothing reads them. |
| One agent at a time, across the app | As before: two agents writing one project would race. It is now one lock for every project and none, which is the same thing with one panel. |

## Known limits

- **Nothing is ever pruned.** Every session keeps its folder and its record.
  They are small, a link and a JSON file, unless the agent leaves files there.
  A run's folder under `.runs` holds its pictures, and is the one that grows.
  When that matters, the place to add it is History: deleting a session from the
  list removes `<id>/` and `<id>.json`, through a `DELETE /__sp/agent/sessions/<id>`
  that refuses the session with a run going.
- **Codex's slash menu lists no workspace skills.** The panel asks Codex for
  its commands from a temporary directory, not a session's folder. The skills
  still work in a run, and `$skill` still reaches them.
- **Codex writing a project on a resumed turn was not run end to end** when this
  was written: the account was at its usage limit. A first Codex turn and a
  resume reached Codex with these arguments and were refused for the limit, not
  for the arguments. If a resumed Codex turn cannot write the project, the
  choice of what to widen is the user's, and the bypass flag is not the default
  answer.
- `sp clean` leaves `.workspaces` alone: it holds conversations, not a download.
  `sp paths` names it.
