import { expect, test } from "bun:test";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { augmentedPath, freePort, isWeb, listProjects, parseArgs, portAnswers, stateDir, untilde, waitForPort } from "./launch.ts";

test("untilde expands only the current user's leading tilde", () => {
  expect(untilde("~/sp", "/Users/u")).toBe("/Users/u/sp");
  expect(untilde("~", "/Users/u")).toBe("/Users/u");
  expect(untilde("~other/sp", "/Users/u")).toBe("~other/sp");
  expect(untilde("/abs/~", "/Users/u")).toBe("/abs/~");
  expect(stateDir({ SUPER_PROTOTYPING_HOME: "~/sp" }, "/Users/u")).toBe("/Users/u/sp/state");
});

test("isWeb lets only http and https out to the browser", () => {
  expect(isWeb("https://github.com/ReScienceLab/super-prototyping")).toBe(true);
  expect(isWeb("HTTP://example.com/")).toBe(true);
  expect(isWeb("file:///Applications/Calculator.app")).toBe(false);
  expect(isWeb("smb://host/share")).toBe(false);
  expect(isWeb("javascript:alert(1)")).toBe(false);
  expect(isWeb("https-but-not://x")).toBe(false);
});

test("stateDir mirrors sp _dirs()", () => {
  expect(stateDir({}, "/Users/a")).toBe("/Users/a/.local/state/super-prototyping");
  expect(stateDir({ XDG_STATE_HOME: "/x" }, "/Users/a")).toBe("/x/super-prototyping");
  expect(stateDir({ SUPER_PROTOTYPING_HOME: "/h", XDG_STATE_HOME: "/x" }, "/Users/a")).toBe("/h/state");
});

test("augmentedPath appends the tool directories once", () => {
  const p = augmentedPath({ PATH: "/usr/bin:/opt/homebrew/bin" }, "/Users/a");
  expect(p.split(":")).toEqual([
    "/usr/bin", "/opt/homebrew/bin", "/Users/a/.local/bin", "/Users/a/.bun/bin",
    "/Users/a/.cargo/bin", "/usr/local/bin",
  ]);
});

test("listProjects gives the folders in the root, last edited first, and skips files and dot folders", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sp-projects-"));
  for (const [name, at] of [["old", 1000], ["new", 3000], ["mid", 2000], [".hidden", 4000]] as const) {
    fs.mkdirSync(path.join(root, name));
    fs.utimesSync(path.join(root, name), at, at);
  }
  fs.writeFileSync(path.join(root, "notes.txt"), "");
  expect(listProjects(root).map((p) => p.name)).toEqual(["new", "mid", "old"]);
  // A board rewritten inside a canvas folder is an edit, though no folder's own time moved.
  const board = path.join(root, "old/canvases/app/01-home.html");
  fs.mkdirSync(path.dirname(board), { recursive: true });
  fs.writeFileSync(board, "");
  fs.utimesSync(board, 5000, 5000);
  for (const dir of ["old/canvases/app", "old/canvases", "old"]) fs.utimesSync(path.join(root, dir), 1000, 1000);
  expect(listProjects(root)[0]).toEqual({ name: "old", dir: path.join(root, "old"), at: 5000_000 });
  expect(listProjects(path.join(root, "missing"))).toEqual([]);
  fs.rmSync(root, { recursive: true });
});

test("waitForPort resolves once a listener appears, rejects on timeout or abort", async () => {
  const port = await freePort();
  expect(await portAnswers(port)).toBe(false);
  await expect(waitForPort(port, 300, new AbortController().signal)).rejects.toThrow(`port ${port} never answered`);
  const aborted = new AbortController();
  aborted.abort();
  await expect(waitForPort(port, 5000, aborted.signal)).rejects.toThrow("server exited");
  const srv = net.createServer().listen(port, "127.0.0.1");
  await waitForPort(port, 2000, new AbortController().signal);
  expect(await portAnswers(port)).toBe(true);
  srv.close();
});

test("parseArgs takes --port and a directory in either order and skips other flags", () => {
  expect(parseArgs(["/p"])).toEqual({ port: undefined, dir: "/p" });
  expect(parseArgs(["--port", "5195", "/p"])).toEqual({ port: 5195, dir: "/p" });
  expect(parseArgs(["/p", "--port", "5195"])).toEqual({ port: 5195, dir: "/p" });
  expect(parseArgs(["-psn_0_1", "--port"])).toEqual({ port: NaN, dir: undefined });
});
