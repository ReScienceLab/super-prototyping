import { useEffect, useReducer } from "react";
import { atom, useValue } from "tldraw";
import { canvasIndex, DOCS_CHANGED } from "./canvasIndex";
import { readDoc } from "./canvasTabs";
import { Eye, Pen } from "./geistIcons";
import { renderMarkdown } from "./markdown";

// The document being edited on the open tab: its slug, its text, and the text it had when the
// edit began, which the server checks the file against so an agent's rewrite since is not lost.
// Undefined while it is read. Then why the last save failed. Shared by the tab and its switch at
// the strip's end.
type Draft = { slug: string; text: string; base: string };
const draft = atom<Draft | undefined>("doc draft", undefined);
const saveError = atom<string | undefined>("doc save error", undefined);

/** Whether `d` is written, or needed no writing. A failure is shown, and the caller keeps it. */
async function save(d: Draft, keepalive = false) {
  if (d.text === d.base) return true;
  let response: Response;
  try {
    response = await fetch(`${import.meta.env.BASE_URL}__sp/doc`, {
      method: "POST",
      // Outlives the page, for the save as another project's canvas replaces this one (DocTab).
      // Only then: a keepalive body over 64 KiB is refused.
      keepalive,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: d.slug, text: d.text, base: d.base }),
    });
  } catch (error) {
    saveError.set(`Not saved: ${error}`);
    return false;
  }
  if (!response.ok) {
    saveError.set(`Not saved: ${await response.text()}`);
    return false;
  }
  saveError.set(undefined);
  // Ahead of the watcher's copy, so Read does not show the old text for a moment first.
  canvasIndex().docs!.find((doc) => doc.name === d.slug)!.text = d.text;
  window.dispatchEvent(new Event(DOCS_CHANGED));
  return true;
}

/** This slug's draft, if the one being edited is this document's. */
const draftOf = (slug: string) => {
  const d = draft.get();
  return d?.slug === slug ? d : undefined;
};

/**
 * A switch between reading and editing the document in front, at the end of the canvas strip (CanvasStrip.tsx)
 * where a canvas has its own controls. Only a project's own document, in an app with a server to
 * write it, can switch: an example's is the app's, and its switch is disabled and its title says why.
 * Switching back to reading saves, and so does ⌘S.
 */
export function DocModeSwitch({ slug }: { slug: string }) {
  const editing = useValue("doc editing", () => draftOf(slug) !== undefined, [slug]);
  const readOnly = !canvasIndex().served
    ? "Read only here: this build has no server to save to"
    : slug.includes("/")
      ? "Read only: an example's documents are the app's"
      : undefined;
  return (
    <button
      type="button"
      role="switch"
      className="sp-canvas-tabs-mode"
      aria-checked={editing}
      aria-label="Edit"
      disabled={readOnly !== undefined}
      title={
        readOnly ?? (editing ? "Editing. Switch off to save and read" : "Reading. Switch on to edit")
      }
      onClick={async () => {
        const d = draftOf(slug);
        if (d === undefined) draft.set({ slug, text: readDoc(slug)!, base: readDoc(slug)! });
        else if (await save(d)) draft.set(undefined);
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
 * leaves a draft being edited alone; saving it then is refused rather than overwrite the agent's
 * text. Leaving the tab saves the draft, on unmount (another tab) or pagehide (another project).
 * A draft that will not save is kept, and is there to edit again on coming back.
 */
export function DocTab({ slug }: { slug: string }) {
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const leave = (keepalive: boolean) => {
      const d = draftOf(slug);
      draft.set(undefined);
      saveError.set(undefined);
      // Kept on failure, unless it has been reopened and edited again since.
      if (d) void save(d, keepalive).then((saved) => saved || draft.get() || draft.set(d));
    };
    const hide = () => leave(true);
    window.addEventListener(DOCS_CHANGED, redraw);
    window.addEventListener("pagehide", hide);
    return () => {
      window.removeEventListener(DOCS_CHANGED, redraw);
      window.removeEventListener("pagehide", hide);
      leave(false);
    };
  }, [slug]);
  const text = useValue("doc draft", () => draftOf(slug)?.text, [slug]);
  const error = useValue("doc save error", () => saveError.get(), []);

  return (
    <div className="canvas-doc-tab">
      {error && <p className="canvas-doc-error">{error}</p>}
      {text === undefined ? (
        <article
          className="sp-chat-md"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(readDoc(slug)!) }}
        />
      ) : (
        <textarea
          className="canvas-doc-source"
          aria-label={slug}
          value={text}
          spellCheck={false}
          autoFocus
          onChange={(e) => draft.set({ ...draftOf(slug)!, text: e.target.value })}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
              e.preventDefault();
              const d = draftOf(slug)!;
              // Saved, the file is the text now, and the next save checks against it. The text
              // stays the current one, which may have been typed on while this was in flight.
              void save(d).then((saved) => {
                const now = draftOf(slug);
                if (saved && now) draft.set({ ...now, base: d.text });
              });
            }
          }}
        />
      )}
    </div>
  );
}
