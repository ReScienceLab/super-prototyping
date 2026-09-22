import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";
import { boardIndex, type BoardIndex } from "./server/boards.ts";

declare module "vitest" {
  interface ProvidedContext {
    canvasIndex: BoardIndex;
  }
}

// The tests read this checkout's own boards through the same index the page fetches. Scanned
// once here and handed to every test file by `inject` (vitest.setup.ts): it hashes 300 MB of
// assets, and a scan per file would be a minute of the same work.
export default function setup(project: TestProject) {
  const repoRoot = fileURLToPath(new URL("..", import.meta.url));
  project.provide(
    "canvasIndex",
    boardIndex(path.join(repoRoot, "canvases"), {
      served: false,
      canvasesNamespace: "",
    }),
  );
}
