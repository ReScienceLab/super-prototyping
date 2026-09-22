/**
 * The agents the chat panel can talk to, one object literal each: what to spawn, how the
 * preamble and the message reach it, how the model and the reasoning effort chosen in the
 * composer become flags, and how to read what it writes back. The dev server looks the spawn up
 * here by the id the panel sends, and everything after the spawn — the run, its events, the
 * stream to the page — is the same for both (vite.config.ts, agentRun.ts).
 *
 * A table, after Open Design's `RuntimeAgentDef`, which has this shape for twenty-eight CLIs
 * over one shared engine; here it has the fields the two genuinely differ in. Claude Code takes
 * the preamble as a flag of its own and the message as one stream-json line, and writes where
 * it likes with its permission prompts off. Codex has no system-prompt flag, so the preamble
 * goes ahead of the message in the prompt itself, plain text on stdin; its sandbox writes the
 * working directory only, so the boards folder is named to it, since the server is given that
 * apart from the project (server/sp.ts). Model and effort are a flag apiece on claude and a flag
 * and a config override on codex, and both are optional on both: nothing is sent unless the composer has
 * picked something, so the CLI's own configuration keeps deciding until the user says otherwise.
 * Not a registry: a third agent is a third literal.
 *
 * Kept free of node APIs so the parsers it points at stay testable, and the page can import the
 * id type without the server. `modelsFile` is how an agent that keeps its own list of models
 * says so without reading it here: a path under the home directory, and a pure function over
 * the parsed JSON. The server reads the file (vite.config.ts); this stays a table.
 */
import { chatEventsFromLine, type ChatEvent } from "./claudeStream.ts";
import { codexEventsFromLine } from "./codexStream.ts";

export type AgentId = "claude" | "codex";

/**
 * What a message can carry, said once for the composer and the server (ChatPanel.tsx,
 * vite.config.ts): the four types the CLIs read as images — not "anything image/", since an SVG
 * is a document that can carry a script, and the server serves a picture back on its own
 * origin — at most twenty of them, and under 24 MB of file together, which is the 48 MB body
 * the server takes once base64 has made them a third larger. The composer refuses at the
 * limit before reading a byte; the server refuses the same limit from a client that is not it.
 */
export const IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];
export const SVG_TYPE = "image/svg+xml";
/**
 * What the composer takes at the door, which is one more than what travels: an SVG is accepted
 * and drawn into a PNG on the way in (svgRaster.ts), so the vector itself never reaches the tray,
 * the server or the agent. The two lists differ by exactly that conversion — anything accepted
 * here is an IMAGE_TYPE by the time it is numbered.
 */
export const ATTACH_TYPES = [...IMAGE_TYPES, SVG_TYPE];
export const MAX_IMAGES = 20;
export const MAX_IMAGE_BYTES = 24_000_000;

/** One model in the composer's picker. */
export interface AgentModel {
  /** What the CLI is given; the empty string is the CLI's own default, which is never sent. */
  id: string;
  name: string;
  /** Tokens the model can hold, when the agent says; the context readout's denominator. */
  window?: number;
  /** The efforts this model takes, when they differ from the agent's; the slider's positions. */
  efforts?: string[];
}

/**
 * An image the composer attached, as the run holds it. `n` is the number the composer drew on the
 * tile and the number the message refers to, so it is the image's name on both sides of the pipe:
 * the panel writes "#2" in the sentence, and whichever form the agent is handed below carries the
 * same "#2" beside the picture.
 */
export interface AgentImage {
  n: number;
  /** What the browser called the file; a caption, never a path. */
  name: string;
  /** The media type the browser reported, `image/png` and the like. */
  type: string;
  /** The bytes, base64, with no `data:` prefix. */
  data: string;
  /** Where the server wrote it, for an agent that takes files rather than bytes; gone once
   *  that agent has exited. */
  path: string;
}

/** What the composer chose, handed to `args`. An empty string means the CLI decides. */
export interface RunSpec {
  preamble: string;
  boards: string;
  model: string;
  effort: string;
  /** Where this run's images were written, or empty when it has none. */
  imagesDir: string;
}

