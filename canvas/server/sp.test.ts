import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { createSpServer } from "./sp.ts";

// The examples directory: listed beside the project's canvases, shadowed by a folder of the
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
  canvas("examples", "shown", "example");
  canvas("examples", "shadowed", "example");
  canvas("project", "shadowed", "mine");

  const canvasesDir = path.join(tmp, "project");
  const sp = createSpServer({
    canvasesDir,
    examplesDir: path.join(tmp, "examples"),
    projectDir: null,
    repoRoot: tmp,
  });
  const server = http.createServer((req, res) =>
    sp.handle(req, res, () => res.writeHead(404).end()),
  );
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  // Not `fetch`: vitest.setup.ts replaces it with one that reads boards off the disk.
  const { port } = server.address() as AddressInfo;
  const ask = (url: string, body?: object) =>
    new Promise<{ status: number; text: string }>((done) => {
      const req = http.request({ port, path: url, method: body ? "POST" : "GET" }, (res) => {
        let text = "";
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => done({ status: res.statusCode!, text }));
      });
      req.end(body && JSON.stringify(body));
    });
  try {
    const index = JSON.parse((await ask("/__sp/index.json")).text);
    expect(index.boards.map((b: any) => [b.slug, b.layout.name])).toEqual([
      ["shadowed", "mine"],
      ["shown", "example"],
    ]);
    expect((await ask("/board/shown/01-a.html")).text).toBe("example");
    expect((await ask("/board/shadowed/01-a.html")).text).toBe("mine");

    const status = { file: "01-a", status: "outdated" };
    expect((await ask("/__sp/board-status", { slug: "shown", ...status })).status).toBe(403);
    expect((await ask("/__sp/board-status", { slug: "shadowed", ...status })).status).toBe(200);
    const comment = { slug: "shown", file: { records: [{}] } };
    expect((await ask("/__sp/comments", comment)).status).toBe(403);

    const clone = { slug: "shown", name: "Mine now" };
    expect((await ask("/__sp/clone-canvas", clone)).status).toBe(200);
    expect(fs.readFileSync(path.join(canvasesDir, "mine-now/01-a.html"), "utf8")).toBe("example");
    expect(fs.readdirSync(path.join(tmp, "examples/shown")).sort()).toEqual([
      "01-a.html",
      "layout.json",
    ]);
  } finally {
    sp.close();
    server.close();
    server.closeAllConnections();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
