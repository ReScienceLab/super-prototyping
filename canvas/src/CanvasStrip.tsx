import { useContext, useEffect, useReducer, useRef, useState } from "react";
import { CanvasChromeContext } from "./canvasChrome";
import { shortName } from "./canvasLibrary";
import { docsOf, ownCanvases, pageOf, tabFor, tabUrl } from "./canvasTabs";
import { canvasIndex, LAYOUT_CHANGED } from "./canvasIndex";
import { groundEditable, setGround, useGround } from "./canvasGround";
import { ViewIcon } from "./CanvasTabBar";
import { sheetPageUrl, type CanvasTab } from "./canvasUrl";
import { confirmTrash, openMenu, REVEAL, TRASH } from "./contextMenu";
import { DocModeSwitch } from "./DocTab";
import { FileText, LogoFigma, Plus } from "./geistIcons";

/**
 * The project's canvases, across the top of the project under the bar's tab for it, after its
 * documents: for now its PRD.md, when it has one, and an example's own. They are tabs of the second level,
 * drawn as Geist's Tabs are, a name underlined when it is the one in front, so they do not read
 * as more of the bar's cells above them. An example is one canvas.
 *
 * After them, the "+" makes another, empty and called Untitled, and reloads onto it with its
 * name up for typing in its tab; double-clicking a tab types a new one later. The name is
 * layout.json's, and the folder keeps its slug. An example is the app's, so it has no "+" and
 * no renaming, and a build has no server to make a canvas.
 *
 * At the far end are the controls of the tab in front: a canvas's ground colour, then Export to
 * Figma, the one place a canvas goes from here; a document's switch between reading and editing.
 */
/** The canvas whose tab is up for renaming, kept across the reload that brings a new one in. */
const RENAME_KEY = "sp:rename-canvas";

