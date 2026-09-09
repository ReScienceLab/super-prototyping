/**
 * What a write under the boards directory means, and what the set of boards looks like right now.
 *
 * They live here rather than in vite.config.ts, like the write helpers in boardStatusEdit.ts, so
 * they can be tested as what they are — a path classifier and a directory listing — without
 * standing a dev server up around them.
 *
 * Paths arrive from `fs.watch`, which spells them the way the platform does. Everything below
 * compares them with forward slashes, which is what the rest of the plugin already assumes.
 */

const slashes = (p: string) => p.replace(/\\/g, "/");

/** The board files the discovery scan reads, one level deep: `<slug>/<name>`. */
const BOARD_FILES = /^[^/]+\/[^/]+$/;

/**
 * What one changed path is to the canvas, or null for a path it has no opinion about — a
 * generator, a README, anything under `scratch/`.
 *
 * - `board`: a board's HTML. Its transformed module holds the file as it was first read, so it
 *   has to be dropped and the page reloaded.
 * - `layout`: a board folder's layout.json. Read on every render, and handed to the page over
 *   HMR rather than through a reload, which would throw the viewport away.
 * - `assets`: an image or assets.json, whose bytes are hashed into the generated index.
 * - `comments`: comments.json, which the page that wrote it already has.
 *
 * Only one level deep, because that is what `scan()` discovers: a `scratch/draft.html` is a
 * working file, not a board, and reloading the canvas for it interrupts the run that wrote it.
 */
export function boardChangeKind(
  canvasesDir: string,
  file: string,
): "board" | "layout" | "assets" | "comments" | null {
  const dir = slashes(canvasesDir).replace(/\/$/, "");
  const full = slashes(file);
  if (!full.startsWith(dir + "/")) return null;
  const rel = full.slice(dir.length + 1);

  // An asset, at any depth under the folder that holds them. `refs/` is third-party captures,
  // which are never committed and never indexed, and a clone run writes hundreds of them.
  const asset = /^[^/]+\/assets(-dark)?\/(.+)$/.exec(rel);
  if (asset) return /^refs(\/|$)/.test(asset[2]) ? null : "assets";

  if (!BOARD_FILES.test(rel)) return null;
  const name = rel.slice(rel.indexOf("/") + 1);
  if (name.endsWith(".html")) return "board";
  if (name === "layout.json") return "layout";
  if (name === "comments.json") return "comments";
  if (name === "assets.json" || name === "icon.png") return "assets";
  return null;
}

/** The board folder a path is in, for a path `boardChangeKind` claimed. */
export function boardSlug(canvasesDir: string, file: string): string {
  const rel = slashes(file).slice(slashes(canvasesDir).replace(/\/$/, "").length + 1);
  return rel.slice(0, rel.indexOf("/"));
}

/**
 * The set of boards as one string: every folder, and the files in it that the scan would read.
 *
 * Compared against the last one after a batch of writes, this is what separates "a board was
 * added, removed or renamed" — where the generated index is stale and the page has to be
 * reloaded — from "a board was edited", where a reload would be a heavier answer than the change
 * deserves. Contents are deliberately not in it: an edit does not move the set.
 *
 * comments.json is left out too. It changes on every comment posted, and the page that posted it
 * is holding the composer that a reload would close.
 *
 * `list` is `fs.readdirSync` in the server and a fake in the tests. It returns nothing for a path
 * it cannot read, so a dangling symlink or a folder pulled out from under the scan signs as
 * empty rather than throwing out of the watcher.
 */
export function boardSetSignature(
  canvasesDir: string,
  list: (dir: string) => string[],
): string {
  return list(canvasesDir)
    .filter((slug) => !slug.startsWith("."))
    .sort()
    .map((slug) => {
      const files = list(`${canvasesDir}/${slug}`)
        .filter(
          (name) =>
            !name.startsWith(".") &&
            (name.endsWith(".html") ||
              name === "layout.json" ||
              name === "icon.png" ||
              name === "assets.json"),
        )
        .sort();
      return `${slug}:${files.join(",")}`;
    })
    .join("|");
}
