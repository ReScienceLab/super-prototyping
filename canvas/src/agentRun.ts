/**
 * A run of the agent as the dev server keeps it: everything the process has said, numbered from
 * one, and the open event streams to say the next thing down.
 *
 * The events are kept whole rather than windowed, because the page that asks for them may be a
 * fresh one. The agent's work is a board written to disk, and the watcher answers that with a full
 * reload; the panel that comes back has nothing but the run's id, and rebuilds its transcript by
 * reading from event zero. A stream that reconnects mid-run asks from the last id it saw instead.
 * Either way the answer is a slice of the same array, which is why an id is just a position.
 *
 * A turn is some kilobytes of text and the server forgets old runs, so nothing here bounds one.
 * Kept free of node APIs so it can be tested without a dev server, the way boardStatusEdit.ts is;
 * the process itself lives in server/agent.ts.
 */
import type { AgentId } from "./agents.ts";

export interface RunEvent {
  id: number;
  event: string;
  data: unknown;
}

export interface Run {
  id: string;
  events: RunEvent[];
  clients: Set<(e: RunEvent) => void>;
}

export const newRun = (id: string): Run => ({ id, events: [], clients: new Set() });

/** `end` is the one terminal event: a run whose last event it is has nothing more to say. */
export const ended = (run: Run) => run.events.at(-1)?.event === "end";

/** Records an event and hands it to every open stream. */
export function emit(run: Run, event: string, data: unknown): RunEvent {
  if (ended(run)) throw new Error(`run ${run.id} has ended; got a ${event} event after its end`);
  const e = { id: run.events.length + 1, event, data };
  run.events.push(e);
  for (const client of run.clients) client(e);
  return e;
}

/** Replays every event after `cursor` into `sink`, then every event to come, until detached. */
export function attach(run: Run, cursor: number, sink: (e: RunEvent) => void): () => void {
  for (const e of run.events.slice(cursor)) sink(e);
  run.clients.add(sink);
  return () => run.clients.delete(sink);
}

/** One event in the text/event-stream wire format; chatTransport.ts reads it back. */
export const sseFrame = (e: RunEvent) =>
  `id: ${e.id}\nevent: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`;

/**
 * A conversation with the agent, as its record keeps it at `<projects dir>/.workspaces/<id>.json`
 * beside the folder it runs in (server/agent.ts). The history lists these.
 */
export interface Session {
  id: string;
  agent: AgentId;
  /** What the agent calls it, to resume it by: Claude Code's session id, Codex's thread id. Null
   *  until a run has said. */
  resume: string | null;
  title: string;
  created: number;
  updated: number;
  /** The folders of the projects its messages were sent from, first to last. */
  projects: string[];
  /** Its runs, oldest first: the newest twenty in the server's memory, and every one on disk
   *  under `.workspaces/.runs`, which is what History replays after a restart. */
  runs: string[];
}
