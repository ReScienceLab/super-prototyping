/**
 * The writes the canvas makes back into a project: a board's `status`, set from the badge on the
 * inspector's stage, and a cloned folder's name. They live here rather than in vite.config.ts so
 * they can be tested as what they are — pure string edits — without standing a dev server up
 * around them.
 */

/** A slug or file name that is safe to join into a path: no separators, no dots of its own. */
export const SAFE_NAME = /^[\w.-]+$/;

/** The vocabulary the endpoint accepts, mirroring `CanvasBoardStatus`. */
export const BOARD_STATUSES = ["exploring", "outdated", "live"];


/**
 * layout.json with one board's `status` set, edited as text.
 *
 * As text, and never through JSON.parse + JSON.stringify: these files are hand-formatted — one
 * board per line, rows ordered to read like a walkthrough — and a round-trip through the parser
 * would reformat every line of a file that belongs to whoever installed the plugin.
 *
 * A board appears in a row's `files` either as a bare `"name"`, which has to grow into an object
 * to carry anything, or as an object already holding `"file": "name"`. Entries never nest, so
 * `[^{}]*` is enough to find the one that names this board. Returns null when the layout does
 * not mention the board at all — one discovered on disk that no row ever listed.
 */
export function withBoardStatus(source: string, file: string, status: string) {
  const name = file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const STATUS = /"status"\s*:\s*"[^"]*"/;
  // What a board that says nothing already is. Setting one to this writes no `status` at all —
  // the shorthand the folder is written in, and what undoing a change has to get back to.
  let folderDefault = "live";
  try {
    folderDefault = JSON.parse(source).status ?? "live";
  } catch {
    // Unparseable layout: fall through and write the override anyway.
  }

  const object = new RegExp(`\\{[^{}]*"file"\\s*:\\s*"${name}"[^{}]*\\}`);
  const match = object.exec(source);
  if (match) {
    const entry = match[0];
    const splice = (replacement: string) =>
      source.slice(0, match.index) + replacement + source.slice(match.index + entry.length);
    if (status === folderDefault) {
      if (!STATUS.test(entry)) return source;
      // Back to what the folder says: take the override out rather than spell out what the line
      // above already said. An entry left holding nothing but its `file` goes back to being the
      // bare name it was before anyone clicked.
      const without = entry
        .replace(/\s*,\s*"status"\s*:\s*"[^"]*"/, "")
        .replace(/"status"\s*:\s*"[^"]*"\s*,\s*/, "");
      const bare = new RegExp(`^\\{\\s*"file"\\s*:\\s*"${name}"\\s*\\}$`);
      return splice(bare.test(without) ? `"${file}"` : without);
    }
    return splice(
      STATUS.test(entry)
        ? entry.replace(STATUS, `"status": "${status}"`)
        : entry.replace(/\s*\}$/, `, "status": "${status}" }`),
    );
  }

  // A bare string entry. It only ever appears inside an array, so it is preceded by `[` or `,`
  // and followed by `,` or `]` — which is what keeps this off `"cover": "name"` and off a
  // `"label"` that happens to read the same.
  const bare = new RegExp(`([[,]\\s*)"${name}"(\\s*[,\\]])`);
  const found = bare.exec(source);
  if (!found) return null;
  // Already what it is being set to: leave the shorthand alone rather than expanding it into an
  // object that says what the folder already said.
  if (status === folderDefault) return source;
  return (
    source.slice(0, found.index) +
    `${found[1]}{ "file": "${file}", "status": "${status}" }${found[2]}` +
    source.slice(found.index + found[0].length)
  );
}


/**
 * The folder name a typed canvas name becomes. ASCII only: a slug is also the `?canvas=`
 * parameter and the name SAFE_NAME guards, so a name with nothing ASCII in it slugs to the empty
 * string and the caller has to ask for another. Leading and trailing dots go with it, which is
 * what keeps a name of ".." from becoming a path.
 */
export const canvasSlug = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^\w.-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

/**
 * layout.json with the page's `name` set, edited as text for the same reason withBoardStatus is:
 * a clone starts as a copy of a hand-formatted file, and only the key that names it should read
 * differently afterwards.
 *
 * The scan is for the `name` sitting directly inside the outermost object, not for the first one
 * the file happens to contain: rows carry `title`, `label` and `url` strings of their own, and a
 * blind replace could land in one of those instead.
 */
export function withCanvasName(source: string, name: string) {
  const value = JSON.stringify(name);
  const KEY = /^"name"\s*:\s*"(?:[^"\\]|\\.)*"/;
  for (let i = 0, depth = 0; i < source.length; i++) {
    const char = source[i];
    if (char === "{" || char === "[") depth++;
    else if (char === "}" || char === "]") depth--;
    else if (char === '"') {
      const match = depth === 1 ? KEY.exec(source.slice(i)) : null;
      if (match) {
        return (
          source.slice(0, i) + `"name": ${value}` + source.slice(i + match[0].length)
        );
      }
      // Past the string, so its contents are never mistaken for structure or for the key.
      while (++i < source.length && source[i] !== '"') if (source[i] === "\\") i++;
    }
  }
  // A layout that named nothing — the page was going by its humanized slug. Write the key at the
  // front, where a layout that has one puts it.
  const empty = /^\s*\{\s*\}\s*$/.test(source);
  return source.replace("{", empty ? `{\n  "name": ${value}\n` : `{\n  "name": ${value},`);
}
