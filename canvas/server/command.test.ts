import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { cmdArg, command, stop } from "./command.ts";

it("quotes for cmd.exe and for the program behind it", () => {
  expect(cmdArg("plain")).toBe("plain");
  expect(cmdArg("")).toBe('""');
  expect(cmdArg('summary="detailed"')).toBe('"summary=""detailed"""');
  expect(cmdArg("%PATH%")).toBe('""^%"PATH"^%""');
  expect(cmdArg("C:\\two words\\")).toBe('"C:\\two words\\\\"');
  expect(cmdArg('a\\"b')).toBe('"a\\\\""b"');
  expect(() => cmdArg("two\nlines")).toThrow();
});

// The real thing, on the only platform that has it: an npm-style .cmd shim on PATH, arguments
// that cmd would mangle or expand, and a child that outlives a plain kill().
it.skipIf(process.platform !== "win32")(
  "runs a .cmd shim with its arguments intact, and stops its tree",
  async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sp cmd-"));
    fs.writeFileSync(
      path.join(dir, "echo.mjs"),
      "console.log(JSON.stringify({ pid: process.pid, argv: process.argv.slice(2) }));\n" +
        'if (process.argv.includes("--stay")) setInterval(() => {}, 1000);\n',
    );
    fs.writeFileSync(
      path.join(dir, "fake-agent.cmd"),
      `@ECHO off\r\n"${process.execPath}" "%~dp0\\echo.mjs" %*\r\n`,
    );
    const PATH = process.env.PATH;
    process.env.PATH = dir + path.delimiter + PATH;
    try {
      const args = [
        "plain",
        "two words",
        'model_reasoning_summary="detailed"',
        "a&b|c<d>e^f",
        "%PATH%",
        "100%",
        "C:\\two words\\",
        'back\\"slash',
        "(parens)",
        "",
        "--stay",
      ];
      const c = command("fake-agent", args);
      expect(c.file.toLowerCase()).toContain("cmd.exe");
      const child = spawn(c.file, c.args, c.options);
      const closed = new Promise((done) => child.on("close", done));
      const line = await new Promise<string>((done) =>
        child.stdout.setEncoding("utf8").once("data", done),
      );
      const said = JSON.parse(line);
      expect(said.argv).toEqual(args);
      stop(child);
      await closed;
      expect(() => process.kill(said.pid, 0)).toThrow();
    } finally {
      process.env.PATH = PATH;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },
);
