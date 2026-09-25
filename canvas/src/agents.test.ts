import { describe, expect, it } from "vitest";
import { AGENTS } from "./agents";
import cache from "./fixtures/codex-0.154.0-models-cache.json";

const def = (id: string) => AGENTS.find((a) => a.id === id)!;
const spec = {
  preamble: "P",
  project: "/proj",
  model: "",
  effort: "",
  imagesDir: "",
  resume: "",
};

describe("AGENTS", () => {
  it("sends no model or effort flag until the composer has picked one", () => {
    for (const agent of AGENTS) {
      const args = agent.args(spec).join(" ");
      expect(args).not.toMatch(
        /--model|--effort|model_reasoning_effort|(^| )-m( |$)/,
      );
    }
  });

  it("puts the choice on each CLI in its own words", () => {
    expect(
      def("claude").args({ ...spec, model: "opus", effort: "high" }),
    ).toEqual(expect.arrayContaining(["--model", "opus", "--effort", "high"]));
    // Codex has no effort flag: the level is a config override, and the model a short flag.
    const codex = def("codex").args({
      ...spec,
      model: "gpt-6-astra",
      effort: "xhigh",
    });
    expect(codex).toEqual(expect.arrayContaining(["-m", "gpt-6-astra"]));
    expect(codex).toEqual(
      expect.arrayContaining(["-c", 'model_reasoning_effort="xhigh"']),
    );
  });

  // The number the composer drew on the tile is the image's name on both sides of the pipe: the
  // sentence says "#4", and whichever form the agent takes carries "#4" beside that picture.
  it("hands each agent its images in the form that agent takes", () => {
    const images = [
      {
        n: 1,
        name: "home.png",
        type: "image/png",
        data: "AAA",
        path: "/tmp/sp-chat-r/1.png",
      },
      {
        n: 4,
        name: "cart.png",
        type: "image/jpeg",
        data: "BBB",
        path: "/tmp/sp-chat-r/4.jpeg",
      },
    ];
    const claude = JSON.parse(
      def("claude").stdin("borrow #4 for #1", "P", images),
    );
    expect(claude.message.content).toEqual([
      { type: "text", text: "[Image #1] home.png" },
      {
        type: "image",
        source: { type: "base64", media_type: "image/png", data: "AAA" },
      },
      { type: "text", text: "[Image #4] cart.png" },
      {
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: "BBB" },
      },
      { type: "text", text: "borrow #4 for #1" },
    ]);
    // Codex takes a prompt and nothing else, so an image is a path it is told to open, and the
    // folder holding them is named to its sandbox.
    expect(def("codex").stdin("borrow #4 for #1", "P", images)).toBe(
      "P\n\n[Image #1] /tmp/sp-chat-r/1.png\n[Image #4] /tmp/sp-chat-r/4.jpeg\n\nborrow #4 for #1",
    );
    expect(def("codex").args({ ...spec, imagesDir: "/tmp/sp-chat-r" })).toEqual(
      expect.arrayContaining([
        "-c",
        'sandbox_workspace_write.writable_roots=["/proj","/tmp/sp-chat-r"]',
      ]),
    );
  });

  // A session is what the agent called it on its first turn, and every later turn resumes that.
  it("reads the session off the first turn and resumes it on the next", () => {
    expect(
      def("claude").session(
        '{"type":"system","subtype":"init","session_id":"c-1","slash_commands":[]}',
      ),
    ).toBe("c-1");
    expect(def("claude").session('{"type":"assistant"}')).toBeNull();
    expect(
      def("codex").session('{"type":"thread.started","thread_id":"x-1"}'),
    ).toBe("x-1");
    expect(def("codex").session('{"type":"turn.started"}')).toBeNull();

    expect(def("claude").args(spec)).not.toContain("--resume");
    expect(def("claude").args({ ...spec, resume: "c-1" })).toEqual(
      expect.arrayContaining(["--resume", "c-1", "--add-dir", "/proj"]),
    );
    expect(def("codex").args(spec).slice(0, 2)).toEqual(["exec", "--json"]);
    const codex = def("codex").args({ ...spec, resume: "x-1" });
    expect(codex.slice(0, 3)).toEqual(["exec", "resume", "x-1"]);
    // `exec resume` reads stdin only when told to, and takes no `--sandbox`.
    expect(codex.at(-1)).toBe("-");
    expect(codex).not.toContain("--sandbox");
  });

  // Attaching nothing writes what it always wrote, byte for byte.
  it("sends the message it used to when nothing is attached", () => {
    expect(JSON.parse(def("claude").stdin("hi", "P", [])).message.content).toBe(
      "hi",
    );
    expect(def("codex").stdin("hi", "P", [])).toBe("P\n\nhi");
    expect(def("codex").args(spec)).toContain(
      'sandbox_workspace_write.writable_roots=["/proj"]',
    );
  });

  // The fixture is ~/.codex/models_cache.json as codex 0.154.0 wrote it, with the fields this
  // does not read cut out; the models, their order and their levels are as recorded.
  it("reads codex models from the list codex itself caches, as its own picker shows them", () => {
    const models = def("codex").modelsFile!.read(cache);
    expect(models.map((m) => m.name)).toEqual([
      "GPT-5.6-Sol",
      "GPT-6-Astra",
      "GPT-5.6-Terra",
      "GPT-5.6-Luna",
      "GPT-5.5",
    ]);
    expect(models[1]).toEqual({
      id: "gpt-6-astra",
      name: "GPT-6-Astra",
      window: 272_000,
      efforts: ["low", "medium", "high", "xhigh", "max", "ultra"],
    });
    // Not every model takes every level, which is why the slider reads them off the model.
    expect(models.at(-1)!.efforts).toEqual(["low", "medium", "high", "xhigh"]);
  });

  it("offers nothing when codex has cached nothing", () => {
    expect(def("codex").modelsFile!.read({})).toEqual([]);
  });

  // Claude Code names every slash command it can run on the init frame of a run — the project's,
  // the personal ones, the plugins' and the skills — so the palette costs no spawn of its own.
  it("takes claude's slash commands off the frame that lists them, and nothing off the rest", () => {
    const init =
      '{"type": "system", "subtype": "init", "cwd": "/p", "session_id": "s", "model": "claude-haiku-4-5-20251001", "slash_commands": ["sp-clone-prototype", "ponytail:ponytail", "review"]}';
    expect(def("claude").commands!(init)).toEqual([
      "sp-clone-prototype",
      "ponytail:ponytail",
      "review",
    ]);
    expect(
      def("claude").commands!(
        '{"type": "assistant", "message": {"role": "assistant", "content": []}}',
      ),
    ).toBeNull();
  });

  // Codex announces nothing in its stream, so its list is asked for instead. What a slash means
  // to codex is a skill, and the skills it would tell the model about are in the prompt it will
  // compose — roots and all, which must not be read as skills.
  it("reads codex's skills out of the prompt it would have sent", () => {
    const skills = [
      "<skills_instructions>",
      "## Skills",
      "### Skill roots",
      "- `r0` = `/Users/x/.codex/skills`",
      "### Available skills",
      "- imagegen: Generate or edit raster images (file: r0/imagegen/SKILL.md)",
      "- ponytail:ponytail-audit: Audit for complexity (file: r1/ponytail/SKILL.md)",
      "</skills_instructions>",
    ].join("\n");
    const prompt = JSON.stringify([
      { role: "developer", content: [{ type: "input_text", text: skills }] },
      { role: "user", content: [{ type: "input_text", text: "hi" }] },
    ]);
    expect(def("codex").commandsProbe!.read(prompt)).toEqual([
      "imagegen",
      "ponytail:ponytail-audit",
    ]);
    expect(def("codex").commandsProbe!.read("[]")).toEqual([]);
    // Nothing in codex's stream carries them, which is why it is asked at all.
    expect(def("codex").commands).toBeUndefined();
  });

  // Claude's list rides along on runs, but only once one has started: before the first message,
  // and after a restart empties the server's map, the probe asks for the frame on its own. It
  // reads the same stdout, so the lines around the frame must not stop it — the hook ones parse
  // and are not it, the blank one at the end does not parse at all.
  it("reads claude's commands out of what the probe printed around them", () => {
    const probe = def("claude").commandsProbe!;
    // Names nothing here has heard of, on purpose: the palette is whatever that install of that
    // CLI says it can run today. Nowhere is there a list of commands to fall behind a release.
    expect(
      probe.read(
        [
          '{"type":"system","subtype":"hook_started","hook_name":"SessionStart"}',
          '{"type":"system","subtype":"init","cwd":"/p","slash_commands":["not-a-command-yet","some-plugin:shipped-tomorrow"]}',
          '{"type":"result","subtype":"success","num_turns":0,"total_cost_usd":0}',
          "",
        ].join("\n"),
      ),
    ).toEqual(["not-a-command-yet", "some-plugin:shipped-tomorrow"]);
    // A version that says it some other way, or a spawn that failed: no palette, not a crash.
    expect(probe.read("")).toEqual([]);
    // The prompt is the one thing about the probe that is a literal, and it is how to ask, not
    // what comes back: `/help` is the command the CLI answers by itself, so no turn and no bill.
    // A release that dropped it would still print the init frame this reads — the budget below
    // is what keeps that from quietly costing money.
    expect(probe.args).toContain("/help");
    expect(probe.args).toContain("--max-budget-usd");
  });
});
