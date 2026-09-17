/**
 * Codex's `exec --json` output, reduced to the same ChatEvents Claude Code's stream becomes.
 *
 * `codex exec --json` writes one JSON frame per line, each about the thread, the turn or an
 * item: a command the agent ran, a file it changed, a reasoning summary, its message. The panel
 * wants each tool call as it starts and when it finishes, that the model reasoned, the message,
 * and the end of the turn. Everything else — the thread id, `turn.started`, token usage, and the
 * `error` items that are only warnings about the configured model — is dropped here.
 *
 * Nothing streams. Codex has suppressed its message deltas on this wire since rust-v0.8.0, so
 * the message arrives whole, in one `item.completed`, after every tool line: a Codex turn shows
 * its commands one by one and then its reply all at once, and a panel that seems to hang before
 * the text is showing exactly what the CLI sends. Codex's other wire, `app-server`, does stream,
 * and is a JSON-RPC session rather than a pipe; Open Design carries a second transport for it,
 * and this panel does not.
 *
 * A turn that fails says so twice, as a bare `error` and then `turn.failed` with the same text.
 * Only the second ends the turn here, since a run may end once (agentRun.ts). The message is the
 * server's wording verbatim: on this machine the configured model is one the installed CLI is
 * too old for, and the sentence that says so is the whole diagnosis.
 *
 * Kept free of node and DOM APIs like claudeStream.ts, and the recorded fixtures next to the
 * test are the contract, except `file_change`, whose shape is Open Design's recording of the
 * same wire; no turn here has written a file yet.
 */
import type { ChatEvent } from "./claudeStream";

interface Frame {
  type: string;
  item?: Item;
  error?: { message?: string };
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
    case "turn.completed":
      return [{ kind: "end", ok: true }];
    case "turn.failed":
      return [{ kind: "end", ok: false, message: frame.error?.message || "turn failed" }];
    default:
      return [];
  }
}