export interface AgentDef {
  id: AgentId;
  /** In the menu, and in the composer's placeholder. */
  name: string;
  bin: string;
  args(spec: RunSpec): string[];
  /** Everything written to the process's stdin, which is then closed. */
  stdin(message: string, preamble: string, images: AgentImage[]): string;
  events(line: string): ChatEvent[];
  /** The models to offer when the agent keeps no list of its own. */
  models: AgentModel[];
  /** The reasoning efforts to offer, fastest first, for a model that names none itself. */
  efforts: string[];
  /** Where the agent keeps its own list, relative to the home directory, if it keeps one. */
  modelsFile?: { path: string; read(json: unknown): AgentModel[] };
  /**
   * The agent's own slash commands, read off a line it writes, for the composer's palette. Claude
   * Code names them all on the init frame of every run — the project's, the personal ones, the
   * installed plugins' and the skills, namespaced as it namespaces them — so the palette is the
   * CLI's list rather than a second discovery of it that goes stale. The frame rides along on
   * the messages the user sends anyway, so a panel in use keeps the list current for free; it is
   * `commandsProbe` that gets the first one. An agent with no such line leaves this out.
   */
  commands?(line: string): string[] | null;
  /**
   * What to run when no line has carried the list yet. Claude Code has one but only mid-run, so
   * until the first message — and after every dev-server restart, which empties the map — the
   * palette would be blank; the probe asks for that same init frame by sending the one command
   * the CLI answers by itself, and throws the answer away.
   * Codex has no such frame at all: what a slash means to it is a skill, and skills do reach
   * `codex exec` — it lists them to the model in the prompt it composes, and `codex debug
   * prompt-input` composes that prompt without sending it. Either way the list is the CLI's own,
   * costs no turn, and covers the project's, the personal, the plugins' and the skills. Run once
   * for the server's lifetime, the first time the palette opens for that agent.
   */
  commandsProbe?: { args: string[]; read(stdout: string): string[] };
  /** What the run says when `bin` is not on PATH; the menu says it too, greyed. */
  missing: string;
  /** Where to get it, which the onboarding links to when it is missing. */
  site: string;
}

/** The shape of the models codex caches from its server; only these fields are read. */
interface CodexModel {
  slug: string;
  display_name: string;
  context_window: number;
  priority: number;
  visibility: string;
  supported_reasoning_levels: { effort: string }[];
}

/**
 * Claude Code's slash commands off the one frame that lists them, null off every other line.
 * Both ways in read this: the run the panel is pumping, and the probe that starts a run for no
 * other reason than this frame.
 */
const claudeCommands = (line: string): string[] | null => {
  const frame = JSON.parse(line) as {
    type?: string;
    subtype?: string;
    slash_commands?: string[];
  };
  return frame.type === "system" && frame.subtype === "init"
    ? (frame.slash_commands ?? null)
    : null;
};

