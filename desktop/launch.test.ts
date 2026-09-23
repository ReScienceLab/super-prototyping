import { expect, test } from "bun:test";
import net from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { allowInCodex, augmentedPath, ensurePathInRc, freePort, isWeb, linkInstall, parseArgs, portAnswers, stateDir, untilde, waitForPort } from "./launch.ts";

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

test("parseArgs takes --port, --upgrade and a directory in any order and skips other flags", () => {
  expect(parseArgs(["/p"])).toEqual({ port: undefined, dir: "/p", upgrade: false });
  expect(parseArgs(["--port", "5195", "/p"])).toEqual({ port: 5195, dir: "/p", upgrade: false });
  expect(parseArgs(["/p", "--port", "5195"])).toEqual({ port: 5195, dir: "/p", upgrade: false });
  expect(parseArgs(["-psn_0_1", "--port"])).toEqual({ port: NaN, dir: undefined, upgrade: false });
  expect(parseArgs(["--upgrade"])).toEqual({ port: undefined, dir: undefined, upgrade: true });
});

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "sp-launch-"));

test("linkInstall links through current, repoints it, and replaces only our own copies", () => {
  const home = tmp();
  const app = (name: string) => {
    const root = path.join(home, name);
    for (const skill of ["alpha", "beta"]) fs.mkdirSync(path.join(root, "skills", skill), { recursive: true });
    return root;
  };
  const first = app("A.app");
  fs.mkdirSync(path.join(home, ".claude/skills/alpha"), { recursive: true });
  fs.writeFileSync(path.join(home, ".claude/skills/alpha/SKILL.md"), "---\nname: alpha\nmetadata:\n  managed-by: super-prototyping\n---\n");
  fs.mkdirSync(path.join(home, ".claude/skills/beta"));
  fs.writeFileSync(path.join(home, ".claude/skills/beta/SKILL.md"), "---\nname: beta\n---\nmine\n");
  const current = path.join(home, ".local/share/super-prototyping/current");
  fs.mkdirSync(path.join(home, ".local/bin"), { recursive: true });
  fs.symlinkSync("/usr/bin/true", path.join(home, ".local/bin/artgen")); // another tool's

  const changes = linkInstall(first, home);
  expect(fs.readlinkSync(current)).toBe(first);
  expect(fs.readlinkSync(path.join(home, ".local/bin/sp"))).toBe(path.join(current, "tools/bin/sp"));
  expect(fs.readlinkSync(path.join(home, ".local/bin/refkit"))).toBe(path.join(current, "tools/bin/sp"));
  expect(fs.readlinkSync(path.join(home, ".claude/skills/alpha"))).toBe(path.join(current, "skills/alpha"));
  expect(fs.lstatSync(path.join(home, ".claude/skills/beta")).isSymbolicLink()).toBe(false); // the user's
  expect(fs.existsSync(path.join(home, ".agents"))).toBe(false); // no such agent here
  expect(changes).toContain(`kept ${path.join(home, ".claude/skills/beta")}`);
  expect(fs.readlinkSync(path.join(home, ".local/bin/artgen"))).toBe("/usr/bin/true");

  // The app moved: only `current` changes, and a second launch changes nothing.
  const moved = app("B.app");
  expect(linkInstall(moved, home)).toEqual([
    `linked ${current}`,
    `kept ${path.join(home, ".local/bin/artgen")}`,
    `kept ${path.join(home, ".claude/skills/beta")}`,
  ]);
  expect(fs.readlinkSync(current)).toBe(moved);

  // Windows: no command links, since `uv tool install` makes those.
  const win = tmp();
  fs.mkdirSync(path.join(win, ".claude"));
  fs.mkdirSync(path.join(win, ".codex"));
  linkInstall(app("C.app"), win, "win32");
  expect(fs.existsSync(path.join(win, ".local/bin"))).toBe(false);
  expect(fs.existsSync(path.join(win, ".claude/skills/alpha"))).toBe(true);
  expect(fs.existsSync(path.join(win, ".agents/skills/alpha"))).toBe(true); // Codex, by ~/.codex
});

test("ensurePathInRc appends once, and not when the rc already puts ~/.local/bin on PATH", () => {
  const home = tmp();
  expect(ensurePathInRc(home, "/bin/fish")).toBeNull();
  expect(ensurePathInRc(home, "/bin/zsh")).toBe(path.join(home, ".zshrc"));
  expect(ensurePathInRc(home, "/bin/zsh")).toBeNull();
  fs.writeFileSync(path.join(home, ".bash_profile"), 'export PATH="$HOME/.local/bin:$PATH"\n');
  expect(ensurePathInRc(home, "/usr/local/bin/bash")).toBeNull();
  fs.writeFileSync(path.join(home, ".bash_profile"), '# export PATH="$HOME/.local/bin:$PATH"\n');
  expect(ensurePathInRc(home, "/usr/local/bin/bash")).toBe(path.join(home, ".bash_profile"));
});

test("allowInCodex adds only the missing rules, and only where Codex is", () => {
  const home = tmp();
  expect(allowInCodex(home)).toEqual([]);
  fs.mkdirSync(path.join(home, ".codex/rules"), { recursive: true });
  const rules = path.join(home, ".codex/rules/default.rules");
  fs.writeFileSync(rules, 'prefix_rule(pattern=["sp"], decision="allow")');
  expect(allowInCodex(home)).toEqual(["refkit", "artgen"]);
  expect(allowInCodex(home)).toEqual([]);
  expect(fs.readFileSync(rules, "utf8").split("\n").filter(Boolean)).toHaveLength(3);
});
