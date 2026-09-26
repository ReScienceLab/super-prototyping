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
  write("root/canvas/package.json", JSON.stringify({ version: "1.0.0" }));
  write(
    "root/skills/alpha/SKILL.md",
    "---\nname: alpha\nmetadata:\n  managed-by: super-prototyping\n---\nAlpha.\n",
  );
  write("root/canvases/templates/01-a.html", "welcome");
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
  expect(fs.existsSync(path.join(tmp, "projects/alpha/canvases/one"))).toBe(
    true,
  );
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
    // Asked for by a name DNS could point here, a page from anywhere would be same-origin.
    const at = (host: string) => ask("/", undefined, { host });
    expect((await at("rebound.example")).status).toBe(403);
    expect((await at(`[::1]:${port}`)).status).toBe(302);
    expect((await at("app.localhost")).status).toBe(302);
    // Nothing opened yet: the root is home, and the examples' window.
    expect(await ask("/")).toMatchObject({
      status: 302,
      location: "/home.html",
    });
    expect((await ask("/?canvas=templates")).text).toBe(
      "static /?canvas=templates",
    );
    const rootIndex = JSON.parse((await ask("/__sp/index.json")).text);
    expect(rootIndex.project).toBeUndefined();
    expect(rootIndex.boards.map((b: any) => [b.slug, b.example])).toEqual([
      ["templates", true],
    ]);
    expect((await ask("/board/templates/01-a.html")).text).toBe("welcome");
    const copy = { slug: "templates", name: "Mine" };
    expect((await ask("/__sp/clone-canvas", copy)).status).toBe(409);
    expect(fs.readdirSync(path.join(tmp, "root/canvases"))).toEqual([
      "templates",
    ]);
    // The agent is no project's, and is at the root once. Nothing is written before it first runs.
    const sessions = await ask("/__sp/agent/sessions");
    expect(sessions).toMatchObject({ status: 200, text: "[]" });
    const run = (body: object) =>
      ask("/__sp/agent/run", { message: "hi", ...body });
    expect((await run({ project: "nowhere" })).status).toBe(404);
    expect(
      (await run({ session: "00000000-0000-4000-8000-000000000000" })).status,
    ).toBe(404);
    expect((await run({ session: "../x" })).status).toBe(404);
    expect(
      (
        await ask(
          "/__sp/agent/run",
          { message: "hi" },
          { "sec-fetch-site": "cross-site" },
        )
      ).status,
    ).toBe(403);
    expect((await ask("/p/alpha/__sp/agent/sessions")).text).toBe(
      "static /__sp/agent/sessions",
    );
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
    expect((await ask("/p/alpha/board/templates/01-a.html")).text).toBe(
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
    expect(JSON.parse(made.text)).toEqual({ name: "beta", url: "/p/beta/" });
    expect(fs.existsSync(path.join(tmp, "projects/beta/canvases"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, "projects/beta/.claude"))).toBe(false);
    const beta = JSON.parse(
      fs.readFileSync(path.join(tmp, "projects/beta/project.json"), "utf8"),
    );
    expect(beta.format).toBe(1);
    expect(beta.id).toMatch(/^[0-9a-f-]{36}$/);
    // One a newer app made is not opened, since this one could misread it and write it back.
    write("projects/delta/canvases/one/01-a.html", "delta");
    write("projects/delta/project.json", JSON.stringify({ format: 2 }));
    expect((await ask("/p/delta/")).status).toBe(409);
    fs.rmSync(path.join(tmp, "projects/delta"), { recursive: true });
    expect((await ask("/p/beta/__sp/index.json")).status).toBe(200);
    expect((await ask("/__sp/projects", { name: "beta" })).status).toBe(409);
    // No name: the first free "Untitled", which its agent names in project.json.
    for (const url of ["/p/Untitled/", "/p/Untitled%202/"])
      expect(
        JSON.parse((await ask("/__sp/projects", { name: "  " })).text).url,
      ).toBe(url);
    write("projects/Untitled/project.json", JSON.stringify({ name: "Gamma" }));
    const titled = JSON.parse((await ask("/__sp/projects.json")).text);
    expect(titled.find((p: any) => p.name === "Untitled").title).toBe("Gamma");
    expect(
      JSON.parse((await ask("/p/Untitled/__sp/index.json")).text).title,
    ).toBe("Gamma");
    expect((await ask("/__sp/projects", { name: "a/b" })).status).toBe(400);

    // A reference for a clone: into the project's `refs`, once, and only under a plain name.
    const ref = "/__sp/projects/ref?name=beta&file=home.png";
    expect((await ask(ref, { png: 1 })).status).toBe(204);
    expect(
      fs.readFileSync(path.join(tmp, "projects/beta/refs/home.png"), "utf8"),
    ).toBe('{"png":1}');
    expect((await ask(ref, { png: 2 })).status).toBe(409);
    expect(
      (await ask("/__sp/projects/ref?name=beta&file=../x.png", {})).status,
    ).toBe(400);
    expect(
      (await ask("/__sp/projects/ref?name=nope&file=x.png", {})).status,
    ).toBe(404);
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
