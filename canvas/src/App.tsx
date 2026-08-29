import { useEffect, useRef, useState } from "react";
import {
  Tldraw,
  createShapeId,
  toRichText,
  type Editor,
  type TLPageId,
  type TLTextShape,
  useEditor,
} from "tldraw";
import "tldraw/tldraw.css";
import { installAgentBridge } from "./agentBridge";
import {
  CANVAS_FILE_DEFAULT_SIZE,
  CANVAS_FILE_SHAPE_TYPE,
  CanvasFileShapeUtil,
} from "./CanvasFileShapeUtil";
import {
  type CanvasLibraryFile,
  pageNameFor,
  readCanvasLayout,
  readCanvasLibrary,
} from "./canvasLibrary";
import { MarkShapeUtil } from "./MarkShape";
import {
  CanvasChromeContext,
  markAssetUrls,
  markTools,
  markUiComponents,
  markUiOverrides,
} from "./markUi";
import { TerminalPane } from "./TerminalPane";

const shapeUtils = [CanvasFileShapeUtil, MarkShapeUtil];

/**
 * Bump the trailing version when a change would leave documents already in a browser's
 * IndexedDB inconsistent with the new code (a shape's props changing shape, say). Everything
 * persisted under the old key is then simply ignored — annotations and marks included — so
 * do not bump it for ordinary layout edits, which the force-refresh button already handles.
 */
const PERSISTENCE_KEY = "super-prototyping-canvas-v2";

/** Tldraw's own default first page, kept as a free-drawing surface next to the library pages. */
const SCRATCH_PAGE_NAME = "Scratch";

const LIBRARY_COLUMNS = 3;
const LIBRARY_GAP = 80;
const LIBRARY_LABEL_GAP = 12;
const LIBRARY_LABEL_HEIGHT = 28;
const LIBRARY_HEADING_HEIGHT = 44;

function AgentBridge() {
  const editor = useEditor();
  useEffect(() => installAgentBridge(editor), [editor]);
  return null;
}

/** Creates the text shape if it isn't there yet, otherwise only refreshes its copy. */
function createAnnotation(
  editor: Editor,
  annotation: {
    id: string;
    text: string;
    x: number;
    y: number;
    w: number;
    size: TLTextShape["props"]["size"];
    align?: TLTextShape["props"]["textAlign"];
    parentId?: TLPageId;
  },
) {
  const id = createShapeId(annotation.id);
  if (!annotation.text) return;

  const existing = editor.getShape<TLTextShape>(id);
  if (existing?.type === "text") {
    editor.updateShape<TLTextShape>({
      id,
      type: "text",
      props: { richText: toRichText(annotation.text) },
    });
    return;
  }

  editor.createShape<TLTextShape>({
    id,
    type: "text",
    x: annotation.x,
    y: annotation.y,
    parentId: annotation.parentId,
    props: {
      autoSize: false,
      font: "sans",
      richText: toRichText(annotation.text),
      size: annotation.size,
      textAlign: annotation.align ?? "start",
      w: annotation.w,
    },
  });
}

function fileShapeId(file: CanvasLibraryFile) {
  return createShapeId(`canvas-file:${file.path}`);
}

function columnX(index: number) {
  return index * (CANVAS_FILE_DEFAULT_SIZE.w + LIBRARY_GAP);
}

/**
 * Lays out one row of canvas-file shapes left-to-right starting at `rowTop`, with a heading
 * above it and a per-shape caption below it. Idempotent: only shapes that aren't on the canvas
 * yet get created, so a reload never moves work the user has repositioned by hand. Returns the
 * y to start the next row at.
 *
 * Every row starts at x = 0 and uses the same column pitch, so item N of one row always sits
 * directly above item N of the next — that alignment is what lets a reference row be read
 * against the mockup row above it.
 */
