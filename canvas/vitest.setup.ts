import fs from "node:fs";
import path from "node:path";
import { inject } from "vitest";
import { installCanvasIndex } from "./src/canvasIndex.ts";

installCanvasIndex(inject("canvasIndex"));

// A board is fetched from `/board/<slug>/<file>`, and the tests have no server: the same file
// read off this checkout's own boards. Anything else is a fetch the test did not mean to make.
// Resolved from the cwd, which vitest sets to canvas/: under jsdom `import.meta.url` is not a
// file URL.
const canvasesDir = path.resolve("../mockups/canvases");
globalThis.fetch = async (input) => {
  const url = String(input);
  const match = /^\/board\/(.+)$/.exec(url);
  if (!match) throw new Error(`unexpected fetch in a test: ${url}`);
  const file = path.join(canvasesDir, decodeURI(match[1]));
  if (!fs.statSync(file, { throwIfNoEntry: false })?.isFile()) {
    return new Response("not a board", { status: 404 });
  }
  return new Response(fs.readFileSync(file));
};
