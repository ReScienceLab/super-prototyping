/**
 * Codex's `exec --json` output, reduced to the same ChatEvents Claude Code's stream becomes.
 *
 * `codex exec --json` writes one JSON frame per line, each about the thread, the turn or an
 * item: a command the agent ran, a file it changed, a reasoning summary, its message. The panel
 * wants each tool call as it starts and when it finishes, that the model reasoned, the message,
 * the end of the turn, and what the turn put in the context window. Everything else — the thread
 * id, `turn.started`, and the `error` items that are only warnings about the configured model —
 * is dropped here.
 *
 * Nothing streams a character at a time. Codex has suppressed its message deltas on this wire
 * since rust-v0.8.0, so each message arrives whole, in one `item.completed`. There can be
 * several: the recordings show a turn open with a sentence about what it is off to do, then its
 * tool lines, then the answer — so the text lands in paragraphs rather than in one block, but a
 * panel that sits still while a long command runs is showing exactly what the CLI sends. Codex's
 * other wire, `app-server`, does stream, and is a JSON-RPC session rather than a pipe; Open
 * Design carries a second transport for it, and this panel does not.
 *
 * A turn that fails says so twice, as a bare `error` and then `turn.failed` with the same text.
 * Only the second ends the turn here, since a run may end once (agentRun.ts). The message is the
 * server's wording, unwrapped one layer: codex puts an API refusal on this wire as the response
 * body in a string, so `turn.failed` about a model the installed CLI is too old for carries a
 * line of JSON whose one readable sentence is the whole diagnosis. That sentence is what shows.
 *
 * Kept free of node and DOM APIs like claudeStream.ts, and the recorded fixtures next to the
 * test are the contract.
 */
import type { ChatEvent } from "./claudeStream.ts";

interface Frame {
  type: string;
  item?: Item;
  error?: { message?: string };
  usage?: Record<string, number>;
}

/** The parts of an item this reads; each type carries more. */
interface Item {
  id: string;
  type: string;
  command?: string;
  exit_code?: number | null;
  status?: string;
  text?: string;
  changes?: { path: string }[];
}

export function codexEventsFromLine(line: string): ChatEvent[] {
  const frame: Frame = JSON.parse(line);
  const item = frame.item;
  switch (frame.type) {
    case "item.started":
      if (item?.type === "command_execution") {
        return [{ kind: "tool", id: item.id, name: "Shell", detail: item.command ?? "" }];
      }
      if (item?.type === "file_change") {
        const paths = (item.changes ?? []).map((c) => c.path).join(", ");
        return [{ kind: "tool", id: item.id, name: "Edit", detail: paths }];
      }
      return [];
    case "item.completed":
      switch (item?.type) {
        case "command_execution":
          return [{ kind: "tool_done", id: item.id, ok: item.exit_code === 0 }];
        case "file_change":
          return [{ kind: "tool_done", id: item.id, ok: item.status === "completed" }];
        case "agent_message":
          return [{ kind: "text", text: item.text ?? "" }];
        case "reasoning":
          return [{ kind: "thinking" }];
        default:
          return [];
      }
    case "turn.completed": {
      // Cached input is input: it was sent, and it occupies the window like any other token.
      // Codex does not say how big that window is — the server tells it elsewhere, and the
      // dev server fills it in from the same list the model picker is drawn from.
      const u = frame.usage;
      const used = u ? (u.input_tokens ?? 0) + (u.output_tokens ?? 0) : 0;
      return [...(u ? [{ kind: "usage" as const, used }] : []), { kind: "end", ok: true }];
    }
    case "turn.failed":
      return [{ kind: "end", ok: false, message: readable(frame.error?.message) }];
    default:
      return [];
  }
}

/**
 * The sentence in a codex failure. An API refusal reaches this wire as the whole response body
 * in a string — `{"type":"error","status":400,"error":{"type":..,"message":"the sentence"}}` —
 * and the body is not what the user needs to read. Anything else is already the sentence.
 */
function readable(message: string | undefined): string {
  if (!message) return "turn failed";
  try {
    const body = JSON.parse(message);
    if (typeof body?.error?.message === "string") return body.error.message;
  } catch {
    // Not JSON, which is the ordinary case.
  }
  return message;
}
