import { useRef, useState, type RefObject } from "react";
import { CloudUpload, Copy, Cross, Sparkles } from "./geistIcons";

/** What a new project starts with once it is open: the agent on the references, or on PRD.md. */
export type NewProjectStart =
  { mode: "clone"; files: File[] } | { mode: "build"; define: boolean };

type Picked = { file: File; url: string };

/** Pictures and recordings, which is what clone-prototype measures from. */
const isReference = (file: File) => /^(image|video)\//.test(file.type);

/**
 * The New project dialog: a name, and which of two ways the project starts, listed down the side
 * so a third has somewhere to go. Clone takes screenshots and screen recordings, dropped anywhere
 * on the dialog or browsed for, and hands them to the clone-prototype skill. Build is the dialog
 * as it was, a name and the offer of define-product.
 */
export function NewProjectDialog({
  dialog,
  said,
  create,
}: {
  dialog: RefObject<HTMLDialogElement | null>;
  /** What the server said about the last try, under the name. */
  said: string;
  create(name: string, start: NewProjectStart): Promise<void>;
}) {
  const [mode, setMode] = useState<NewProjectStart["mode"]>("clone");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const browse = useRef<HTMLInputElement>(null);

  // By name, so the same file dropped twice is there once, and the server can write each under
  // its own name without two of them colliding.
  const add = (list: FileList | null) => {
    const files = [...(list ?? [])].filter(isReference);
    if (files.length === 0) return;
    setMode("clone");
    setPicked((had) => {
      const names = new Set(files.map((f) => f.name));
      for (const p of had)
        if (names.has(p.file.name)) URL.revokeObjectURL(p.url);
      return [
        ...had.filter((p) => !names.has(p.file.name)),
        ...files.map((file) => ({ file, url: URL.createObjectURL(file) })),
      ];
    });
  };
  const remove = (gone: Picked) => {
    URL.revokeObjectURL(gone.url);
    setPicked((had) => had.filter((p) => p !== gone));
  };

  return (
    <dialog
      ref={dialog}
      className="home-dialog"
      // Closed by Cancel, Escape or a project made: the next one starts with nothing dropped.
      onClose={() => {
        for (const p of picked) URL.revokeObjectURL(p.url);
        setPicked([]);
        setOver(false);
      }}
      // The whole dialog takes a drop, not only the zone, since a file let go a little outside it
      // would otherwise be opened by the browser in place of the page.
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        add(event.dataTransfer.files);
      }}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setBusy(true);
          await create(
            form.get("project") as string,
            mode === "clone"
              ? { mode, files: picked.map((p) => p.file) }
              : { mode, define: form.has("define") },
          );
          setBusy(false);
        }}
      >
        <nav
          className="new-project-modes"
          role="tablist"
          aria-label="Start from"
        >
          <h2>New project</h2>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "clone"}
            onClick={() => setMode("clone")}
          >
            <b>
              <Copy />
              Clone an app
            </b>
            <small>Screenshots or recordings</small>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "build"}
            onClick={() => setMode("build")}
          >
            <b>
              <Sparkles />
              Build from an idea
            </b>
            <small>Define it, then mock it</small>
          </button>
        </nav>
        <div className="new-project-main" role="tabpanel">
          <h3>{mode === "clone" ? "Clone an app" : "Build from an idea"}</h3>
          <p className="new-project-lede">
            {mode === "clone" ? (
              <>
                The agent measures what you drop and rebuilds it as boards with{" "}
                <code>/clone-prototype</code>.
              </>
            ) : (
              <>
                Work out what the product is with the agent, then mock its
                screens.
              </>
            )}
          </p>
          <label>
            <span>Project name</span>
            {/* Not "name", which browsers fill with the person's own, and no history of past entries. */}
            <input
              name="project"
              placeholder="Project name"
              autoComplete="off"
              autoFocus
              required
            />
          </label>
          {said && <p className="new-project-said">{said}</p>}
          {mode === "clone" ? (
            <div className="new-project-drop" data-over={over || undefined}>
              {picked.length > 0 && (
                <ul>
                  {picked.map((p) => (
                    <li key={p.url} title={p.file.name}>
                      {p.file.type.startsWith("video/") ? (
                        <video src={p.url} muted preload="metadata" />
                      ) : (
                        <img src={p.url} alt={p.file.name} />
                      )}
                      <button
                        type="button"
                        aria-label={`Remove ${p.file.name}`}
                        onClick={() => remove(p)}
                      >
                        <Cross />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {picked.length === 0 && (
                <span className="new-project-drop-icon">
                  <CloudUpload />
                </span>
              )}
              <strong>
                {picked.length === 0
                  ? "Drop screenshots or screen recordings"
                  : "Drop more, or"}
              </strong>
              <button type="button" onClick={() => browse.current!.click()}>
                Browse files
              </button>
              <input
                ref={browse}
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={(event) => {
                  add(event.currentTarget.files);
                  event.currentTarget.value = "";
                }}
              />
            </div>
          ) : (
            <label className="home-dialog-check">
              <input type="checkbox" name="define" defaultChecked />
              <span>
                Define the product with the agent <code>/define-product</code>
              </span>
            </label>
          )}
          <div className="new-project-actions">
            {mode === "clone" && (
              <span>You can add more later in the chat</span>
            )}
            <button type="button" onClick={() => dialog.current!.close()}>
              Cancel
            </button>
            <button type="submit" disabled={busy}>
              Create
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
