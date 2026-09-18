# The canvas gets a chat panel

2026-09-17. A panel on the left of the canvas takes a message, runs Claude Code in the user's
project with it, and draws what it does as it happens. The dev server hosts the process; the
page only ever reads events. Three decisions were open in the plan and are settled here, with a
fourth the plan had wrong.

## The panel is a flex sibling, not an overlay

The inspector on the right is a flex sibling of the editor, and the chat panel on the left is the
same: 360px, `flex: 0 0 auto`, before `<main>` in `.canvas-shell`. tldraw's viewport shrinks by
the panel's width, its ResizeObserver re-measures, and zoom-to-fit, the toolbar and every
screen-space calculation keep working against the space actually there.

Floating the panel over the canvas was the alternative, and it was rejected rather than deferred.
tldraw 5 takes a single scalar `inset` for `zoomToFit`/`zoomToBounds` and a per-axis-symmetric
`VecLike` for `constraints.padding`, so "keep the left 360px clear" has no native expression: it
would mean a wrapper around every zoom call and camera arithmetic the squeeze gets for free.

## Two steps, with a cursor

`POST /__sp/agent/run` answers 202 with a run id, and `GET /__sp/agent/run/:id/events?after=N`
is a server-sent event stream from event N+1 on. Not one streaming response, because the agent's
work is a board written to disk, and the watcher answers that with a full reload: a stream bound
to the fetch that started the run would die at the exact moment the run succeeds. The panel keeps
its run ids in `sessionStorage` and, after the reload, reads each run again from zero. The server
keeps every event of a run (a turn is kilobytes) and the newest twenty runs; a stream that drops
mid-run reconnects from the last id it saw. Both are the same request with a different `after`,
which is why an event id is just its position in the run.

The plan had the panel persist `lastEventId` as well. It does not need to: after a reload the
panel has no transcript, so the only cursor that rebuilds one is zero. The cursor lives in the
reconnect loop of `chatTransport.ts`, where it is the last id that reached the page.

## Permissions off, and said so

The process runs with `--permission-mode bypassPermissions`. In print mode there is no terminal
to ask at: a tool call that needs permission is refused, and a run asked to write a board ends
having written nothing. The alternative is `--permission-prompt-tool` and an MCP server to answer
through — a second process for a question the panel can put once. So the panel says it in its
empty state, before the first message: the same trust as running `claude` in a terminal of the
project, which is what the panel replaces.

The same trust is why `/__sp` is same-origin only. A dev server sits on a port every page in the
browser can reach, and a cross-origin `POST` still runs — CORS withholds the reply, not the
request — so any site the user visits while the canvas is open could otherwise start an agent
with those permissions in their project. One check answers it, before every `/__sp` handler:
`Sec-Fetch-Site` must be `same-origin` or `none`. The browser writes that header itself and a
page cannot change it, `Sec-Fetch-*` being forbidden header names; absent means the caller was
not a browser, which is `curl`, which was never the attack. A token would need generating,
serving into the page, storing and comparing, to learn the same fact the browser already states.

## Where the agent runs

