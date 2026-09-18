/**
 * The composer's box is a contenteditable rather than a textarea, because a reference to an
 * attached image is a thumbnail sitting inside the sentence and a textarea holds nothing but
 * characters. This reads that box back as what the message says: each chip as the "#N" the
 * sentence means by it, which is the same "#N" the agent is handed beside the picture.
 *
 * Kept out of ChatPanel.tsx so it can be read off a plain document in a test; the panel owns the
 * box, the caret and the chips themselves.
 */

/**
 * Whether the box still points at an attached picture. A chip whose picture was removed is struck
 * through rather than taken out — the sentence is not rewritten under whoever typed it — and it
 * still reads as "#N" below, so it counts. This is what lets the numbering start over: while it
 * is false, no number in the box can be repointed by handing it out again.
 */
export const namesAPicture = (box: ParentNode) =>
  !!box.querySelector("[data-ref]");

/** What the box says, as text: a chip as "#N", a break as a newline. */
export function readDraft(node: Node): string {
  let out = "";
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) out += child.textContent ?? "";
    else if (child instanceof HTMLElement) {
      // The chip's own text says "#2" as well, so the number is read off the element and its
      // insides are not walked: a reference counts once however it is drawn.
      if (child.dataset.ref) out += `#${child.dataset.ref}`;
      else if (child.tagName === "BR") out += "\n";
      else {
        // Paste and some engines' Enter make a block rather than a break; the block boundary is
        // the newline it stands in for.
        if (out && /^(DIV|P)$/.test(child.tagName)) out += "\n";
        out += readDraft(child);
      }
    }
  }
  return out;
}
