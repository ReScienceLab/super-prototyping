/**
 * Claude Code's stream-json output, reduced to what the chat panel draws.
 *
 * `claude -p --output-format stream-json --include-partial-messages` writes one JSON frame per
 * line. The panel wants five things out of them: text as it arrives, that the model is thinking,
 * each tool call as it starts and when it finishes, and the end of the run, and what the turn
 * cost the context window. Everything else — the init frame, hook frames, rate-limit notices —
 * is dropped here.
 *
 * Text comes only from `stream_event` deltas, never from the `assistant` frame that repeats each
 * finished message in full: taking both would print every paragraph twice. Tool calls come only
 * from the `assistant` frame, because that is where `input` is complete — the deltas carry it as
 * JSON fragments. Tool results come from the `user` frame that carries them back, and with them
 * any picture the tool returned — the working images of a clone arrive here rather than being
 * watched for on disk. Frames with a `parent_tool_use_id` belong to a sub-agent and are skipped
 * whole.
 *
 * Thinking is a marker, not text: on 2.1.274 every thinking delta arrives with an empty string
 * and a token estimate, so there is nothing to show but that it happened.
 *
 * The title is asked for in the system prompt, as `<sp-title>…</sp-title>` at the head of the
 * reply, and `titleFilter` lifts it out of the text into a `title` event on the server, before
 * anything is emitted, so the page never sees the marker as text. Two events are the server's
 * own rather than the parser's: `start`, written when the run is created with which agent runs
 * it, and that `title`. Both parsers produce this union; codexStream.ts is the other.
 *
 * A run has one terminal frame, `result`, on every build of Claude Code, so it is the only thing
 * that ends a turn here. The CLI also reports a `stop_reason`, on a frame that has moved between
 * releases; a host that keeps stdin open for further turns has to read it to know when to write
 * again. This host closes stdin after the one message, so it does not.
 *
 * Kept free of node and DOM APIs so the dev server and vitest both import it, and the recorded
 * fixtures next to the test are the whole contract.
 */
import type { AgentId } from "./agents.ts";

export type ChatEvent =
  | {
      kind: "start";
      agent: AgentId;
      prompt: string;
      title: string;
      at: number;
      /**
       * What the composer attached, by the number the message refers to. The picture itself is a
       * request away (`/run/<id>/image/<n>`), so a reload — which is how a written board reaches
       * the page — rebuilds the strip without carrying the bytes through the stream again.
       */
      images?: { n: number; name: string }[];
    }
  | { kind: "title"; title: string }
  | { kind: "text"; text: string }
  | { kind: "thinking" }
  | { kind: "tool"; id: string; name: string; detail: string }
  | { kind: "tool_done"; id: string; ok: boolean; shots?: Shot[] }
  /**
   * How full the window is, and how big it is. Two numbers from two different frames — the
   * occupancy off every assistant message, the size only at the end of the turn — so each arrives
   * on its own and the panel keeps whichever it has been told.
   */
  | { kind: "usage"; used?: number; window?: number }
  | { kind: "end"; ok: boolean; message?: string };

/**
 * A picture a tool handed back: the grid refkit draws over a reference, a crop, a screenshot —
 * the working images of a clone, which the panel draws under the call that produced them.
 *
 * Two shapes, one on each side of the dev server. The parser lifts the bytes off the frame; the
 * server files them under the run and passes on only `k`, the number to ask for them by, for the
 * same reason the composer's attachments are served rather than replayed: the page rebuilds every
 * turn from event zero after the reload a written board causes, and a full-page grid is megabytes.
 */
export type Shot = { type: string; data: string } | { k: number };

/** The parts of a frame this reads; the rest of Claude Code's schema stays untyped. */
interface Frame {
  type: string;
  subtype?: string;
  parent_tool_use_id?: string | null;
  event?: {
    type: string;
    content_block?: { type: string };
    delta?: { type: string; text?: string };
  };
  message?: { content: string | Block[]; usage?: Record<string, number> };
  is_error?: boolean;
  result?: string;
  modelUsage?: Record<string, { contextWindow?: number }>;
}

type Block =
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    }
  | {
      type: "tool_result";
      tool_use_id: string;
      is_error?: boolean;
      /** A string for most tools; the blocks the model was handed when one returned pictures. */
      content?: string | ResultBlock[];
    }
  | { type: "text" | "thinking" };

interface ResultBlock {
  type: string;
  source?: { type: string; media_type: string; data: string };
}

// ponytail: one line per call from whichever argument names its target; the panel truncates it.
const toolDetail = (input: Record<string, unknown>) =>
  String(
    input.file_path ??
      input.path ??
      input.command ??
      input.pattern ??
      input.url ??
      input.description ??
      input.skill ??
      "",
  );

