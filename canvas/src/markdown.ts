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
import { marked } from "marked";
import remend from "remend";

export function renderMarkdown(text: string): string {
  return DOMPurify.sanitize(marked.parse(remend(text), { async: false }));
}
