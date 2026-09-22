import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { createProjectsServer } from "./projects.ts";

// One server for every project: `/` goes to the one opened, each is at `/p/<name>/`, and a page
// of the server's own can make one. The folder picker is the OS's, and this test does not drive it.
it("serves every project at its own address and makes new ones", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sp-projects-server-"));
  const write = (rel: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
    fs.writeFileSync(path.join(tmp, rel), text);
  };
  write(
    "root/.claude-plugin/plugin.json",
    JSON.stringify({ version: "1.0.0" }),
  );
  write("root/skills/alpha/SKILL.md", "---\nname: alpha\n---\nAlpha.\n");
  write("root/canvases/00-welcome/01-a.html", "welcome");
  // Both projects keep their boards where they used to be, which the server moves to `canvases`.
  write("projects/alpha/mockups/canvases/one/01-a.html", "alpha one");
  write("projects/alpha/mockups/.DS_Store", ""); // Finder's, which is no reason to keep the folder
  write("elsewhere/mockups/canvases/mine/01-a.html", "mine");

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
    expect((await ask("/?canvas=x")).status).toBe(404); // nothing opened yet

    expect(projects.open(path.join(tmp, "elsewhere"))).toBe("/p/elsewhere/");
    expect(fs.existsSync(path.join(tmp, "elsewhere/canvases/mine"))).toBe(true);
    expect(await ask("/?canvas=x")).toMatchObject({
      status: 302,
      location: "/p/elsewhere/?canvas=x",
    });
    expect((await ask("/p/elsewhere/")).text).toBe("static /");
    expect((await ask("/p/elsewhere/board/mine/01-a.html")).text).toBe("mine");
    expect((await ask("/p/alpha/board/one/01-a.html")).text).toBe("alpha one");
    expect((await ask("/p/nowhere/")).status).toBe(404);
    // The examples come from the plugin root, beside every project's own.
    expect((await ask("/p/alpha/board/00-welcome/01-a.html")).text).toBe(
      "welcome",
    );
    const listed = JSON.parse((await ask("/p/alpha/__sp/projects.json")).text);
    expect(listed.map((p: any) => [p.name, p.url])).toEqual([
      ["elsewhere", "../elsewhere/"],
      ["alpha", "./"],
    ]);

    // A new project, with the skills of the agent named, then opened.
    const made = await ask("/__sp/projects", {
      name: " beta ",
      agent: "claude",
    });
    expect(made.status).toBe(200);
    const { url } = JSON.parse(made.text);
    expect(url).toMatch(/^\/p\/beta\/\?toast=/);
    expect(
      fs.existsSync(path.join(tmp, "projects/beta/canvases")),
    ).toBe(true);
    expect(fs.existsSync(path.join(tmp, "projects/beta/.claude/skills"))).toBe(
      true,
    );
    expect((await ask("/p/beta/__sp/index.json")).status).toBe(200);
    expect((await ask("/__sp/projects", { name: "beta" })).status).toBe(409);
    expect((await ask("/__sp/projects", { name: "  " })).status).toBe(400);
    expect((await ask("/__sp/projects", { name: "a/b" })).status).toBe(400);
    expect(
      (await ask("/__sp/projects", { name: "gamma", agent: "nope" })).status,
    ).toBe(400);
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
