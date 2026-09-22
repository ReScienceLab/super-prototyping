import { useContext } from "react";
import { CanvasChromeContext } from "./canvasChrome";
import { shortName } from "./canvasLibrary";
import { ownCanvases, tabFor } from "./canvasTabs";
import { canvasIndex } from "./canvasIndex";
import { ViewIcon } from "./CanvasTabBar";
import { sheetPageUrl } from "./canvasUrl";
import { CANVAS_ATTACH, type CanvasAttachDetail } from "./ChatPanel";
import { LogoFigma, Plus } from "./geistIcons";

/**
 * The project's canvases, across the top of the project under the bar's tab for it. They are
 * tabs of the second level, drawn as Geist's Tabs are, a name underlined when it is the one in
 * front, so they do not read as more of the bar's cells above them. An example is one canvas.
 *
 * After them, the "+" is the way to another. It puts the agent's panel out with the message
 * begun, since a canvas is the agent's work. An example is the app's and takes none, and a build
 * has no agent.
 *
 * At the far end is Export to Figma, the one place a canvas goes from here.
 */
export function CanvasStrip() {
  const { activeTab, openTab } = useContext(CanvasChromeContext);
  const tab = tabFor(activeTab);
  const canvases = tab.kind === "example" ? [tab.slug] : ownCanvases();
  const here = activeTab.kind === "canvas" ? activeTab.slug : undefined;
  // A kit's slug names the canvas whose material it shows, so it exports that canvas; only the
  // index of every kit has no canvas behind it, and no Figma button.
  const slug = activeTab.slug;

  return (
    <nav className="sp-canvas-tabs" aria-label="Canvases">
      {canvases.length === 0 && (
        <span className="sp-canvas-tabs-none">
          No canvases yet. Ask the agent for one.
        </span>
      )}
      {canvases.map((canvas) => (
        <button
          key={canvas}
          type="button"
          className="sp-canvas-tab"
          aria-current={canvas === here ? "page" : undefined}
          onClick={() => openTab({ kind: "canvas", slug: canvas })}
        >
          <ViewIcon view={{ kind: "canvas", slug: canvas }} />
          {shortName(canvas)}
        </button>
      ))}
      {tab.kind !== "example" && canvasIndex().served && (
        <button
          type="button"
          className="sp-canvas-tabs-new"
          title="New canvas"
          // To the agent's panel, which is the window's, outside this frame (AppShell.tsx).
          onClick={() =>
            window.parent.dispatchEvent(
              new CustomEvent<CanvasAttachDetail>(CANVAS_ATTACH, {
                detail: { kind: "draft", text: "Make a new canvas for " },
              }),
            )
          }
        >
          <Plus />
        </button>
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
    </nav>
  );
}