export function chatEventsFromLine(line: string): ChatEvent[] {
  const frame: Frame = JSON.parse(line);
  if (frame.parent_tool_use_id) return [];
  const blocks = Array.isArray(frame.message?.content)
    ? frame.message.content
    : [];
  switch (frame.type) {
    case "stream_event": {
      const e = frame.event!;
      if (
        e.type === "content_block_start" &&
        e.content_block!.type === "thinking"
      ) {
        return [{ kind: "thinking" }];
      }
      if (e.type === "content_block_delta" && e.delta!.type === "text_delta") {
        return [{ kind: "text", text: e.delta!.text! }];
      }
      return [];
    }
    case "assistant":
      return [
        ...occupancy(frame),
        ...blocks.flatMap((b) =>
          b.type === "tool_use"
            ? [
                {
                  kind: "tool" as const,
                  id: b.id,
                  name: b.name,
                  detail: toolDetail(b.input),
                },
              ]
            : [],
        ),
      ];
    case "user":
      return blocks.flatMap((b) => {
        if (b.type !== "tool_result") return [];
        // The pictures in what the tool returned. Read hands an image back as a base64 block
        // where another tool would have put text — so the panel gets the grid the agent is
        // looking at for free, without anyone watching the project directory for files.
        const shots = Array.isArray(b.content)
          ? b.content.flatMap((c) =>
              c.type === "image" && c.source?.type === "base64"
                ? [{ type: c.source.media_type, data: c.source.data }]
                : [],
            )
          : [];
        return [
          {
            kind: "tool_done" as const,
            id: b.tool_use_id,
            ok: !b.is_error,
            shots: shots.length ? shots : undefined,
          },
        ];
      });
    case "result": {
      const ok = frame.subtype === "success" && !frame.is_error;
      return [
        ...windowSize(frame),
        ok
          ? { kind: "end", ok }
          : { kind: "end", ok, message: frame.result || frame.subtype },
      ];
    }
    default:
      return [];
  }
}

/**
 * How much of the window the turn is holding, off each assistant message: the whole prompt that
 * call was sent — fresh, cached and read alike, since a cached token occupies the window exactly
 * as a fresh one does — and the answer it got back, which the next call sends again.
 *
 * Read per call and replaced, never added up, which is the whole point of reading it here rather
 * than off the result frame. That frame carries the same four fields summed over every call the
 * turn made: a billing total, not an occupancy. Each call re-sends the entire conversation, so
 * every earlier call's prompt arrives again inside the next one's `cache_read_input_tokens` — in
 * the write-file fixture the second call's 19,317 cached tokens *are* the first call's whole
 * prompt. A turn of a dozen tool calls therefore reports several times the window it ever filled,
 * which is how a 200k window came to show 437k used.
 *
 * Claude Code writes one assistant frame per content block and puts the same usage on each, so a
 * message with four blocks says the same thing four times. Last write wins and they are all the
 * same write.
 */
function occupancy(frame: Frame): ChatEvent[] {
  const u = frame.message?.usage;
  if (!u) return [];
  return [
    {
      kind: "usage",
      used:
        (u.input_tokens ?? 0) +
        (u.cache_creation_input_tokens ?? 0) +
        (u.cache_read_input_tokens ?? 0) +
        (u.output_tokens ?? 0),
    },
  ];
}

/**
 * How big that window is, off the result frame, which is the only place either parser is told it.
 * `modelUsage` is keyed by the model that ran; a turn that ran a sub-agent reports both, and the
 * bigger window is the one the turn was up against.
 *
 * A run that failed before the API answered names no model, and reports no size.
 */
function windowSize(frame: Frame): ChatEvent[] {
  const window = Math.max(
    0,
    ...Object.values(frame.modelUsage ?? {}).map((m) => m.contextWindow ?? 0),
  );
  return window ? [{ kind: "usage", window }] : [];
}

const TITLE_OPEN = "<sp-title>";
const TITLE_CLOSE = "</sp-title>";

/**
 * Lifts the title marker out of the text. The marker arrives split across deltas (`<s`, `p`,
 * `-title>Gre`, … in the recorded fixture), so text is held while it could still be the marker —
 * leading whitespace, or a prefix of the opening tag — and released the moment it cannot be. The
 * blank lines the model puts between the marker and its first sentence go with the marker,
 * whichever delta they arrive in. A block that opens with anything else costs one held delta;
 * whatever is held when the run ends is flushed as text.
 *
 * Every block gets that chance, not only the first. A turn that opens by saying what it is about
 * to do, runs a tool and titles the reply after it is the ordinary shape of a turn that has work
 * to do, and the title belongs in the header either way; a tool call between two blocks of text
 * re-arms the filter, until a title has been lifted.
 */
export function titleFilter(): (e: ChatEvent) => ChatEvent[] {
  let held: string | null = ""; // text not yet released; null once it flows through untouched
  let titled = false;
  return (e) => {
    if (e.kind !== "text" && e.kind !== "end") {
      if (!titled && held === null) held = ""; // A tool ends a block; the next one may be titled.
      return [e];
    }
    if (held === null) return [e];
    if (e.kind === "end") {
      const text = held.trim();
      held = null;
      return text ? [{ kind: "text", text }, e] : [e];
    }
    held += e.text;
    let lead = held.trimStart();
    const out: ChatEvent[] = [];
    if (!titled && lead.startsWith(TITLE_OPEN)) {
      const close = lead.indexOf(TITLE_CLOSE);
      if (close < 0) return out;
      const title = lead.slice(TITLE_OPEN.length, close).trim();
      if (title) out.push({ kind: "title", title });
      titled = true;
      lead = lead.slice(close + TITLE_CLOSE.length).trimStart();
      held = lead;
    }
    // Still only whitespace, or still a possible start of the marker: wait for more.
    if (!lead || (!titled && TITLE_OPEN.startsWith(lead))) return out;
    held = null;
    out.push({ kind: "text", text: lead });
    return out;
  };
}
