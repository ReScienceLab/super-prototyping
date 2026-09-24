import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it, vi } from "vitest";
import { createSpServer } from "./sp.ts";

// The examples directory is listed beside the project's canvases, shadowed by a folder of the
// project's own, refused every write, and cloned into the project.
it("shows the examples read-only beside the project's canvases", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sp-examples-"));
  const canvas = (root: string, slug: string, name: string) => {
    fs.mkdirSync(path.join(tmp, root, slug), { recursive: true });
    fs.writeFileSync(path.join(tmp, root, slug, "01-a.html"), name);
    fs.writeFileSync(
      path.join(tmp, root, slug, "layout.json"),
      JSON.stringify({ name, rows: [{ files: [{ file: "01-a" }] }] }),
    );
  };
  // Named so that the merged list is in slug order only if the server sorts it.
  canvas("examples", "an-example", "example");
  canvas("examples", "shadowed", "example");
  canvas("project", "shadowed", "mine");
  // A folder the project has begun under an example's name, with no board in it yet.
  canvas("examples", "begun", "example");
  fs.mkdirSync(path.join(tmp, "project/begun"));

  const canvasesDir = path.join(tmp, "project");
  const { ask, close } = await serve({
    canvasesDir,
    examplesDir: path.join(tmp, "examples"),
    projects: () => new Map(),
    projectDir: tmp,
    repoRoot: tmp,
  });
  try {
    const index = JSON.parse((await ask("/__sp/index.json")).text);
    expect(
      index.boards.map((b: any) => [b.slug, b.layout.name, b.example]),
    ).toEqual([
      ["an-example", "example", true],
      ["begun", "example", true],
      ["shadowed", "mine", undefined],
    ]);
    expect((await ask("/board/an-example/01-a.html")).text).toBe("example");
    expect((await ask("/board/shadowed/01-a.html")).text).toBe("mine");

    const ground = { ground: "#000000" };
    expect(
      (await ask("/__sp/canvas-ground", { slug: "an-example", ...ground }))
        .status,
    ).toBe(403);
    expect(
      (await ask("/__sp/canvas-ground", { slug: "shadowed", ...ground }))
        .status,
    ).toBe(200);
    // A name in neither place is not an example, and gets the answer it got before.
    expect(
      (await ask("/__sp/canvas-ground", { slug: "nowhere", ...ground })).status,
    ).not.toBe(403);
    const comment = { slug: "an-example", file: { records: [{}] } };
    expect((await ask("/__sp/comments", comment)).status).toBe(403);

    const clone = { slug: "an-example", name: "Mine now" };
    expect((await ask("/__sp/clone-canvas", clone)).status).toBe(200);
    expect(
      fs.readFileSync(path.join(canvasesDir, "mine-now/01-a.html"), "utf8"),
    ).toBe("example");
    expect(
      fs.readdirSync(path.join(tmp, "examples/an-example")).sort(),
    ).toEqual(["01-a.html", "layout.json"]);

    // The strip's "+": an empty canvas each time, named in its tab afterwards.
    expect(JSON.parse((await ask("/__sp/new-canvas", {})).text).slug).toBe(
      "untitled",
    );
    expect(JSON.parse((await ask("/__sp/new-canvas", {})).text).slug).toBe(
      "untitled-2",
    );
    const named = { slug: "untitled", name: "Onboarding" };
    expect((await ask("/__sp/canvas-name", named)).status).toBe(200);
    expect(
      (await ask("/__sp/canvas-name", { slug: "an-example", name: "x" }))
        .status,
    ).toBe(403);
    const made = JSON.parse((await ask("/__sp/index.json")).text).boards;
    expect(
      made
        .filter((b: any) => b.slug.startsWith("untitled"))
        .map((b: any) => b.layout.name),
    ).toEqual(["Onboarding", "Untitled"]);
    // Each after the last, whatever its name sorts as.
    expect(
      made
        .filter((b: any) => b.slug.startsWith("untitled"))
        .map((b: any) => b.layout.order),
    ).toEqual([1, 2]);

    // What a person puts on it: files into files/, served back from /board, and the records
    // into canvas.json, which an emptied page keeps with no records.
    const file = "/__sp/canvas-file?slug=untitled&name=asset-1.png";
    expect((await ask(file, {})).status).toBe(200);
    expect((await ask("/board/untitled/files/asset-1.png")).text).toBe("{}");
    expect((await ask(file.replace(".png", ".html"), {})).status).toBe(415);
    expect((await ask(file.replace("untitled", "an-example"), {})).status).toBe(
      403,
    );
    const content = (records: object[]) => ({
      slug: "untitled",
      file: { tldraw: {}, records },
    });
    const saved = path.join(canvasesDir, "untitled/canvas.json");
    expect(
      (await ask("/__sp/canvas-content", content([{ id: "shape:a" }]))).status,
    ).toBe(200);
    expect(JSON.parse(fs.readFileSync(saved, "utf8")).records).toEqual([
      { id: "shape:a" },
    ]);
    expect(
      JSON.parse((await ask("/__sp/index.json")).text).boards.find(
        (b: any) => b.slug === "untitled",
      ).content.records,
    ).toEqual([{ id: "shape:a" }]);
    await ask("/__sp/canvas-content", content([]));
    expect(JSON.parse(fs.readFileSync(saved, "utf8")).records).toEqual([]);
    // A page's older write that lands after its newer one is dropped.
    const numbered = (id: string, seq: number) => ({
      ...content([{ id }]),
      by: "p",
      seq,
    });
    await ask("/__sp/canvas-content", numbered("shape:new", 2));
    await ask("/__sp/canvas-content", numbered("shape:old", 1));
    expect(JSON.parse(fs.readFileSync(saved, "utf8")).records).toEqual([
      { id: "shape:new" },
    ]);
    // One that will not parse is sent as null, which the page leaves alone.
    fs.writeFileSync(saved, "{");
    const reread = JSON.parse((await ask("/__sp/index.json")).text);
    expect(reread.boards.find((b: any) => b.slug === "untitled").content).toBe(
      null,
    );

    // A canvas's folder is binned by name, never one that climbs out, and never an example's.
    const bin = (slug: string) =>
      ask("/__sp/canvas-folder", { slug, action: "delete" });
    expect((await bin("..")).status).toBe(400);
    expect((await bin("gone")).status).toBe(404);
    expect((await bin("an-example")).status).toBe(404);
    expect((await bin("begun")).status).toBe(403);

    // A folder the project began under an example's name is its own once it has a layout.json.
    fs.writeFileSync(path.join(canvasesDir, "begun/layout.json"), "{}");
    expect(
      (await ask("/__sp/canvas-content", { ...content([]), slug: "begun" }))
        .status,
    ).toBe(200);
  } finally {
    close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// The home page and the tab bar list every project the server knows, each at the address of its
// pages.
it("lists the projects", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sp-projects-"));
  const write = (rel: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
    fs.writeFileSync(path.join(tmp, rel), text);
  };
  write("projects/alpha/canvases/one/01-a.html", "alpha one");
  fs.mkdirSync(path.join(tmp, "projects/empty"));
  write("elsewhere/canvases/mine/01-a.html", "mine");
  fs.mkdirSync(path.join(tmp, "examples"));
  const { ask, close } = await serve({
    canvasesDir: path.join(tmp, "elsewhere/canvases"),
    examplesDir: path.join(tmp, "examples"),
    projects: () =>
      new Map([
        ["alpha", path.join(tmp, "projects/alpha")],
        ["a b", path.join(tmp, "projects/empty")],
        ["elsewhere", path.join(tmp, "elsewhere")],
      ]),
    projectDir: path.join(tmp, "elsewhere"),
    repoRoot: tmp,
  });
  try {
    const projects = JSON.parse((await ask("/__sp/projects.json")).text);
    expect(
      projects.map((p: any) => [
        p.name,
        p.url,
        p.canvases.map((c: any) => c.slug),
      ]),
    ).toEqual([
      ["alpha", "/p/alpha/", ["one"]],
      ["a b", "/p/a%20b/", []],
      ["elsewhere", "/p/elsewhere/", ["mine"]],
    ]);
    expect(JSON.parse((await ask("/__sp/index.json")).text).project).toBe(
      "elsewhere",
    );
  } finally {
    close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// A project's documents are the Markdown files at its root that the server names, for now its
// PRD.md; other Markdown there and a folder by the name are not. A canvas folder's are its own,
// which is where an example's come from.
it("lists a project's documents", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sp-docs-"));
  const projectDir = path.join(tmp, "mine");
  fs.mkdirSync(path.join(projectDir, "canvases/a"), { recursive: true });
  fs.writeFileSync(path.join(projectDir, "canvases/a/01-a.html"), "");
  fs.writeFileSync(path.join(projectDir, "canvases/a/PRD.md"), "# A");
  fs.mkdirSync(path.join(projectDir, "PRD.md"));
  fs.writeFileSync(path.join(projectDir, "README.md"), "no");
  fs.mkdirSync(path.join(tmp, "examples"));
  const { ask, close } = await serve({
    canvasesDir: path.join(projectDir, "canvases"),
    examplesDir: path.join(tmp, "examples"),
    projects: () => new Map([["mine", projectDir]]),
    projectDir,
    repoRoot: tmp,
  });
  const index = async () => JSON.parse((await ask("/__sp/index.json")).text);
  const docs = async () => (await index()).docs;
  try {
    expect(await docs()).toEqual([]);
    expect((await index()).boards[0].docs).toEqual([
      { name: "PRD.md", text: "# A" },
    ]);
    fs.rmdirSync(path.join(projectDir, "PRD.md"));
    fs.writeFileSync(path.join(projectDir, "PRD.md"), "# Why");
    expect(await docs()).toEqual([{ name: "PRD.md", text: "# Why" }]);
    // Its tab writes it back, and only a name the index lists, and not over a rewrite since the
    // edit began.
    expect(
      (await ask("/__sp/doc", { name: "PRD.md", text: "# How", base: "# A" }))
        .status,
    ).toBe(409);
    expect(
      (await ask("/__sp/doc", { name: "PRD.md", text: "# How", base: "# Why" }))
        .status,
    ).toBe(204);
    expect(await docs()).toEqual([{ name: "PRD.md", text: "# How" }]);
    expect(
      (await ask("/__sp/doc", { name: "README.md", text: "x", base: "no" }))
        .status,
    ).toBe(400);
    expect(
      (await ask("/__sp/doc", { name: "../PRD.md", text: "x" })).status,
    ).toBe(400);
    expect(fs.readFileSync(path.join(projectDir, "README.md"), "utf8")).toBe(
      "no",
    );
  } finally {
    close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// A project's cover is its first canvas's first screen, whole, until one is chosen; the choice is a
// path in project.json, and taking it back deletes the file.
it("keeps a project's cover", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sp-cover-"));
  const write = (rel: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
    fs.writeFileSync(path.join(tmp, rel), text);
  };
  write("mine/canvases/a/01-a.html", "");
  write("mine/canvases/b/00-tokens.html", "");
  write("mine/canvases/b/01-home.html", "");
  // `order` puts b first, and its 00- board is a token sheet the cover skips.
  write("mine/canvases/b/layout.json", JSON.stringify({ order: -1 }));
  fs.mkdirSync(path.join(tmp, "examples"));
  const projectDir = path.join(tmp, "mine");
  const { ask, close } = await serve({
    canvasesDir: path.join(projectDir, "canvases"),
    examplesDir: path.join(tmp, "examples"),
    projects: () => new Map([["mine", projectDir]]),
    projectDir,
    repoRoot: tmp,
  });
  const cover = async () =>
    JSON.parse((await ask("/__sp/projects.json")).text)[0].cover;
  try {
    expect(await cover()).toEqual({
      path: "b/01-home.html",
      w: 478,
      h: 980,
      box: [0, 0, 478, 980],
    });
    const chosen = { path: "a/01-a.html", box: [10, 20, 30, 40] };
    expect((await ask("/__sp/project-cover", { cover: chosen })).status).toBe(
      204,
    );
    expect(await cover()).toEqual({ ...chosen, w: 478, h: 980, chosen: true });
    for (const path of ["a/nope.html", "../mine/canvases/a/01-a.html"])
      expect(
        (await ask("/__sp/project-cover", { cover: { path } })).status,
      ).toBe(400);
    expect((await ask("/__sp/project-cover", { cover: null })).status).toBe(
      204,
    );
    expect(fs.existsSync(path.join(projectDir, "project.json"))).toBe(false);
    expect((await cover()).path).toBe("b/01-home.html");
    fs.writeFileSync(path.join(projectDir, "project.json"), "[]");
    expect((await ask("/__sp/project-cover", { cover: chosen })).status).toBe(
      409,
    );
  } finally {
    close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// A file the agent linked as `file:///…`, served from inside the project and nowhere else.
it("serves the project's own files by their absolute path", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sp-file-"));
  const projectDir = path.join(tmp, "project");
  fs.mkdirSync(path.join(projectDir, "web/variants"), { recursive: true });
  fs.writeFileSync(path.join(projectDir, "web/variants/a glow.html"), "glow");
  fs.writeFileSync(path.join(tmp, "secret.html"), "secret");
  const { ask, close } = await serve({
    canvasesDir: path.join(projectDir, "canvases"),
    examplesDir: path.join(tmp, "examples"),
    projects: () => new Map(),
    projectDir,
    repoRoot: tmp,
  });
  try {
    // The address the chat panel makes of a file: link, `/C:/…` on Windows (markdown.ts).
    const at = (file: string) => `/file${pathToFileURL(file).pathname}`;
    expect(
      await ask(at(path.join(projectDir, "web/variants/a glow.html"))),
    ).toEqual({
      status: 200,
      text: "glow",
    });
    expect((await ask(at(path.join(tmp, "secret.html")))).status).toBe(404);
    // A junction is the link Windows makes without admin rights, and a symlink elsewhere.
    fs.symlinkSync(tmp, path.join(projectDir, "web/out"), "junction");
    expect(
      (await ask(at(path.join(projectDir, "web/out/secret.html")))).status,
    ).toBe(404);
    expect((await ask(`${at(projectDir)}/../secret.html`)).status).toBe(404);
  } finally {
    close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// `sp canvas`: a command goes to the canvas page last opened and its answer comes back, and with
// no canvas page it waits 10 s for one and then says so.
it("hands a canvas command to the open canvas page and its answer back", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sp-bridge-"));
  fs.mkdirSync(path.join(tmp, "project/canvases/home"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "examples/an-example"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "examples/an-example/01-a.html"), "a");
  const { ask, listen, close } = await serve({
    canvasesDir: path.join(tmp, "project/canvases"),
    examplesDir: path.join(tmp, "examples"),
    projects: () => new Map([["shop", path.join(tmp, "project")]]),
    projectDir: path.join(tmp, "project"),
    repoRoot: tmp,
  });
  // Until the server has set the 10 s timer a request waits for a page on, so advancing the clock
  // reaches it. Not a count of timers: the boards watcher sets one of its own whenever macOS gets
  // round to reporting the folders made above.
  const set = vi.spyOn(globalThis, "setTimeout");
  const waiting = async () => {
    while (!set.mock.calls.some(([, ms]) => ms === 10_000))
      await new Promise((w) => setImmediate(w));
    set.mockClear();
  };
  const get = { slug: "home", command: { op: "get" } };
  try {
    expect(
      (
        await ask("/__sp/canvas", {
          slug: "an-example",
          command: { op: "get" },
        })
      ).status,
    ).toBe(403);
    // A name that is not a string would reach path.join, which throws out of the whole server.
    expect((await ask("/__sp/canvas", { slug: 123, command: {} })).status).toBe(
      400,
    );

    // A brand kit or sheet page listens too, and runs no commands.
    const sheet = await listen("/__sp/events");
    const alone = ask("/__sp/canvas", get);
    await waiting();
    await vi.advanceTimersByTimeAsync(10_000);
    const refused = await alone;
    expect(refused.status).toBe(409);
    expect(refused.text).toContain('"shop"');
    sheet.close();

    // Sent before the page opens, which is a reload: it goes to the page once it does.
    const early = ask("/__sp/canvas", get);
    await waiting();
    const page = await listen("/__sp/events?bridge=1");
    const command = await page.next();
    expect(command).toMatchObject(get);
    const answer = { id: command.id, ok: true, result: { shapes: [] } };
    expect((await ask("/__sp/canvas-reply", answer)).status).toBe(200);
    expect(await early).toEqual({ status: 200, text: '{"shapes":[]}' });
    // Answered once: a second reply finds nothing waiting.
    expect((await ask("/__sp/canvas-reply", answer)).status).toBe(404);

    // The page's refusal comes back whole.
    const refusal = ask("/__sp/canvas", get);
    const error = { error: "moved_by_person", message: "moved", shapes: [] };
    await ask("/__sp/canvas-reply", {
      id: (await page.next()).id,
      ok: false,
      error,
    });
    expect(await refusal).toEqual({ status: 422, text: JSON.stringify(error) });

    const unanswered = ask("/__sp/canvas", get);
    await page.next();
    await vi.advanceTimersByTimeAsync(120_000);
    expect((await unanswered).status).toBe(504);

    const cut = ask("/__sp/canvas", get);
    await page.next();
    page.close();
    expect((await cut).status).toBe(503);
  } finally {
    close();
    set.mockRestore();
    vi.useRealTimers();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

async function serve(options: Parameters<typeof createSpServer>[0]) {
  const sp = createSpServer(options);
  const server = http.createServer((req, res) =>
    sp.handle(req, res, () => res.writeHead(404).end()),
  );
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  // Not `fetch`, because vitest.setup.ts replaces it with one that reads boards off the disk.
  const { port } = server.address() as AddressInfo;
  const ask = (url: string, body?: object) =>
    new Promise<{ status: number; text: string }>((done) => {
      const req = http.request(
        { port, path: url, method: body ? "POST" : "GET" },
        (res) => {
          let text = "";
          res.on("data", (chunk) => (text += chunk));
          res.on("end", () => done({ status: res.statusCode!, text }));
        },
      );
      req.end(body && JSON.stringify(body));
    });
  // An open page's event stream, and the `sp canvas` commands the server sends down it.
  const listen = (url: string) =>
    new Promise<{ next: () => Promise<any>; close: () => void }>((done) => {
      const commands: any[] = [];
      let wake = () => {};
      const req = http.get({ port, path: url }, (res) => {
        let text = "";
        res.on("data", (chunk) => {
          text += chunk;
          const frames = text.split("\n\n");
          text = frames.pop()!;
          for (const frame of frames)
            if (frame.startsWith("event: command\n"))
              commands.push(JSON.parse(frame.split("\ndata: ")[1]));
          wake();
        });
        done({
          next: async () => {
            while (!commands.length) await new Promise<void>((w) => (wake = w));
            return commands.shift();
          },
          close: () => req.destroy(),
        });
      });
    });
  const close = () => {
    sp.close();
    server.close();
    server.closeAllConnections();
  };
  return { ask, listen, close };
}
