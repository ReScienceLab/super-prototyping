/**
 * The agents the chat panel can talk to, one object literal each: what to spawn, how the
 * preamble and the message reach it, and how to read what it writes back. The dev server looks
 * the spawn up here by the id the panel sends, and everything after the spawn — the run, its
 * events, the stream to the page — is the same for both (vite.config.ts, agentRun.ts).
 *
 * A table, after Open Design's `RuntimeAgentDef`, which has this shape for twenty-eight CLIs
 * over one shared engine; here it has the fields the two genuinely differ in. Claude Code takes
 * the preamble as a flag of its own and the message as one stream-json line, and writes where
 * it likes with its permission prompts off. Codex has no system-prompt flag, so the preamble
 * goes ahead of the message in the prompt itself, plain text on stdin; its sandbox writes the
 * working directory only, so the boards folder is named to it, since `sp-canvas --canvases` can
 * put that anywhere. Not a registry: a third agent is a third literal.
 *
 * Kept free of node APIs so the parsers it points at stay testable, and the page can import the
 * id type without the server.
 */
import { chatEventsFromLine, type ChatEvent } from "./claudeStream.ts";
import { codexEventsFromLine } from "./codexStream.ts";

export type AgentId = "claude" | "codex";

export interface AgentDef {
  id: AgentId;
  /** In the menu, and in the composer's placeholder. */
  name: string;
  bin: string;
  args(preamble: string, boards: string): string[];
  /** Everything written to the process's stdin, which is then closed. */
  stdin(message: string, preamble: string): string;
  events(line: string): ChatEvent[];
  /** What the run says when `bin` is not on PATH; the menu says it too, greyed. */
  missing: string;
}

export const AGENTS: AgentDef[] = [
  {
    id: "claude",
    name: "Claude Code",
    bin: "claude",
    args: (preamble) => [
      "-p",
      "--input-format", "stream-json",
      "--output-format", "stream-json",
      "--verbose",
      "--include-partial-messages",
      // The same trust as running claude in a terminal of the project, which is what the
      // panel replaces; the panel says so before the first message.
      "--permission-mode", "bypassPermissions",
      "--append-system-prompt", preamble,
    ],
    stdin: (message) =>
      JSON.stringify({ type: "user", message: { role: "user", content: message } }) + "\n",
    events: chatEventsFromLine,
    missing:
      "claude is not on PATH. Install Claude Code, or start sp-canvas from a shell where `claude` runs.",
  },
  {
    id: "codex",
    name: "Codex",
    bin: "codex",
    args: (_preamble, boards) => [
      "exec", "--json",
      "--skip-git-repo-check",
      // Codex's own sandbox, and the nearest it has to claude's mode above: the project, the
      // boards, /tmp, and the network.
      "--sandbox", "workspace-write",
      "-c", "sandbox_workspace_write.network_access=true",
      "--add-dir", boards,
      // Codex asks the API for a reasoning summary only when told to; without this the stream
      // carries no reasoning item at all on a turn that provably reasoned (Open Design measured
      // 516 reasoning tokens and no item). The summary is what becomes the thinking marker.
      "-c", 'model_reasoning_summary="detailed"',
    ],
    stdin: (message, preamble) => `${preamble}\n\n${message}`,
    events: codexEventsFromLine,
    missing:
      "codex is not on PATH. Install the Codex CLI, or start sp-canvas from a shell where `codex` runs.",
  },
];