export const AGENTS: AgentDef[] = [
  {
    id: "claude",
    name: "Claude Code",
    bin: "claude",
    args: ({ preamble, model, effort }) => [
      "-p",
      "--input-format",
      "stream-json",
      "--output-format",
      "stream-json",
      "--verbose",
      "--include-partial-messages",
      // The same trust as running claude in a terminal of the project, which is what the
      // panel replaces; the panel says so before the first message.
      "--permission-mode",
      "bypassPermissions",
      "--append-system-prompt",
      preamble,
      ...(model ? ["--model", model] : []),
      ...(effort ? ["--effort", effort] : []),
    ],
    // With images the content is a list of blocks rather than a string: each picture goes in
    // behind the marker that names it, so the "#2" in the sentence lands on the block above it.
    // `[Image #2]` is the marker Claude Code writes itself when a screenshot is pasted into its
    // terminal, so the number arrives as something already read rather than a local convention.
    stdin: (message, _preamble, images) => {
      const blocks = images.flatMap((i) => [
        { type: "text", text: `[Image #${i.n}] ${i.name}` },
        {
          type: "image",
          source: { type: "base64", media_type: i.type, data: i.data },
        },
      ]);
      const content = blocks.length
        ? [...blocks, { type: "text", text: message }]
        : message;
      return (
        JSON.stringify({ type: "user", message: { role: "user", content } }) +
        "\n"
      );
    },
    events: chatEventsFromLine,
    // `claude -p` runs a slash command sent as the message text, the same as the terminal does:
    // a command, a skill, a plugin's command. Codex has neither — `codex exec` hands `/foo` to
    // the model as the five characters it is — so it defines none of this.
    commands: claudeCommands,
    // The same init frame, asked for rather than waited for. A prompt is required — with none,
    // `claude -p` exits before it says hello — and `/help` is the one that answers itself: the
    // CLI runs it locally, so the result frame comes back `num_turns: 0`, `duration_api_ms: 0`,
    // `total_cost_usd: 0`, measured. Its output is thrown away; the init frame above it is the
    // point. The budget is the belt, in case a version ever sends `/help` to the model instead.
    commandsProbe: {
      args: [
        "-p",
        "/help",
        "--max-budget-usd",
        "0.0000001",
        "--output-format",
        "stream-json",
        "--verbose",
      ],
      read: (stdout) => {
        for (const line of stdout.split("\n")) {
          try {
            const list = claudeCommands(line);
            if (list) return list;
          } catch {
            // The hook frames around it, and the blank line at the end.
          }
        }
        return [];
      },
    },
    // Aliases rather than versioned names, which is what `claude --model` documents: the alias
    // follows the latest of its line, so this list does not go stale between releases. Claude
    // Code has no list of its own on disk to read, and the window comes off every result frame.
    models: [
      { id: "opus", name: "Opus 5" },
      { id: "fable", name: "Fable 5.1" },
      { id: "sonnet", name: "Sonnet 5" },
      { id: "haiku", name: "Haiku 4.5" },
    ],
    efforts: ["low", "medium", "high", "xhigh", "max"],
    missing:
      "claude is not on PATH. Install Claude Code, or run `sp start` from a shell where `claude` runs.",
    site: "https://claude.com/product/claude-code",
  },
  {
    id: "codex",
    name: "Codex",
    bin: "codex",
    args: ({ boards, model, effort, imagesDir }) => [
      "exec",
      "--json",
      "--skip-git-repo-check",
      // Codex's own sandbox, and the nearest it has to claude's mode above: the project, the
      // boards, /tmp, and the network.
      "--sandbox",
      "workspace-write",
      "-c",
      "sandbox_workspace_write.network_access=true",
      "--add-dir",
      boards,
      // And this run's images, which the server wrote under the system temp directory: whether
      // the sandbox reaches that on its own is a per-platform question, and naming it is two
      // words instead of an answer.
      ...(imagesDir ? ["--add-dir", imagesDir] : []),
      // Codex asks the API for a reasoning summary only when told to; without this the stream
      // carries no reasoning item at all on a turn that provably reasoned (Open Design measured
      // 516 reasoning tokens and no item). The summary is what becomes the thinking marker.
      "-c",
      'model_reasoning_summary="detailed"',
      ...(model ? ["-m", model] : []),
      // No flag of its own: effort is a config key, and codex takes no opinion on the value at
      // startup — a level the model does not have fails on the API's answer, in the turn.
      ...(effort ? ["-c", `model_reasoning_effort="${effort}"`] : []),
    ],
    // Codex takes a prompt and nothing else, so an image is a path it is told to open rather
    // than bytes handed over; with none attached this is the preamble and the message it was.
    stdin: (message, preamble, images) =>
      [
        preamble,
        images.map((i) => `[Image #${i.n}] ${i.path}`).join("\n"),
        message,
      ]
        .filter(Boolean)
        .join("\n\n"),
    events: codexEventsFromLine,
    // Codex's models come from its server and change between releases, so nothing is listed
    // here: the cache below is the same list its own picker draws, and an empty one leaves the
    // composer with the default alone, which is what the CLI would have used anyway.
    models: [],
    efforts: ["low", "medium", "high", "xhigh"],
    modelsFile: {
      path: ".codex/models_cache.json",
      read: (json) =>
        ((json as { models?: CodexModel[] }).models ?? [])
          .filter((m) => m.visibility === "list")
          .sort((a, b) => a.priority - b.priority)
          .map((m) => ({
            id: m.slug,
            name: m.display_name,
            window: m.context_window,
            efforts: m.supported_reasoning_levels.map((e) => e.effort),
          })),
    },
    commandsProbe: {
      args: ["debug", "prompt-input"],
      // The prompt is a list of messages; the skills live in one of them, under a heading that
      // also lists their roots as "- `r0` = ...". A root's name is backquoted, so a bare name is
      // the entry and nothing else is.
      read: (stdout) => {
        const skills = (
          JSON.parse(stdout) as { content?: { text?: string }[] }[]
        )
          .flatMap((m) => m.content ?? [])
          .map((c) => c.text ?? "")
          .find((t) => t.includes("<skills_instructions>"));
        // A Set because a skill reachable from two roots is listed under both.
        return skills
          ? [
              ...new Set(
                [...skills.matchAll(/^- ([\w.:-]+): /gm)].map((m) => m[1]!),
              ),
            ]
          : [];
      },
    },
    missing:
      "codex is not on PATH. Install the Codex CLI, or run `sp start` from a shell where `codex` runs.",
    site: "https://openai.com/codex/",
  },
];