function layoutRow(
  editor: Editor,
  page: { id: TLPageId },
  rowFiles: CanvasLibraryFile[],
  rowTop: number,
  heading: string,
  caption: (file: CanvasLibraryFile, index: number) => string,
) {
  if (!rowFiles.length) return rowTop;

  const contentY = rowTop + LIBRARY_HEADING_HEIGHT;
  const missing = rowFiles.filter((file) => !editor.getShape(fileShapeId(file)));
  if (missing.length) {
    editor.createShapes(
      missing.map((file) => ({
        id: fileShapeId(file),
        type: CANVAS_FILE_SHAPE_TYPE,
        parentId: page.id,
        x: columnX(rowFiles.indexOf(file)),
        y: contentY,
        props: {
          ...CANVAS_FILE_DEFAULT_SIZE,
          name: file.title,
          path: file.path,
        },
      })),
    );
  }

  createAnnotation(editor, {
    id: `canvas-row-heading:${page.id}:${heading}`,
    text: heading,
    x: 0,
    y: rowTop,
    w:
      rowFiles.length * CANVAS_FILE_DEFAULT_SIZE.w +
      (rowFiles.length - 1) * LIBRARY_GAP,
    size: "l",
    parentId: page.id,
  });

  rowFiles.forEach((file, index) => {
    createAnnotation(editor, {
      id: `canvas-file-label:${file.path}`,
      text: caption(file, index),
      x: columnX(index),
      y: contentY + CANVAS_FILE_DEFAULT_SIZE.h + LIBRARY_LABEL_GAP,
      w: CANVAS_FILE_DEFAULT_SIZE.w,
      size: "s",
      align: "middle",
      parentId: page.id,
    });
  });

  return (
    contentY +
    CANVAS_FILE_DEFAULT_SIZE.h +
    LIBRARY_LABEL_GAP +
    LIBRARY_LABEL_HEIGHT +
    LIBRARY_GAP
  );
}

/**
 * One tldraw page per mockups/canvases/<slug> folder, one shape per HTML file in it. If that
 * folder has a layout.json alongside its HTML files, its rows are laid out top-to-bottom in the
 * declared order — see CanvasLayoutConfig in canvasLibrary.ts. Anything not covered by a row
 * still appears, in a fallback grid below, so a file can never be silently hidden.
 */
function initializeCanvasLibrary(editor: Editor) {
  const library = readCanvasLibrary();
  if (!library.length) return;

  const startingPages = editor.getPages();
  if (startingPages.length === 1 && startingPages[0].name === "Page 1") {
    editor.renamePage(startingPages[0].id, SCRATCH_PAGE_NAME);
  }

  for (const files of library) {
    const pageName = files[0].pageName;
    let page = editor.getPages().find((c) => c.name === pageName);
    if (!page) {
      editor.createPage({ name: pageName });
      page = editor.getPages().find((c) => c.name === pageName);
    }
    if (!page) continue;

    const placed = new Set<string>();
    let rowTop = 0;

    for (const row of readCanvasLayout(files[0].pageSlug)?.rows ?? []) {
      const rowFiles: { file: CanvasLibraryFile; label?: string }[] = [];
      for (const entry of row.files) {
        const fileName = typeof entry === "string" ? entry : entry.file;
        const label = typeof entry === "string" ? undefined : entry.label;
        const file = files.find(
          (c) => c.fileName === fileName && !placed.has(c.path),
        );
        if (file) rowFiles.push({ file, label });
      }
      if (!rowFiles.length) continue;
      rowFiles.forEach(({ file }) => placed.add(file.path));
      rowTop = layoutRow(
        editor,
        page,
        rowFiles.map((entry) => entry.file),
        rowTop,
        row.title,
        (file, index) => {
          const caption = rowFiles[index].label ?? file.title;
          return row.numbered ? `${index + 1} · ${caption}` : caption;
        },
      );
    }

    const leftover = files.filter((file) => !placed.has(file.path));
    const missingLeftover = leftover.filter(
      (file) => !editor.getShape(fileShapeId(file)),
    );
    if (missingLeftover.length) {
      editor.createShapes(
        missingLeftover.map((file) => {
          const index = leftover.indexOf(file);
          return {
            id: fileShapeId(file),
            type: CANVAS_FILE_SHAPE_TYPE,
            parentId: page.id,
            x: columnX(index % LIBRARY_COLUMNS),
            y:
              rowTop +
              Math.floor(index / LIBRARY_COLUMNS) *
                (CANVAS_FILE_DEFAULT_SIZE.h + LIBRARY_GAP),
            props: {
              ...CANVAS_FILE_DEFAULT_SIZE,
              name: file.title,
              path: file.path,
            },
          };
        }),
      );
    }
  }
}

