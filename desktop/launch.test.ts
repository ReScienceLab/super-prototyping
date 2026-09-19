import { expect, test } from "bun:test";
import net from "node:net";
import { augmentedPath, findOnPath, freePort, missingToolkitMessage, parseArgs, portAnswers, stateDir, waitForPort } from "./launch.ts";

test("stateDir mirrors sp-canvas _dirs()", () => {
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

test("findOnPath finds a file and only a file", () => {
  expect(findOnPath("ls", "/nope:/bin")).toBe("/bin/ls");
  expect(findOnPath("no-such-binary-xyz", "/bin")).toBeNull();
});

test("missingToolkitMessage names uv when it is the missing piece", () => {
  const bins = ["/Users/a/.local/bin"];
  expect(missingToolkitMessage({ uv: true, version: "1.4.1", bins })).toContain(
    'uv tool install "super-prototyping-tools @ https://github.com/ReScienceLab/super-prototyping/archive/refs/tags/super-prototyping--v1.4.1.tar.gz#subdirectory=tools"',
  );
  expect(missingToolkitMessage({ uv: false, version: "1.4.1", bins })).toStartWith("uv is not installed");
  expect(missingToolkitMessage({ uv: true, version: "1.4.1", bins })).toEndWith("  /Users/a/.local/bin");
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