In the user's project — never the boards directory (a prompt about a screen reaches for the code
around it) and never the plugin checkout (`repoRoot` in `vite.config.ts` is the plugin, not the
user's work). `sp-canvas start` passes the directory it is started from as
`PROTOTYPING_PROJECT_DIR`, the same one the boards default under. A server started without it
answers the agent endpoints with 503 naming the variable, and serves everything else as before.

## The header names the conversation

The title comes from the model, in the same run: the system prompt asks it to open its reply
with `<sp-title>…</sp-title>` on a line of its own, and `titleFilter` in `claudeStream.ts` lifts
the marker out on the server, before anything is emitted, so the page never sees it as text. The
marker arrives split across deltas (`<s`, `p`, `-title>Gre`… in the recorded fixture), so text
is held only while it could still be the marker and released the moment it cannot be. A second
`claude` call to name the run would cost a process and a wait; this costs one sentence of
prompt. Until the model's title arrives, and when it never does, the header shows the prompt's
first line.

Every block of text gets that chance, not only the first. A turn with work to do usually opens
by saying what it is about to do, runs a tool, and titles the reply on the far side of it — and
a filter that gave up at the first sentence left the marker in the reply, where the sanitizer
dropped the tags and the model's title sat in the middle of the text as a stray line while the
header showed the prompt. A tool call re-arms the filter, until a title has been lifted.

That fallback travels in `start`, the run's first event, which the server writes when the run is
created with the prompt, the title and the time. It exists so a run replays whole from event
zero: the panel keeps only run ids in `sessionStorage` now, where it kept prompts too, and the
history list is read off the same events (`runSummary` in `agentRun.ts`).

The board it is pointed at is not named here. It was, until the panel was seen beside the
canvas's own header a few hundred pixels to the right, naming the same board; one of the two had
to go, and the panel is not the one that owns it. The slug still travels with the message.

## The history is the server's memory, and dies with it

A run the server no longer has replays as a failure before a single frame, and a turn with no
prompt and no blocks under it is not a conversation to put an error under, so it is dropped
instead. The panel comes back from a dev-server restart empty rather than carrying a column of
run ids it cannot show, one per reload.

`GET /__sp/agent/runs` lists the runs the server retains — the newest twenty, in memory —
newest first, as `{ id, title, startedAt, status }`; picking one replays it through the same
`events?after=0`. Nothing is written to disk. A dev server that restarts starts with an empty
list, and that is consistent with the rest of the panel: the server already holds every run's
events and nothing else does. A file would be this feature's first persistence, and a database
its second.

That memory is also where "one agent at a time" is decided. The composer disables itself while a
run is open, but that is React state: a second tab, a reload, or the panel's own new-session
button does not share it, and two agents in one project overwrite each other's boards. So the
server refuses a second run with 409 while it holds an unfinished one, and the panel shows what
it said. Stopping the running one is the way to start another, which is what the Stop button was
already for.

And when the server goes, they go: `start_new_session=True` makes it the leader of its own
process group, so `sp-canvas stop` signals the group rather than the pid, and the agents it
spawned do not outlive the canvas that started them. The tmux path already did this — a pane
takes its whole group down with it.


## Collapsing is a width change

The panel folds to a 36px rail showing Claude's mark, which is the button that opens it again.
Nothing unmounts: the panel keeps following a run while collapsed, and comes back with its
transcript scrolled to the end. The state is in `localStorage`, so a panel closed stays closed
across reloads — and the reload a board write causes is exactly when that matters.

## One mark, no registry

`ClaudeMark.tsx` sits next to `FigmaMark.tsx`: one path from lobehub/icons' `Claude.Color`
(MIT), drawn inline like every other icon here rather than pulled in as a package that is nine
megabytes and an Ant Design stack. The panel talked to one agent, so there was one mark and no
icon map, registry or agent-to-icon configuration; a second agent, when one genuinely arrived,
would be one more file that day. It arrived, below, and it was: `CodexMark.tsx`, and a two-entry
object in `ChatPanel.tsx` that picks a mark by id.

## A second agent, and the table it made

Codex arrived, and the mark's promise held; what the server needed was a little more. The spawn,
its argv, how the preamble and the message reach the process and how its output is read were
Claude's, inline in `vite.config.ts`. They are now one object literal per CLI in `agents.ts` —
id, name, binary, `args`, `stdin`, `events`, and the sentence for when the binary is not on
PATH — and the server looks up the one the panel asked for and does everything after the spawn
the same way for both. This is Open Design's `RuntimeAgentDef` with the fields the two genuinely
differ in and none of the rest: a table, not a registry, and a third agent is a third literal.

The two differ in more than argv. Claude Code takes the preamble as a flag and the message as
one stream-json line; Codex has no system-prompt flag, so the preamble goes ahead of the message
in the prompt itself, plain text on stdin. Claude writes wherever it likes with its prompts off;
Codex in `workspace-write` writes only its working directory, and `sp-canvas --canvases` can put
the boards anywhere, so the boards folder is named to it with `--add-dir`. And Codex asks the
API for a reasoning summary only when told to — Open Design measured a turn with 516 reasoning
tokens and no reasoning item — so `model_reasoning_summary="detailed"` is on the argv, and that
item is what becomes the thinking marker.

`codexStream.ts` reads `codex exec --json` into the same ChatEvents Claude's stream becomes:
`command_execution` and `file_change` items as tool and tool_done, `agent_message` as text,
`reasoning` as thinking, `turn.completed` and `turn.failed` as the end. Nothing streams a
character at a time: Codex suppressed its message deltas on this wire in rust-v0.8.0 and has not
put them back, so each message arrives whole. There is more than one. The recordings show a turn
open by saying what it is about to do, then its tool lines, then the answer — text in paragraphs
rather than in one block at the end, which is as close to streaming as this wire gets, and the
panel is drawing exactly what it is sent. Codex's other wire, `app-server`, streams and is a
JSON-RPC session; Open Design carries a second transport for it, and this panel does not.

A failed turn says so twice, a bare `error` frame and then `turn.failed` with the same text, and
only the second ends the run, since `emit` refuses a second end. The text is the server's, with
one layer taken off: codex puts an API refusal on this wire as the whole response body inside a
string, and a panel that shows it whole shows a line of JSON with one readable sentence in the
middle of it. That sentence is what shows, and on this machine it is the whole diagnosis —
codex-cli 0.146.0's default model is `gpt-6-astra`, the server answers "The 'gpt-6-astra' model
requires a newer version of Codex", and Codex fails on the first message until the CLI is
updated or `model` is set in `~/.codex/config.toml`. The panel does not choose a model; that is
the user's config, as it is in a terminal. Every shape above is a recording of codex-cli 0.146.0
spawned the way `agents.ts` spawns it, `file_change` included: a turn that patches a file, runs
a command to check it, and answers, which is the fixture the test reads.

Which agents exist is the server's to say: `GET /__sp/agent/agents` probes each binary once per
server with `--version` and answers `available`, and the menu greys the ones it could not find,
with the sentence the run would have failed with. The choice is the header's mark, kept in
`localStorage` under `sp-chat-agent` and sent with the message, and each run's `start` event
names the agent that ran it, so a rebuilt transcript and the history list show the mark of the
agent that ran each turn rather than the one chosen now. No settings page: one click, one menu,
one mark.

## Markdown: marked, remend and DOMPurify

The agent's text is markdown — bold, GFM tables with a `<br>` inside a cell, fences — and was
drawn as source. It is now rendered by three small libraries: `remend` mends the text, `marked`
parses it, `DOMPurify` sanitizes the HTML, and `renderMarkdown` in `markdown.ts` is the one
path from model text to `dangerouslySetInnerHTML`. The stack measures 84 KB minified, 27 KB
gzipped, sanitizer included.

Vercel's Streamdown is aimed at exactly this — a react-markdown for streamed model output —
and was measured and rejected: 520 KB minified, 159 KB gzipped, about 110 packages behind a
single export, for an app whose runtime dependency list was four. Its valuable piece is
separable: `remend`, published from the same repository with no dependencies, is what stops
mid-stream flicker. At a cut mid-token, `marked` alone leaves `**29 个 H` as asterisks until the
next delta; mended first, it is `<strong>` from the first paint. The same for an unclosed
backtick.

`marked` on its own is unsafe: it passes `<script>alert(1)</script>` through untouched. With
DOMPurify after it the script is gone, `<img src=x onerror=alert(1)>` keeps its `src` and loses
its handler, and the `<br>` in a table cell — real model output, and wanted — survives. There is
no path where model text reaches the DOM unsanitized, and the test next to the module holds
that.

Open Design has solved this twice and neither is a straight copy. Its chat renderer
(`apps/web/src/runtime/markdown.tsx`) is 782 hand-rolled lines emitting typed React elements
with no `dangerouslySetInnerHTML` at all — safe by construction, 782 lines to own, and it cannot
draw the `<br>`. Its artifact renderer (`apps/web/src/artifacts/markdown.ts`) is micromark with
the GFM extension, DOMPurify and Shiki. This is a third way: a parser rather than a hand-rolled
one, and no highlighter. Shiki is what makes Open Design's chat path expensive, and the one thing
it disables while streaming anyway; a fence here is escaped text.

Two things streaming does that nothing fixes: a GFM table does not exist until its delimiter
row arrives, so the header line is a paragraph of pipes and becomes a table in place a delta
later — correct, not guessable, and the log follows its end as it does for any growth. And the
model writes tables wider than 360px; they scroll sideways inside their block, as fences do,
rather than widening the panel.

## The model, the effort, and what the message cost

A strip under the composer: which model, which effort, and the tokens the last
message took. Three controls where Claude Code and Codex both put them, because
that is where the hand already is.

Both lists are data on the `AgentDef`, next to the argv the agent takes, since
that is the one place the two CLIs already differ. Claude's is written down —
four aliases, five levels — because Claude Code publishes no list to read.
Codex keeps its own at `~/.codex/models_cache.json`: the server-sent presets its
own picker draws, with each model's display name, context window, and the
reasoning levels that model actually takes, which differ per model — Luna stops
at `max` where Astra goes on to `ultra`. Reading that file is strictly better
than a copy of it made today, so `AgentDef` carries `modelsFile` — a
home-relative path and a pure `read(json)` — and `vite.config.ts` does the
`readFileSync` beside the PATH probe. `agents.ts` stays free of node, which its
header has promised since the day it was two literals.

The first row of both pickers is Default, and Default sends no flag at all: your
`~/.codex/config.toml` and Claude's own settings keep deciding until you say
otherwise, which is what the terminal does and what both CLIs' own pickers say.
A choice is per agent and kept in `localStorage`; one that has gone stale — a
model dropped from the list, a level the picked model does not have — is
silently not sent rather than failing a run on a name from last week. The server
checks both against the same list and answers 400, because both values reach a
command line.

Effort is not symmetric. Claude takes `--effort`, and refuses a level it does
not know at startup. Codex has no flag: it is `-c model_reasoning_effort="…"`,
and codex takes no opinion at startup — a level the model does not have comes
back as the API's complaint, mid-turn. Hence the per-model vocabularies from the
cache; they are what the slider's stops are drawn from.

The token count rides in on a `usage` event, which both agents already report
and neither reported the same way. Claude's `result` frame sums input, both
cache figures and output — cached input is input, it was sent and it occupies
the window — and names the window in `modelUsage`. A turn that ran a sub-agent
lists both models there, the sub-agent's first, so the window is the largest of
them rather than the first. Codex's `turn.completed` has the usage and no window
at all; the server knows it from the same cache the picker was drawn from, and
stamps it on the way past.

What the number is not: a conversation total. Every message is still its own
process with no memory of the last, so it is that message, prompt and answer
together, against the window it had. The tooltip says so. It will mean the other
thing on the day resume lands.

## Slash commands, and whose they are

Typing `/` in the composer lists what the agent can run, and Enter takes the highlighted one.
The panel does not run anything: `claude -p` runs a slash command sent as the message text
exactly as the terminal does, which was verified through the panel's own path — a stream-json
user message of `/pingprobe` answers `PONGCMD`, and a skill invoked the same way answers as a
skill. So the feature was already there; what was missing was knowing what to type.

The list is Claude Code's own. Its init frame names every command available in that project —
the project's, the personal ones, each installed plugin's, namespaced as it namespaces them
(`ponytail:ponytail`, `convex:add`), and the skills a plugin ships, which is where
`/clone-prototype` comes from. 132 of them on this machine. The dev server keeps what the frame
says and serves it to the palette, so the panel never discovers commands a second way: no scan of
`.claude/commands`, no guess at which plugins are enabled, nothing to go stale the day Claude
Code changes where a command may live.

That map is the only copy, and it dies with the process. An edit to `vite.config.ts`, or to
anything it imports, restarts vite mid-session and takes the palette with it; so does the first
page of a fresh server. Waiting for the next run to refill it is what made the slash key look
broken at random — the panel was working exactly as designed, and the design was wrong.

So it asks, which first meant finding an ask that is free, because this one runs on every
dev-server start. `claude -p` writes no init frame until it has a message to work on, and a
message that reaches the model loads the system prompt and bills for it: $0.017, measured.
`/help` is the way through. Claude Code answers it itself, so the result frame comes back
`num_turns: 0`, `duration_api_ms: 0`, `total_cost_usd: 0` — and the init frame, all 132 commands
of it, was printed several lines above. Five to seven seconds, nearly all of it process start.
The answer is thrown away; the frame above it was the point. `--max-budget-usd 0.0000001` rides
along as the belt, so a version that ever sends `/help` to the model stops there rather than
quietly billing every restart.

Seconds are still too slow for a keystroke, so the panel does not wait on that ask to draw a
palette. It asks at mount rather than at the first slash, and keeps each agent's answer in
`localStorage`, replaced only by a non-empty one: a server that has just restarted has forgotten
what it told this panel, which is not the same as the agent having no commands. The palette opens
on what the browser remembers and corrects itself when the server answers — half a millisecond,
once anything has warmed the map. The one case with nothing to open on is a browser that has
never seen this project and a server that has never been asked; there the list fills itself in
when the probe lands, with no second keystroke.

Codex needed the opposite arrangement, and it took a while to find the honest one. `codex exec`
runs no slash commands at all: `codex debug prompt-input "/sp-probe hello"` — which composes the
prompt the CLI would send, locally and without spending anything — shows the message arriving as
the literal `/sp-probe hello`, whether or not a file of that name sits in `CODEX_HOME/prompts`.
Custom prompts are expanded by the TUI (`tui/src/bottom_pane/custom_prompt_view.rs`), before any
of this. So listing codex's TUI commands would have been a lie: `/diff` and `/compact` do nothing
here.

What a slash does mean to codex is a **skill**, and skills do reach `exec` — the same probe shows
an entire `<skills_instructions>` block naming 80 of them, with roots for the personal directory,
the plugin caches and this project's own `skills/`. So codex's palette is that block, read by
`commandsProbe`: argv to run, and a function to read the names out of the answer. Run once for the
server's lifetime, the first time the palette opens for codex, three seconds, no network, no
charge.

The two agents therefore answer the same question from opposite directions, and the table says
which: `commands` reads a line the agent was going to write anyway, `commandsProbe` asks for one.
Codex only ever asks, having no such line to read; claude does both, the probe for the first
palette of a server's life and the frame for every one after. The one difference worth
being straight about is what happens after the palette closes. Claude Code executes `/clone-prototype`
itself — it is the CLI's command. Codex is *told* about its skills and decides; `/imagegen a cat`
reaches the model as that text, next to instructions saying what `imagegen` is and where its
`SKILL.md` lives. Same palette, one CLI feature and one model behaviour.

Open Design does the opposite end of this, and it is worth saying why it does not transfer. Its
`/` palette (`apps/web/src/components/ChatComposer.tsx`) is a host-side catalog built from live
app state — `/mcp <server>`, `/search`, `/pet` — where some entries insert text for the model and
others are caught by the host and never sent at all. It lists what the product can do, not what
the CLI underneath it can run. Here the CLI is the product, so the palette is its list, and every
entry goes to it verbatim.

## The composer is Claude Code's

A bordered box with the submit inside it, and under the box a row: what the run is allowed to do
on the left, what it runs as on the right. The textarea has no chrome of its own — the border,
the background and the focus ring are the form's — so the box grows with the text and the slash
palette keeps hanging off its top edge. Colours stay the canvas's: this is the same arrangement
in a light panel, not a dark theme dropped into a light app.

Two of that row's controls are deliberately missing. The microphone: no voice input here. And the
chevron beside the permission label: it switches Edit and Bypass mode, and this panel cannot —
the mode is fixed at spawn and the label states it rather than offering it. The third, `+`, is
here after all, first thing in that row where Claude Code keeps it, and the next section is what
it does.


## Pictures, both ways

A picture attached to a message gets a number, and the message refers to it by that number. That
is how a person talks about four screenshots at once — the layout from #1, the button from #3,
the copy from #4 — and it is the only thing a strip of thumbnails cannot say on its own. Numbers
count up for the life of the composer and are never reused, so a number in the transcript still
means what it meant when it was typed. Paste, drop, or the button in the row: three ways in,
because a screenshot is on the clipboard as often as it is in a folder.

Each agent is handed them the way it can take them. Claude gets base64 blocks inline on stdin,
each behind an `[Image #n] <name>` line, so the numbers the message uses are the numbers the model
sees. Codex has no image channel on stdin, so it gets the paths instead, to files written under a
per-run temp directory. The browser's filename is a caption in both cases and reaches no path: the
run's id names the folder, the number and media type name the file.

The other direction is the interesting one. Whatever a tool hands the agent as an image arrives on
the `user` frame that carries the tool's result, as a base64 block where a string would otherwise
be — and the clone toolchain already tells the agent to look: `refkit grid` writes its annotated
PNG and prints "Now READ this image with the Read tool." So the working images of a clone reach
the panel for free, and they are exactly what the model looked at, rather than a file some watcher
found in the project afterwards. Nothing watches the project directory, and nothing had to be
taught which tools draw.

Both directions obey the same rule about bytes: they do not live in the event buffer. A written
board reloads the page, the panel rebuilds every turn from event zero, and a full-page grid is
megabytes — so what the stream carries is a number, and the picture is a request away. The
composer's attachments go out as `{n, name}` on the `start` event and are served from
`/run/<id>/image/<n>`; a tool's pictures are lifted off the frame by the parser, filed under the
run by the server, and served from `/run/<id>/shot/<k>`. The panel draws one strip for both, so a
picture looks the same whichever end of the conversation put it there.

A tool's pictures are held in memory rather than written down. Nothing but the page ever opens
them, and evicting the run drops them with it. Serving the file from the path the agent wrote it
to would have needed no copy at all, and is wrong twice: `refkit` reuses its `-o` names, so an
hour-old line in the transcript would quietly show a later screen or 404, and a dev server that
serves an arbitrary path on request is a disclosure hole. The media type is the agent's word and
goes out as a response header, so it is checked against `image/…` before it gets there.


## Left out

- One turn per run and no resuming, for either agent: every message is a fresh process with no
  memory of the last. The first thing to revisit once the panel has been used; Claude's
  `--resume <session_id>` from its `init` frame and Codex's `exec resume <thread_id>` from its
  `thread.started` are the whole mechanism. They are two mechanisms, not one: separate id spaces,
  separate stores (`~/.claude/projects/<cwd>/<id>.jsonl` against
  `~/.codex/sessions/<y>/<m>/<d>/rollout-*.jsonl`), separate line schemas, and each flag reads only
  its own. So a session belongs to the agent that opened it, and switching agents starts a new one
  — there is no context to hand over, only a transcript we could re-state as text.
- Thinking is a marker, not text. On Claude Code 2.1.274 every thinking delta arrives empty, with
  a token estimate, so there is nothing to fold; Codex does send a summary, and it is dropped to
  the same marker so the two read alike.
- No TodoWrite cards, no question form, no syntax highlighting.
- The parser reads no `stop_reason`. Claude Code reports it on a frame that has moved between
  releases; a host that keeps stdin open must read it to know when to write again, and this one
  closes stdin after the message. `result` ends the run on every build.