export function CanvasStrip() {
  const { activeTab, openTab, editor } = useContext(CanvasChromeContext);
  const tab = tabFor(activeTab);
  const canvases = tab.kind === "example" ? [tab.slug] : ownCanvases();
  const here = activeTab.kind === "canvas" ? activeTab.slug : undefined;
  // A kit's slug names the canvas whose material it shows, so it exports that canvas; only the
  // index of every kit has no canvas behind it, and no Figma button.
  // A document is no canvas, and has none.
  const slug = activeTab.kind === "doc" ? undefined : activeTab.slug;
  // Keyed by the page. The project's own view with no canvas has none, and the default ground.
  const page = activeTab.kind === "canvas" ? pageOf(activeTab) : undefined;
  const ground = useGround(editor, page);
  const [target, setTarget] = useState<CanvasTab | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [renaming, setRenaming] = useState(() => sessionStorage.getItem(RENAME_KEY));
  // A name typed lands as a layout change, which the tab reads through the index.
  const [, relabel] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    window.addEventListener(LAYOUT_CHANGED, relabel);
    window.parent.addEventListener("sp:working", relabel);
    return () => {
      window.removeEventListener(LAYOUT_CHANGED, relabel);
      window.parent.removeEventListener("sp:working", relabel);
    };
  }, []);
  // The canvases the agent is writing to in this project, which the window keeps (AppShell.tsx);
  // the one in front glows there, and a sheen crosses the name of every one of them here.
  const working = window.parent.spShell!.working;
  const busy = working.project === canvasIndex().project ? working.slugs : [];
  // A canvas just made is the one to be on, once the editor is there to show its page.
  const made = useRef(renaming);
  useEffect(() => {
    if (editor && made.current) openTab({ kind: "canvas", slug: made.current });
    if (editor) made.current = null;
  }, [editor, openTab]);
  const own = target?.kind === "canvas" && tab.kind !== "example" && canvasIndex().served;
  const folder = async (canvas: string, action: "reveal" | "delete") => {
    const response = await fetch(`${import.meta.env.BASE_URL}__sp/canvas-folder`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: canvas, action }),
    });
    if (!response.ok) return alert(await response.text());
    if (action === "delete") window.location.reload();
  };
  const rename = (canvas: string, name: string) => {
    sessionStorage.removeItem(RENAME_KEY);
    setRenaming(null);
    if (!name.trim() || name.trim() === shortName(canvas)) return;
    void fetch(`${import.meta.env.BASE_URL}__sp/canvas-name`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: canvas, name }),
    });
  };

  return (
    <nav className="sp-canvas-tabs" aria-label="Canvases">
      {docsOf(tab).map(({ name, slug }) => (
        <button
          key={slug}
          type="button"
          className="sp-canvas-tab"
          aria-current={activeTab.kind === "doc" && activeTab.slug === slug ? "page" : undefined}
          title={name}
          onClick={() => openTab({ kind: "doc", slug })}
          onContextMenu={(event) => openMenu(event, menu, () => setTarget({ kind: "doc", slug }))}
        >
          <FileText />
          {name.replace(/\.md$/i, "")}
        </button>
      ))}
      {canvases.map((canvas) =>
        canvas === renaming ? (
          <label key={canvas} className="sp-canvas-tab" aria-current="page">
            <ViewIcon view={{ kind: "canvas", slug: canvas }} />
            <input
              className="sp-canvas-tab-name"
              aria-label="Canvas name"
              defaultValue={shortName(canvas)}
              size={Math.max(shortName(canvas).length, 8)}
              autoFocus
              onFocus={(event) => event.currentTarget.select()}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  event.currentTarget.value = shortName(canvas);
                  event.currentTarget.blur();
                }
              }}
              onBlur={(event) => rename(canvas, event.currentTarget.value)}
            />
          </label>
        ) : (
        <button
          key={canvas}
          type="button"
          className="sp-canvas-tab"
          aria-current={canvas === here ? "page" : undefined}
          data-working={busy.includes(canvas) || undefined}
          onClick={() => openTab({ kind: "canvas", slug: canvas })}
          onDoubleClick={() =>
            tab.kind !== "example" && canvasIndex().served && setRenaming(canvas)
          }
          onContextMenu={(event) =>
            openMenu(event, menu, () => setTarget({ kind: "canvas", slug: canvas }))
          }
        >
          <ViewIcon view={{ kind: "canvas", slug: canvas }} />
          {shortName(canvas)}
        </button>
        ),
      )}
      {tab.kind !== "example" && canvasIndex().served && (
        <button
          type="button"
          className="sp-canvas-tabs-new"
          title="New canvas"
          onClick={async () => {
            const response = await fetch(`${import.meta.env.BASE_URL}__sp/new-canvas`, {
              method: "POST",
            });
            if (!response.ok) throw new Error(await response.text());
            sessionStorage.setItem(RENAME_KEY, (await response.json()).slug);
            window.location.reload();
          }}
        >
          <Plus />
        </button>
      )}
      {activeTab.kind === "doc" && <DocModeSwitch slug={activeTab.slug} />}
      {page && groundEditable(page) && (
        <label
          className="sp-canvas-tabs-ground"
          title="Canvas background"
          style={{ background: ground }}
        >
          <input
            type="color"
            aria-label="Canvas background"
            value={ground}
            onChange={(e) => editor && setGround(editor, page, e.target.value)}
          />
        </label>
      )}
      {/* An anchor, not a button, because the sheet is a page of its own, and the page that
          walks through the import, so ⌘-click and copy-link have to work on it. */}
      {slug && (
        <a
          className="sp-canvas-tabs-figma"
          href={sheetPageUrl(slug)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Export to Figma"
          title="Export to Figma. Every board on this canvas as one web page, and how to bring it into Figma"
        >
          <LogoFigma />
        </a>
      )}
      {/* Right-click menu: Copy link copies the window's address for that view. A canvas of the
          project's own also shows its folder, or bins it after asking. */}
      <div
        ref={menu}
        popover="auto"
        className="sp-context-menu"
        role="menu"
        onClickCapture={(event) => event.currentTarget.hidePopover()}
      >
        <button
          type="button"
          role="menuitem"
          className="sp-menu-row"
          onClick={() =>
            navigator.clipboard.writeText(
              new URL(tabUrl({ ...tab, view: target! }), location.href).href,
            )
          }
        >
          Copy link
        </button>
        {own && (
          <>
            <button
              type="button"
              role="menuitem"
              className="sp-menu-row"
              onClick={() => folder(target.slug, "reveal")}
            >
              {REVEAL}
            </button>
            <hr />
            <button
              type="button"
              role="menuitem"
              className="sp-menu-row sp-context-menu__danger"
              onClick={async () => {
                if (
                  await confirmTrash(
                    shortName(target.slug),
                    `${canvasIndex().canvasesDir}/${target.slug}`,
                    "Its boards and everything pasted on it go with it.",
                  )
                )
                  void folder(target.slug, "delete");
              }}
            >
              {TRASH}
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
