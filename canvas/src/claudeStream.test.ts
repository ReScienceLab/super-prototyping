import { describe, expect, it } from "vitest";
import { chatEventsFromLine, titleFilter } from "./claudeStream";
import sayHi from "./fixtures/claude-2.1.274-say-hi.jsonl?raw";
import titledHi from "./fixtures/claude-2.1.274-titled-hi.jsonl?raw";
import writeFile from "./fixtures/claude-2.1.274-write-file.jsonl?raw";

// The fixtures are recordings of `claude -p --input-format stream-json --output-format stream-json
// --verbose --include-partial-messages`, the shape vite.config.ts spawns, on Claude Code 2.1.274.
// The hook and init frames had their machine-local payloads cut down and the working directory
// was renamed; every frame is still there, in its recorded order.
const events = (jsonl: string) =>
  jsonl.trim().split("\n").flatMap(chatEventsFromLine);

describe("chatEventsFromLine", () => {
  it("streams the text once and ends on the result frame", () => {
    const got = events(sayHi);
    const text = got
      .flatMap((e) => (e.kind === "text" ? [e.text] : []))
      .join("");
    expect(text).toBe("Hi! 👋\n\nWhat are we working on?");
    expect(got.at(-1)).toEqual({ kind: "end", ok: true });
  });

  it("reports a tool call with its target, then its result", () => {
    const got = events(writeFile);
    expect(got.map((e) => e.kind)).toEqual([
      "thinking",
      "usage",
      "usage",
      "tool",
      "tool_done",
      "text",
      "usage",
      "usage",
      "end",
    ]);
    const tool = got.find((e) => e.kind === "tool");
    expect(tool).toEqual({
      kind: "tool",
      id: expect.stringMatching(/^toolu_/),
      name: "Write",
      detail: "/home/user/project/hi.txt",
    });
    expect(got.find((e) => e.kind === "tool_done")).toEqual({
      kind: "tool_done",
      id: (tool as { id: string }).id,
      ok: true,
    });
    expect(got.find((e) => e.kind === "text")).toEqual({
      kind: "text",
      text: "done",
    });
  });

  it("reports the window the last call filled, not every call added up", () => {
    const used = events(writeFile).flatMap((e) =>
      e.kind === "usage" && e.used !== undefined ? [e.used] : [],
    );
    // Two calls in this recording, the first reported twice because its message had two blocks.
    // It sent 7343 fresh tokens over 11974 cached; the second sent 3162 over 19317 — and that
    // 19317 *is* the first call's whole prompt, sent again, which is exactly what makes adding
    // the two together wrong. The result frame does add them, to cache_read 31291 and
    // cache_creation 10505, and that is a bill; the window itself never held more than 22482.
    expect(used).toEqual([19_321, 19_321, 22_482]);
    expect(2 + 3162 + 19_317 + 1).toBe(22_482);
    // Its size arrives on its own at the end of the turn. This one ran a sub-agent, which has a
    // window of its own; both are 200k here, and the bigger is the one the turn was up against.
    expect(events(writeFile).at(-2)).toEqual({
      kind: "usage",
      window: 200_000,
    });
  });

  it("skips a sub-agent frame and says why a run failed", () => {
    const subagent =
      '{"type":"assistant","parent_tool_use_id":"toolu_1","message":{"content":[{"type":"tool_use","id":"x","name":"Read","input":{}}]}}';
    expect(chatEventsFromLine(subagent)).toEqual([]);
    const failed =
      '{"type":"result","subtype":"error_during_execution","is_error":true,"result":"boom"}';
    expect(chatEventsFromLine(failed)).toEqual([
      { kind: "end", ok: false, message: "boom" },
    ]);
  });

  it("carries the pictures a tool handed back", () => {
    // The shape a Read of an image returns, recorded off a run that drew a grid over a reference:
    // blocks where another tool would have put a string, the bytes base64 in the image one.
    const drew =
      '{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"toolu_2","content":[{"type":"text","text":"read"},{"type":"image","source":{"type":"base64","media_type":"image/png","data":"iVBORw0KGgo="}}]}]}}';
    expect(chatEventsFromLine(drew)).toEqual([
      {
        kind: "tool_done",
        id: "toolu_2",
        ok: true,
        shots: [{ type: "image/png", data: "iVBORw0KGgo=" }],
      },
    ]);
    const said =
      '{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"toolu_3","content":"ok"}]}}';
    expect(chatEventsFromLine(said)).toEqual([
      { kind: "tool_done", id: "toolu_3", ok: true },
    ]);
  });
});

