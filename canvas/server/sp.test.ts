import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
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

    const status = { file: "01-a", status: "outdated" };
    expect(
      (await ask("/__sp/board-status", { slug: "an-example", ...status }))
        .status,
    ).toBe(403);
    expect(
      (await ask("/__sp/board-status", { slug: "shadowed", ...status })).status,
    ).toBe(200);
    // A name in neither place is not an example, and gets the answer it got before.
    expect(
      (await ask("/__sp/board-status", { slug: "nowhere", ...status })).status,
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
    expect((await ask("/__sp/project-cover", { cover: chosen })).status).toBe(204);
    expect(await cover()).toEqual({ ...chosen, w: 478, h: 980, chosen: true });
    for (const path of ["a/nope.html", "../mine/canvases/a/01-a.html"])
      expect((await ask("/__sp/project-cover", { cover: { path } })).status).toBe(400);
    expect((await ask("/__sp/project-cover", { cover: null })).status).toBe(204);
    expect(fs.existsSync(path.join(projectDir, "project.json"))).toBe(false);
    expect((await cover()).path).toBe("b/01-home.html");
  } finally {
    close();
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
  const close = () => {
    sp.close();
    server.close();
    server.closeAllConnections();
  };
  return { ask, close };
}
