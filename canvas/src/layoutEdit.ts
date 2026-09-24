/**
 * The writes the canvas makes back into a project's layout.json: a cloned folder's name and the
 * canvas's ground. They live here rather than in the server so they can be tested as what they
 * are, pure string edits, without standing a dev server up around them.
 */

/** A slug or file name that is safe to join into a path: no separators, and no leading dot, so
 *  never `.` or `..`, which would name the folder itself or the one above it. */
export const SAFE_NAME = /^(?!\.)[\w.-]+$/;

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
 * layout.json with one top-level string key set, or taken out when `value` is null: the page's
 * `name` from a clone, its `ground` from the canvas's Background menu.
 *
 * Edited as text, and never through JSON.parse + JSON.stringify: these files are hand-formatted,
 * one board per line and rows ordered to read like a walkthrough, and a round-trip through the
 * parser would reformat every line of a file that belongs to whoever installed the app. A
 * hand-formatted file should only read differently at the key that changed.
 *
 * The scan is for the key sitting directly inside the outermost object, not for the first one
 * the file happens to contain: rows carry `title`, `label` and `url` strings of their own, and a
 * blind replace could land in one of those instead.
 */
export function withLayoutKey(source: string, key: string, value: string | null) {
  const json = JSON.stringify(value);
  const KEY = new RegExp(`^"${key}"\\s*:\\s*"(?:[^"\\\\]|\\\\.)*"`);
  for (let i = 0, depth = 0; i < source.length; i++) {
    const char = source[i];
    if (char === "{" || char === "[") depth++;
    else if (char === "}" || char === "]") depth--;
    else if (char === '"') {
      const match = depth === 1 ? KEY.exec(source.slice(i)) : null;
      if (match) {
        const end = i + match[0].length;
        if (value !== null) return source.slice(0, i) + `"${key}": ${json}` + source.slice(end);
        // Out with the whitespace before it and one comma: the one after it, else the one
        // before, which is what a last key leaves behind.
        const head = source.slice(0, i);
        const after = /^\s*,/.exec(source.slice(end));
        if (after) return head.trimEnd() + source.slice(end + after[0].length);
        return head.replace(/,\s*$/, "") + source.slice(end);
      }
      // Past the string, so its contents are never mistaken for structure or for the key.
      while (++i < source.length && source[i] !== '"') if (source[i] === "\\") i++;
    }
  }
  if (value === null) return source;
  // A layout without the key. Write it at the front, where a layout that has one puts it.
  const empty = /^\s*\{\s*\}\s*$/.test(source);
  const at = source.indexOf("{");
  if (at < 0) return source;
  // Spliced rather than `replace`: a replacement string reads `$&` and friends as patterns, and
  // a canvas can be named anything.
  const line = empty ? `\n  "${key}": ${json}\n` : `\n  "${key}": ${json},`;
  return source.slice(0, at + 1) + line + source.slice(at + 1);
}
