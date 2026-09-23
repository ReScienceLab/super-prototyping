import { useEffect, useReducer } from "react";
import { atom, useValue } from "tldraw";
import { canvasIndex, DOCS_CHANGED } from "./canvasIndex";
import { readDoc } from "./canvasTabs";
import { Eye, Pen } from "./geistIcons";
import { renderMarkdown } from "./markdown";

// The text being edited on the open document's tab, or undefined while it is read, and why the
// last save failed. Shared by the tab and its switch at the strip's end.
const draft = atom<string | undefined>("doc draft", undefined);
const saveError = atom<string | undefined>("doc save error", undefined);

async function save(slug: string, next: string) {
  if (next === readDoc(slug)) return true;
  const response = await fetch(`${import.meta.env.BASE_URL}__sp/doc`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: slug, text: next }),
  });
  if (!response.ok) {
    saveError.set(`Not saved: ${await response.text()}`);
    return false;
  }
  saveError.set(undefined);
  // Ahead of the watcher's copy, so Read does not show the old text for a moment first.
  canvasIndex().docs!.find((doc) => doc.name === slug)!.text = next;
  window.dispatchEvent(new Event(DOCS_CHANGED));
  return true;
}

/**
 * A switch between reading and editing the document in front, at the end of the canvas strip (CanvasStrip.tsx)
 * where a canvas has its own controls. Only a project's own document, in an app with a server to
 * write it, has one: an example's is the app's. Switching back to reading saves, and so does ⌘S.
 */
export function DocModeSwitch({ slug }: { slug: string }) {
  const editing = useValue("doc editing", () => draft.get() !== undefined, []);
  if (!canvasIndex().served || slug.includes("/")) return null;
  return (
    <button
      type="button"
      role="switch"
      className="sp-canvas-tabs-mode"
      aria-checked={editing}
      aria-label="Edit"
      title={editing ? "Editing. Switch off to save and read" : "Reading. Switch on to edit"}
      onClick={async () => {
        const text = draft.get();
        if (text === undefined) draft.set(readDoc(slug) ?? "");
        else if (await save(slug, text)) draft.set(undefined);
      }}
    >
      <Eye />
      <span className="sp-canvas-tabs-mode-track" />
      <Pen />
    </button>
  );
}

/**
 * A Markdown file as a tab, over the canvas the way a kit is: read, it is the chat panel's
 * markdown, sanitized the same way, at a document's size; edited, it is the file's own text.
 * The agent rewriting the file changes what Read shows without a reload (canvasIndex.ts), and
 * leaves a draft being edited alone.
 */
export function DocTab({ slug }: { slug: string }) {
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    window.addEventListener(DOCS_CHANGED, redraw);
    return () => {
      window.removeEventListener(DOCS_CHANGED, redraw);
      draft.set(undefined);
      saveError.set(undefined);
    };
  }, []);
  const text = useValue("doc draft", () => draft.get(), []);
  const error = useValue("doc save error", () => saveError.get(), []);

  return (
    <div className="canvas-doc-tab">
      {error && <p className="canvas-doc-error">{error}</p>}
      {text === undefined ? (
        <article
          className="sp-chat-md"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(readDoc(slug) ?? "") }}
        />
      ) : (
        <textarea
          className="canvas-doc-source"
          aria-label={slug}
          value={text}
          spellCheck={false}
          autoFocus
          onChange={(e) => draft.set(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
              e.preventDefault();
              void save(slug, text);
            }
          }}
        />
      )}
    </div>
  );
}
