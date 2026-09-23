import { useEffect, useReducer, useState } from "react";
import { canvasIndex, DOCS_CHANGED } from "./canvasIndex";
import { readDoc } from "./canvasTabs";
import { renderMarkdown } from "./markdown";

/**
 * A Markdown file as a tab, over the canvas the way a kit is: read, it is the chat panel's
 * markdown, sanitized the same way, at a document's size; edited, it is the file's own text.
 * Only a project's own document, in an app with a server to write it, has the switch: an
 * example's is the app's. Leaving the editor saves, and so does ⌘S.
 *
 * The agent rewriting the file changes what Read shows without a reload (canvasIndex.ts), and
 * leaves a draft being edited alone.
 */
export function DocTab({ slug }: { slug: string }) {
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    window.addEventListener(DOCS_CHANGED, redraw);
    return () => window.removeEventListener(DOCS_CHANGED, redraw);
  }, []);
  const text = readDoc(slug) ?? "";
  const editable = canvasIndex().served && !slug.includes("/");
  // The text being edited, or undefined while the tab is being read.
  const [draft, setDraft] = useState<string>();
  const [error, setError] = useState<string>();

  const save = async (next: string) => {
    if (next === text) return true;
    const response = await fetch(`${import.meta.env.BASE_URL}__sp/doc`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: slug, text: next }),
    });
    if (!response.ok) {
      setError(`Not saved: ${await response.text()}`);
      return false;
    }
    setError(undefined);
    // Ahead of the watcher's copy, so Read does not show the old text for a moment first.
    canvasIndex().docs!.find((doc) => doc.name === slug)!.text = next;
    redraw();
    return true;
  };

  return (
    <div className="canvas-doc-tab">
      {editable && (
        <div className="canvas-doc-mode" role="group" aria-label="Mode">
          <button
            type="button"
            aria-pressed={draft === undefined}
            onClick={async () => {
              if (draft === undefined || (await save(draft))) setDraft(undefined);
            }}
          >
            Read
          </button>
          <button
            type="button"
            aria-pressed={draft !== undefined}
            onClick={() => draft === undefined && setDraft(text)}
          >
            Edit
          </button>
        </div>
      )}
      {error && <p className="canvas-doc-error">{error}</p>}
      {draft === undefined ? (
        <article
          className="sp-chat-md"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
        />
      ) : (
        <textarea
          className="canvas-doc-source"
          aria-label={slug}
          value={draft}
          spellCheck={false}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
              e.preventDefault();
              void save(draft);
            }
          }}
        />
      )}
    </div>
  );
}
