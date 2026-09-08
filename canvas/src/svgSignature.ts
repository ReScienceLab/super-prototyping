/**
 * A vector's geometry as one string: the viewBox, then every drawing element's shape attributes
 * in document order, whitespace collapsed. Fills, ids, classes and whatever a generator writes
 * into the root tag on the way in (`class`, `style`, `preserveAspectRatio`) are left out, so the
 * `<svg>` on a board and the `assets/icons/*.svg` it was inlined from sign alike although their
 * bytes differ. `svg:<fnv1a of this>` is the asset key on both sides of the join.
 *
 * It reads markup, not a DOM, so the build-time index in Node and the inspector's agent in the
 * frame run this one function: the agent splices in its `toString()`. Keep it self-contained,
 * with no reference to anything outside its own body, so that source survives minification.
 */
export function svgSignature(markup: string): string {
  const attrs = ["d", "x", "y", "width", "height", "r", "rx", "ry", "cx", "cy", "x1", "y1", "x2", "y2", "points"];
  const out = [(/viewBox\s*=\s*["']([^"']*)["']/.exec(markup) || ["", ""])[1]];
  const re = /<(path|rect|circle|ellipse|line|polygon|polyline)\b([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markup))) {
    const parts = [m[1]];
    for (let i = 0; i < attrs.length; i++) {
      const a = new RegExp("\\s" + attrs[i] + "\\s*=\\s*[\"']([^\"']*)[\"']").exec(m[2]);
      parts.push(a ? a[1] : "");
    }
    out.push(parts.join("|"));
  }
  return out.join("\n").replace(/\s+/g, " ");
}
