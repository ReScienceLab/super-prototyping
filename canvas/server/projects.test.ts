import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { createProjectsServer } from "./projects.ts";

// One server for every project: `/` goes to the one opened, else home, each is at `/p/<name>/`, the
// root has the examples and no project, and a page of the server's own can make one. The folder
// picker is the OS's, and this test does not drive it.
it("serves every project at its own address and makes new ones", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sp-projects-server-"));
  const write = (rel: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
    fs.writeFileSync(path.join(tmp, rel), text);
  };
  write(
    "root/canvas/package.json",
    JSON.stringify({ version: "1.0.0" }),
  );
  write(
    "root/skills/alpha/SKILL.md",
    "---\nname: alpha\nmetadata:\n  managed-by: super-prototyping\n---\nAlpha.\n",
  );
  write("root/canvases/00-welcome/01-a.html", "welcome");
  // Both projects keep their boards where they used to be, which the server moves to `canvases`.
  write("projects/alpha/mockups/canvases/one/01-a.html", "alpha one");
  write("projects/alpha/mockups/.DS_Store", ""); // Finder's, which is no reason to keep the folder
  write("elsewhere/canvases/mine/01-a.html", "mine");

  const projects = createProjectsServer({
    projectsDir: path.join(tmp, "projects"),
    repoRoot: path.join(tmp, "root"),
  });
  const server = http.createServer((req, res) =>
    projects.handle(req, res, () =>
      res.writeHead(200).end(`static ${req.url}`),
    ),
  );
  expect(fs.existsSync(path.join(tmp, "projects/alpha/canvases/one"))).toBe(true);
  expect(fs.existsSync(path.join(tmp, "projects/alpha/mockups"))).toBe(false);
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const { port } = server.address() as AddressInfo;
  // Not `fetch`, because vitest.setup.ts replaces it with one that reads boards off the disk.
  const ask = (
    url: string,
    body?: object,
    headers: http.OutgoingHttpHeaders = {},
  ) =>
    new Promise<{ status: number; text: string; location?: string }>((done) => {
      const req = http.request(
        { port, path: url, method: body ? "POST" : "GET", headers },
        (res) => {
          let text = "";
          res.on("data", (chunk) => (text += chunk));
          res.on("end", () =>
            done({
              status: res.statusCode!,
              text,
              location: res.headers.location,
            }),
          );
        },
      );
      req.end(body && JSON.stringify(body));
    });
  try {
    // Nothing opened yet: the root is home, and the examples' window.
    expect(await ask("/")).toMatchObject({ status: 302, location: "/home.html" });
    expect((await ask("/?canvas=00-welcome")).text).toBe("static /?canvas=00-welcome");
    const rootIndex = JSON.parse((await ask("/__sp/index.json")).text);
    expect(rootIndex.project).toBeUndefined();
    expect(rootIndex.boards.map((b: any) => [b.slug, b.example])).toEqual([
      ["00-welcome", true],
    ]);
    expect((await ask("/board/00-welcome/01-a.html")).text).toBe("welcome");
    const copy = { slug: "00-welcome", name: "Mine" };
    expect((await ask("/__sp/clone-canvas", copy)).status).toBe(409);
    expect(fs.readdirSync(path.join(tmp, "root/canvases"))).toEqual(["00-welcome"]);
    // The agent is no project's, and is at the root once. Nothing is written before it first runs.
    const sessions = await ask("/__sp/agent/sessions");
    expect(sessions).toMatchObject({ status: 200, text: "[]" });
    const run = (body: object) => ask("/__sp/agent/run", { message: "hi", ...body });
    expect((await run({ project: "nowhere" })).status).toBe(404);
    expect((await run({ session: "00000000-0000-4000-8000-000000000000" })).status).toBe(404);
    expect((await run({ session: "../x" })).status).toBe(404);
    expect(
      (await ask("/__sp/agent/run", { message: "hi" }, { "sec-fetch-site": "cross-site" }))
        .status,
    ).toBe(403);
    expect((await ask("/p/alpha/__sp/agent/sessions")).text).toBe("static /__sp/agent/sessions");
    expect(fs.existsSync(path.join(tmp, "projects/.workspaces"))).toBe(false);
    // A run an earlier server kept replays after a restart, pictures and all. One it died in the
    // middle of replays with the end it never wrote.
    write(
      "projects/.workspaces/.runs/old-run/events.jsonl",
      JSON.stringify({
        id: 1,
        event: "start",
        data: { kind: "start", prompt: "hi" },
      }) + "\n",
    );
    write("projects/.workspaces/.runs/old-run/image-1.png", "hi");
    write("projects/.workspaces/.runs/old-run/shot-1.jpeg", "yo");
    const replay = await ask("/__sp/agent/run/old-run/events");
    expect(replay.text).toContain(
      'event: start\ndata: {"kind":"start","prompt":"hi"}',
    );
    expect(replay.text).toContain("The app quit before this turn finished.");
    const image = await ask("/__sp/agent/run/old-run/image/1");
    expect(image.text).toBe("hi");
    expect((await ask("/__sp/agent/run/old-run/shot/1")).text).toBe("yo");
    expect((await ask("/__sp/agent/run/old-run/shot/2")).status).toBe(404);
    fs.rmSync(path.join(tmp, "projects/.workspaces"), { recursive: true });
    expect((await ask("/__sp/agent/run/gone-run/events")).status).toBe(404);

    // A folder outside the projects directory is never a project.
    expect((await ask("/p/elsewhere/")).status).toBe(404);
    expect((await ask("/p/alpha/board/one/01-a.html")).text).toBe("alpha one");
    expect((await ask("/p/nowhere/")).status).toBe(404);
    // The examples come from the plugin root, beside every project's own.
    expect((await ask("/p/alpha/board/00-welcome/01-a.html")).text).toBe(
      "welcome",
    );
    const listed = JSON.parse((await ask("/__sp/projects.json")).text);
    expect(listed.map((p: any) => [p.name, p.url, p.path])).toEqual([
      ["alpha", "/p/alpha/", path.join(tmp, "projects/alpha")],
    ]);
    // A card's menu names a project the server has. Moving one to the Trash and showing one in
    // Finder are the OS's, and are not driven here.
    expect(
      (await ask("/__sp/projects/delete", { name: "nowhere" })).status,
    ).toBe(404);
    expect((await ask("/__sp/projects/reveal", {})).status).toBe(404);
    expect(
      (
        await ask(
          "/__sp/projects/delete",
          { name: "alpha" },
          { "sec-fetch-site": "cross-site" },
        )
      ).status,
    ).toBe(403);
    expect(fs.existsSync(path.join(tmp, "projects/alpha"))).toBe(true);

    // A new project, then opened. It gets no skills: the agent's are in its own folder.
    const made = await ask("/__sp/projects", { name: " beta " });
    expect(made.status).toBe(200);
    expect(JSON.parse(made.text)).toEqual({ url: "/p/beta/" });
    expect(
      fs.existsSync(path.join(tmp, "projects/beta/canvases")),
    ).toBe(true);
    expect(fs.existsSync(path.join(tmp, "projects/beta/.claude"))).toBe(false);
    expect((await ask("/p/beta/__sp/index.json")).status).toBe(200);
    expect((await ask("/__sp/projects", { name: "beta" })).status).toBe(409);
    expect((await ask("/__sp/projects", { name: "  " })).status).toBe(400);
    expect((await ask("/__sp/projects", { name: "a/b" })).status).toBe(400);
    expect(fs.existsSync(path.join(tmp, "projects/gamma"))).toBe(false);
    expect(
      (
        await ask(
          "/__sp/projects",
          { name: "gamma" },
          { "sec-fetch-site": "cross-site" },
        )
      ).status,
    ).toBe(403);
    expect((await ask("/__sp/projects")).status).toBe(200); // a GET is not the endpoint's
  } finally {
    projects.close();
    server.close();
    server.closeAllConnections();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
