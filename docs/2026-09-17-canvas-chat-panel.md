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

That fallback travels in `start`, the run's first event, which the server writes when the run is
created with the prompt, the title and the time. It exists so a run replays whole from event
zero: the panel keeps only run ids in `sessionStorage` now, where it kept prompts too, and the
history list is read off the same events (`runSummary` in `agentRun.ts`).

## The history is the server's memory, and dies with it

`GET /__sp/agent/runs` lists the runs the server retains — the newest twenty, in memory —
newest first, as `{ id, title, startedAt, status }`; picking one replays it through the same
`events?after=0`. Nothing is written to disk. A dev server that restarts starts with an empty
list, and that is consistent with the rest of the panel: the server already holds every run's
events and nothing else does. A file would be this feature's first persistence, and a database
its second.

## Collapsing is a width change

The panel folds to a 36px rail showing Claude's mark, which is the button that opens it again.
Nothing unmounts: the panel keeps following a run while collapsed, and comes back with its
transcript scrolled to the end. The state is in `localStorage`, so a panel closed stays closed
across reloads — and the reload a board write causes is exactly when that matters.

## One mark, no registry

`ClaudeMark.tsx` sits next to `FigmaMark.tsx`: one path from lobehub/icons' `Claude.Color`
(MIT), drawn inline like every other icon here rather than pulled in as a package that is nine
megabytes and an Ant Design stack. The panel talks to one agent, so there is one mark and no
icon map, registry or agent-to-icon configuration; a second agent, when one genuinely arrives,
is one more file that day. The absence is deliberate.

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

## Left out

- One turn per run and no `--resume`: every message is a fresh process with no memory of the
  last. The first thing to revisit once the panel has been used; `--resume <session_id>` from
  the `init` frame is the whole mechanism.
- Thinking is a marker, not text. On Claude Code 2.1.274 every thinking delta arrives empty, with
  a token estimate, so there is nothing to fold.
- No TodoWrite cards, no question form, no syntax highlighting.
- The parser reads no `stop_reason`. Claude Code reports it on a frame that has moved between
  releases; a host that keeps stdin open must read it to know when to write again, and this one
  closes stdin after the message. `result` ends the run on every build.
