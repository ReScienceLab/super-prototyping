import { execFile, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * One argument of a `cmd.exe /s /c` line, as the program at the end of it reads it back. Two
 * parsers see it: cmd, which knows `"` and nothing of `\`, and the program's own, for which `\"`
 * is a quote. So a quote is doubled, which both read alike, the backslashes in front of one are
 * doubled for the second parser, and a `%` steps outside the quotes as `"^%"`, because cmd
 * expands `%NAME%` inside quotes too and would put the environment into the line. The shape is
 * OpenDesign's (packages/platform/src/command.ts), with the backslashes added.
 */
export function cmdArg(arg: string) {
  // cmd ends its line at a newline, and would run the agent on the arguments before it.
  if (/[\r\n]/.test(arg)) throw new Error("a newline cannot pass through cmd.exe");
  if (arg && !/[\s"&<>|^%()]/.test(arg)) return arg;
  const inner = arg.replace(
    /(\\*)(["%]|$)/g,
    (_, slashes: string, c: string) =>
      slashes + slashes + (c === '"' ? '""' : c && '"^%"'),
  );
  return `"${inner}"`;
}

/**
 * What `spawn` and `execFile` are handed to run `bin args`: anywhere but Windows, just that.
 * Windows starts a bare name only when it is an .exe, and a CLI that npm installed is a .cmd
 * shim, which nothing but cmd.exe runs. So the name is looked up the way cmd would, PATHEXT and
 * all, and a shim goes through `cmd.exe /d /s /c "…"` verbatim: /s strips the outer quotes and
 * takes the rest as written, where Node's own quoting backslashes quotes and cmd cannot read that.
 */
export function command(bin: string, args: string[]) {
  if (process.platform === "win32") {
    const exts = (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";");
    for (const dir of (process.env.PATH ?? "").split(path.delimiter).filter(Boolean))
      for (const ext of exts) {
        const file = path.join(dir, bin + ext);
        if (!fs.statSync(file, { throwIfNoEntry: false })?.isFile()) continue;
        if (!/\.(cmd|bat)$/i.test(file)) return { file, args, options: {} };
        return {
          file: process.env.ComSpec ?? "cmd.exe",
          args: ["/d", "/s", "/c", `"${[file, ...args].map(cmdArg).join(" ")}"`],
          options: { windowsVerbatimArguments: true },
        };
      }
  }
  // Not found falls through too: the ENOENT that follows is how the callers read "not installed".
  return { file: bin, args, options: {} };
}

/**
 * Ends a child. Windows has no signal to send: `kill()` there ends the one process, and an agent
 * is a tree of them, cmd.exe around a shim around node around the CLI, so taskkill takes the tree.
 */
export function stop(child: ChildProcess) {
  if (process.platform === "win32")
    execFile("taskkill", ["/pid", `${child.pid}`, "/t", "/f"], () => {});
  else child.kill();
}
