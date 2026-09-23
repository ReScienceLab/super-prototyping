/**
 * The agent's text as HTML. Claude writes markdown — bold, lists, fences, GFM tables with a
 * `<br>` inside a cell — and writes it a few characters at a time, so the text is mended before
 * it is parsed and sanitized after. remend closes what a delta cut open, so `**29` is bold from
 * the first paint rather than asterisks until the next delta arrives; marked passes raw HTML
 * through, `<script>` included, so DOMPurify is the only thing between the model and
 * dangerouslySetInnerHTML, and every string goes through it. No highlighting: a fence is escaped
 * text (docs/2026-09-17-canvas-chat-panel.md).
 */
import DOMPurify from "dompurify";
import { Marked } from "marked";
import remend from "remend";

// The agent links what it made as `file:///…`, which DOMPurify drops and an http page could not
// follow anyway. Relative to the project's page, `file/<path>` is the project's server
// handing that file over (server/sp.ts), and a path outside the project is a 404 there.
const md = new Marked({
  walkTokens(token) {
    if (token.type === "link" && /^file:\/\//i.test(token.href)) {
      const url = new URL(token.href);
      token.href = `file${url.pathname}${url.search}${url.hash}`;
    }
  },
});

export function renderMarkdown(text: string): string {
  return DOMPurify.sanitize(md.parse(remend(text), { async: false }));
}