/**
 * Deletes every shape the library placed (row shapes, headings, captions, and the fallback
 * grid) on every page, then rebuilds them from the current file list and layout.json.
 *
 * Creation is idempotent — it fills in what's missing but never moves a shape that's already
 * there — so editing layout.json (inserting a file at the front of a row, say) leaves the old
 * shapes at their old positions while the new ones land on top of them. This is the force
 * refresh that clears that drift. Hand-drawn marks and notes are untouched.
 */
function relayoutCanvasLibrary(editor: Editor) {
  const prefixes = [
    "shape:canvas-file:",
    "shape:canvas-row-heading:",
    "shape:canvas-file-label:",
  ];
  for (const page of editor.getPages()) {
    const staleIds = [...editor.getPageShapeIds(page.id)].filter((id) =>
      prefixes.some((prefix) => id.startsWith(prefix)),
    );
    if (staleIds.length) editor.deleteShapes(staleIds);
  }
  initializeCanvasLibrary(editor);
}

/**
 * Opens `?canvas=<slug>` (the canvases/<slug> folder name) on the matching page, so a specific
 * round can be linked to or scripted against instead of relying on whichever page tldraw last
 * persisted. `?canvas=scratch` opens the free-drawing page.
 */
function applyCanvasFromUrl(editor: Editor) {
  const slug = new URLSearchParams(window.location.search).get("canvas");
  if (!slug) return;
  const page = editor.getPages().find((c) => c.name === pageNameFor(slug));
  if (page) editor.setCurrentPage(page.id);
}

function initializeCanvas(editor: Editor) {
  initializeCanvasLibrary(editor);
  editor.selectNone();
  requestAnimationFrame(() => editor.zoomToFit());
}

export default function App() {
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [terminalStarted, setTerminalStarted] = useState(false);
  const [stylesVisible, setStylesVisible] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  function handleMount(editor: Editor) {
    editorRef.current = editor;
    initializeCanvas(editor);
    applyCanvasFromUrl(editor);
  }

  return (
    <CanvasChromeContext.Provider
      value={{
        terminalVisible,
        toggleTerminal: () => {
          setTerminalStarted(true);
          setTerminalVisible((visible) => !visible);
        },
        stylesVisible,
        toggleStyles: () => setStylesVisible((visible) => !visible),
        relayoutLibrary: () => {
          if (editorRef.current) relayoutCanvasLibrary(editorRef.current);
        },
      }}
    >
      <div
        className={`app-shell${terminalVisible ? "" : " app-shell--terminal-hidden"}`}
      >
        <main className="tldraw__editor" aria-label="Prototype design canvas">
          <Tldraw
            assetUrls={markAssetUrls}
            components={markUiComponents}
            overrides={markUiOverrides}
            persistenceKey={PERSISTENCE_KEY}
            shapeUtils={shapeUtils}
            tools={markTools}
            onMount={handleMount}
          >
            <AgentBridge />
          </Tldraw>
        </main>
        {terminalStarted ? <TerminalPane hidden={!terminalVisible} /> : null}
      </div>
    </CanvasChromeContext.Provider>
  );
}
