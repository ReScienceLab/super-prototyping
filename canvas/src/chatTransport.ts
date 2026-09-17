/**
 * The panel's side of a run: reading its events off the dev server, and folding them into the
 * turn the panel draws.
 *
 * A run is followed rather than awaited. The agent's work is a board on disk, and the watcher
 * answers a board with a full reload, so the fetch that started the run does not outlive its
 * success. The panel keeps the run's id across the reload and reads on from event zero; a stream
 * that drops mid-run reads on from the last id it saw. Both are the same request with a different
 * `after` (docs/2026-09-17-canvas-chat-panel.md).
 *
 * Kept free of React so the decoding and folding can be tested on their own; ChatPanel.tsx owns
 * the state and the DOM.
 */
import type { ChatEvent } from "./claudeStream";

export interface Frame {
  id: number;
  event: string;
  data: unknown;
}

export type Block =
  | { kind: "text"; text: string }
  | { kind: "thinking" }
  | { kind: "tool"; id: string; name: string; detail: string; ok?: boolean };

export interface Turn {
  runId: string;
  prompt: string;
  /** The model's, once it has given one; the prompt's first line until then. */
  title?: string;
  blocks: Block[];
  /** Set once the run has ended: whether it succeeded and, if not, why. */
  end?: { ok: boolean; message?: string };
}

export function applyFrame(turn: Turn, frame: Frame): Turn {
  const e = frame.data as ChatEvent;
  switch (e.kind) {
    case "start":
      return { ...turn, prompt: e.prompt, title: e.title };
    case "title":
      return { ...turn, title: e.title };
    case "text": {
      const last = turn.blocks.at(-1);
      const blocks =
        last?.kind === "text"
          ? [...turn.blocks.slice(0, -1), { kind: "text" as const, text: last.text + e.text }]
          : [...turn.blocks, { kind: "text" as const, text: e.text }];
      return { ...turn, blocks };
    }
    case "thinking":
      return { ...turn, blocks: [...turn.blocks, { kind: "thinking" }] };
    case "tool":
      return { ...turn, blocks: [...turn.blocks, { kind: "tool", id: e.id, name: e.name, detail: e.detail }] };
    case "tool_done":
      return {
        ...turn,
        blocks: turn.blocks.map((b) => (b.kind === "tool" && b.id === e.id ? { ...b, ok: e.ok } : b)),
      };
    case "end":
      return { ...turn, end: { ok: e.ok, message: e.message } };
  }
}

/** The complete frames in `buffer`, and whatever is left of an incomplete one. */
export function sseFrames(buffer: string): { frames: Frame[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop()!;
  const frames: Frame[] = [];
  for (const part of parts) {
    const fields: Record<string, string> = {};
    for (const line of part.split("\n")) {
      const at = line.indexOf(": ");
      if (at > 0) fields[line.slice(0, at)] = line.slice(at + 2);
    }
    // A comment line (the server's keepalive) has no fields at all.
    if (fields.data) frames.push({ id: Number(fields.id), event: fields.event, data: JSON.parse(fields.data) });
  }
  return { frames, rest };
}

// The server writes a keepalive every 25s; three missed in a row means the connection is dead.
const IDLE_MS = 75_000;
const RECONNECTS = 5;

/**
 * Feeds a run's events after `after` to `onFrame` until its `end`. A stream that goes quiet, or
 * closes without an end, is reopened from the last id seen, a few times. A run the server does
 * not know or cannot start (404, 503) is reported at once: asking again would not help.
 */
export async function followRun(
  runId: string,
  after: number,
  onFrame: (frame: Frame) => void,
  signal: AbortSignal,
): Promise<void> {
  let cursor = after;
  for (let reconnects = 0; ; reconnects++) {
    const idle = new AbortController();
    let timer = setTimeout(() => idle.abort(), IDLE_MS);
    try {
      const res = await fetch(`/__sp/agent/run/${runId}/events?after=${cursor}`, {
        signal: AbortSignal.any([signal, idle.signal]),
      });
      if (!res.ok) throw new Error(await res.text());
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        clearTimeout(timer);
        timer = setTimeout(() => idle.abort(), IDLE_MS);
        const decoded = sseFrames(buffer + decoder.decode(value, { stream: true }));
        buffer = decoded.rest;
        for (const frame of decoded.frames) {
          cursor = frame.id;
          onFrame(frame);
          if (frame.event === "end") return;
        }
      }
    } catch (error) {
      if (!idle.signal.aborted || signal.aborted) throw error;
    } finally {
      clearTimeout(timer);
    }
    if (reconnects === RECONNECTS) throw new Error("lost the run's event stream");
  }
}
