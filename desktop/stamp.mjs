// electron-builder's afterPack hook: give every file in the packed app a time that only changes
// when the file does. The builder copies with the time of the build, and a zip entry's header
// holds that time, so every one of the app's thousands of entries differed between two releases
// and the updater's differential download fetched ~50 MB of headers to change a few files.
// A file the app ships from this repo gets its last commit's time, so a board that changed is
// still newer than the screenshot the canvas cached of it; Electron's own files, which nothing
// reads the time of, get one fixed time; a folder gets its newest file's.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ELECTRON_TIME = new Date("2026-01-01T00:00:00Z");

export default function stamp({ appOutDir, packager }) {
  const repo = path.resolve(import.meta.dirname, "..");
  const git = (...args) => execFileSync("git", args, { cwd: repo, encoding: "utf8", maxBuffer: 1 << 28 });
  // A shallow clone knows one commit, which would stamp every file with it on every release.
  if (git("rev-parse", "--is-shallow-repository").trim() === "true")
    throw new Error("stamp.mjs needs the whole history: check out with fetch-depth 0");
  const committed = new Map();
  let time;
  for (const line of git("log", "--format=%x00%ct", "--name-only", "--", ".").split("\n")) {
    if (line.startsWith("\0")) time = new Date(Number(line.slice(1)) * 1000);
    else if (line && !committed.has(line)) committed.set(line, time);
  }
  // plugin/<path> in the app is <path> in this repo (extraResources in package.json).
  const plugin = path.join(packager.getResourcesDir(appOutDir), "plugin");
  const walk = (dir) => {
    let newest = new Date(0);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      let t;
      if (entry.isDirectory()) t = walk(file);
      else if (file.startsWith(plugin + path.sep))
        t = committed.get(path.relative(plugin, file).split(path.sep).join("/"));
      else t = ELECTRON_TIME;
      // Built here and not committed (the canvas's dist): its build time is its real one.
      t ??= fs.lstatSync(file).mtime;
      fs.lutimesSync(file, t, t);
      if (t > newest) newest = t;
    }
    return newest;
  };
  walk(appOutDir);
}