describe("titleFilter", () => {
  const filtered = (jsonl: string) => events(jsonl).flatMap(titleFilter());
  const text = (got: ReturnType<typeof events>) =>
    got.flatMap((e) => (e.kind === "text" ? [e.text] : [])).join("");

  it("lifts the title out of a reply that opens with the marker split across deltas", () => {
    // Recorded with the title sentence vite.config.ts appends to the system prompt; the marker
    // arrives as `<s`, `p`, `-title>Gre`, `eting`, ` Exchange</sp-title`, `>\n\nHi.`.
    const got = filtered(titledHi);
    expect(got.filter((e) => e.kind === "title")).toEqual([
      { kind: "title", title: "Greeting Exchange" },
    ]);
    expect(text(got)).toBe("Hi. What are we working on?");
    expect(got.at(-1)).toEqual({ kind: "end", ok: true });
  });

  it("passes a reply without the marker through as it was", () => {
    expect(filtered(sayHi)).toEqual(events(sayHi));
  });

  it("releases held text once it cannot be the marker, and flushes the rest at the end", () => {
    const tag = titleFilter();
    expect(tag({ kind: "text", text: "<s" })).toEqual([]);
    expect(tag({ kind: "text", text: "pan>" })).toEqual([
      { kind: "text", text: "<span>" },
    ]);
    const cut = titleFilter();
    expect(cut({ kind: "text", text: "<sp-t" })).toEqual([]);
    expect(cut({ kind: "end", ok: true })).toEqual([
      { kind: "text", text: "<sp-t" },
      { kind: "end", ok: true },
    ]);
  });

  it("drops the blank lines after the marker when they come in a later delta", () => {
    // Seen live: the closing tag as one delta, the model's first sentence in the next.
    const split = titleFilter();
    expect(
      split({ kind: "text", text: "<sp-title>Saying Hi</sp-title>" }),
    ).toEqual([{ kind: "title", title: "Saying Hi" }]);
    expect(split({ kind: "text", text: "\n\nHi!" })).toEqual([
      { kind: "text", text: "Hi!" },
    ]);
  });

  it("takes the title from the block after the tool call, which is where a working turn puts it", () => {
    // The ordinary shape: say what you are about to do, do it, then answer with the title on top.
    const later = titleFilter();
    expect(later({ kind: "text", text: "I'll look at the folder." })).toEqual([
      { kind: "text", text: "I'll look at the folder." },
    ]);
    expect(
      later({ kind: "tool", id: "t1", name: "Bash", detail: "ls" }),
    ).toEqual([{ kind: "tool", id: "t1", name: "Bash", detail: "ls" }]);
    expect(later({ kind: "tool_done", id: "t1", ok: true })).toEqual([
      { kind: "tool_done", id: "t1", ok: true },
    ]);
    expect(
      later({
        kind: "text",
        text: "<sp-title>Reading The Folder</sp-title>\n\nTwenty-nine boards.",
      }),
    ).toEqual([
      { kind: "title", title: "Reading The Folder" },
      { kind: "text", text: "Twenty-nine boards." },
    ]);
    // One title per turn: a marker in a third block is text like any other.
    expect(
      later({ kind: "tool", id: "t2", name: "Bash", detail: "ls" }),
    ).toHaveLength(1);
    expect(later({ kind: "text", text: "<sp-title>Again</sp-title>" })).toEqual(
      [{ kind: "text", text: "<sp-title>Again</sp-title>" }],
    );
  });
});
