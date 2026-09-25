import { Tabs } from "radix-ui";
import { useRef, useState, type RefObject } from "react";
import { CloudUpload, Copy, Cross, Sparkles } from "./geistIcons";

/** What a new project starts with once it is open: the agent on the references, or on PRD.md. */
export type NewProjectStart =
  | { mode: "clone"; files: File[] }
  | { mode: "build"; define: boolean; idea: string };

type Picked = { file: File; url: string };

/**
 * The New project dialog: an optional name, and which of two ways the project starts, listed
 * down the side so a third has somewhere to go. Clone takes screenshots and screen recordings,
 * dropped anywhere on the dialog or browsed for, and hands them to the sp-clone-prototype skill.
 * Build is the dialog as it was, a name and the offer of sp-define-product. The modes are Radix's
 * tabs, for their keys and roles; the dialog is the browser's, which already traps focus and
 * closes on Escape. It is one size for both, so switching moves nothing (home.css).
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
  // Held here, since only the panel in front is mounted: each has the name field, and a look
  // at Clone must not lose the idea typed under Build.
  const [name, setName] = useState("");
  const [idea, setIdea] = useState("");
  const [define, setDefine] = useState(true);

  const nameField = (
    <>
      <label>
        <span>
          Project name <small>Optional</small>
        </span>
        {/* Not "name", which browsers fill with the person's own, and no history of past
            entries. Left empty, the agent names the project once it knows what it is. */}
        <input
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          placeholder="Leave empty and the agent names it"
          autoComplete="off"
        />
      </label>
      {said && <p className="new-project-said">{said}</p>}
    </>
  );

  // By name, so the same file dropped twice is there once, and the server can write each under
  // its own name without two of them colliding.
  const add = (list: FileList | null) => {
    // Pictures and recordings, which is what sp-clone-prototype measures from.
    const files = [...(list ?? [])].filter((file) => /^(image|video)\//.test(file.type));
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
      // Once Create is pressed the project is being made, so Escape and Cancel wait for it.
      onCancel={(event) => busy && event.preventDefault()}
      // Closed by Cancel, Escape or a project made: the next one starts with nothing dropped.
      onClose={() => {
        for (const p of picked) URL.revokeObjectURL(p.url);
        setPicked([]);
        setOver(false);
        setName("");
        setIdea("");
        setDefine(true);
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
      <Tabs.Root
        asChild
        value={mode}
        onValueChange={(value) => setMode(value as NewProjectStart["mode"])}
        orientation="vertical"
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              await create(
                name,
                mode === "clone"
                  ? { mode, files: picked.map((p) => p.file) }
                  : { mode, define, idea: idea.trim() },
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <nav className="new-project-modes">
            <h2>New project</h2>
            <Tabs.List aria-label="Start from">
              <Tabs.Trigger value="clone">
                <b>
                  <Copy />
                  Clone an app
                </b>
                <small>Screenshots or recordings</small>
              </Tabs.Trigger>
              <Tabs.Trigger value="build">
                <b>
                  <Sparkles />
                  Build from an idea
                </b>
                <small>Define it, then mock it</small>
              </Tabs.Trigger>
            </Tabs.List>
          </nav>
          <div className="new-project-main">
            <Tabs.Content value="clone">
              <h3>Clone an app</h3>
              <p className="new-project-lede">
                The agent measures what you drop and rebuilds it as boards with{" "}
                <code>/sp-clone-prototype</code>.
              </p>
              {nameField}
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
            </Tabs.Content>
            <Tabs.Content value="build">
              <h3>Build from an idea</h3>
              <p className="new-project-lede">
                Work out what the product is with the agent, then mock its
                screens.
              </p>
              {nameField}
              {/* Whatever they have, in their words: the agent starts from it (AppShell.tsx). */}
              <label className="new-project-idea">
                <span>
                  What's the idea? <small>Optional</small>
                </span>
                <textarea
                  value={idea}
                  onChange={(event) => setIdea(event.currentTarget.value)}
                  placeholder="Say whatever comes to mind: who it's for, what bugs you about how it's done now, an app it should feel like, a screen you can already picture…"
                />
              </label>
              <label className="home-dialog-check">
                <input
                  type="checkbox"
                  checked={define}
                  onChange={(event) => setDefine(event.currentTarget.checked)}
                />
                <span>
                  Define the product with the agent <code>/sp-define-product</code>
                </span>
              </label>
            </Tabs.Content>
            <div className="new-project-actions">
              {mode === "clone" && (
                <span>You can add more later in the chat</span>
              )}
              <button type="button" disabled={busy} onClick={() => dialog.current!.close()}>
                Cancel
              </button>
              <button type="submit" disabled={busy}>
                Create
              </button>
            </div>
          </div>
        </form>
      </Tabs.Root>
    </dialog>
  );
}
