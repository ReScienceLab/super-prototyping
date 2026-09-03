import { useEffect, useRef, useState } from "react";
import {
  Tldraw,
  createShapeId,
  getIndices,
  toRichText,
  type Editor,
  type TLPageId,
  type TLDefaultColorStyle,
  type TLTextShape,
  useEditor,
  useValue,
} from "tldraw";
import "tldraw/tldraw.css";
import { installAgentBridge } from "./agentBridge";
import {
  CANVAS_FILE_DEFAULT_SIZE,
  CANVAS_FILE_SHAPE_TYPE,
  CanvasFileShapeUtil,
} from "./CanvasFileShapeUtil";
import {
  CANVAS_LINK_BUTTON_SIZE,
  CANVAS_LINK_CARD_SIZE,
  CANVAS_LINK_SHAPE_TYPE,
  type CanvasLinkShape,
  CanvasLinkShapeUtil,
} from "./CanvasLinkShapeUtil";
import {
  type CanvasLayoutLink,
  type CanvasLibraryFile,
  readCanvasLayout,
  readCanvasLibrary,
} from "./canvasLibrary";
import {
  CanvasChromeContext,
  canvasChromeAssetUrls,
  canvasChromeComponents,
} from "./canvasChrome";

const shapeUtils = [CanvasFileShapeUtil, CanvasLinkShapeUtil];

/**
 * Bump the trailing version when a change would leave documents already in a browser's
 * IndexedDB inconsistent with the new code (a shape's props changing shape, say). Everything
 * persisted under the old key is then ignored, hand-drawn annotations included. Do not bump
 * it for ordinary layout edits; the force-refresh button already handles those.
 */
const PERSISTENCE_KEY = "super-prototyping-canvas-v2";

/** Marks that the snap default below has been applied once in this browser. */
const SNAP_DEFAULT_KEY = `${PERSISTENCE_KEY}:snap-default`;

/**
 * Tldraw persists the page menu's drag-resized list height per origin, and its resize handle is
 * a 1px strip above "Create new page". One stray drag leaves the menu two rows tall for good,
 * which reads as "the other boards are gone" rather than as a scrolled list. Clearing it on load
 * makes the menu open tall enough for every page; dragging still works within the session.
 */
try {
  localStorage.removeItem("tldraw_page_menu_list_height");
} catch {
  // Storage unavailable (private mode, blocked cookies), so the menu keeps whatever it has.
}

/** The onboarding folder. Sorts first, and the bare URL opens it. */
const WELCOME_PAGE_SLUG = "00-welcome";

/**
 * The one board that is not phone-shaped: a landscape strip as wide as the row of example
 * cards under it. Keep it in step with the `body` box in 00-welcome/gen.py.
 */
const WELCOME_BOARD_SIZE = { w: 2153, h: 819 } as const;

/**
 * The artboard box, which is 478 x 980 unless something says otherwise: the welcome board is
 * a landscape strip, and any row of a layout.json may declare its own `w`/`h` for a board that
 * is not phone-shaped either.
 */
function boardSize(file: CanvasLibraryFile) {
  if (file.pageSlug === WELCOME_PAGE_SLUG) return WELCOME_BOARD_SIZE;
  for (const row of readCanvasLayout(file.pageSlug)?.rows ?? []) {
    for (const entry of row.files) {
      if (typeof entry === "string" || entry.file !== file.fileName) continue;
      if (entry.w && entry.h) return { w: entry.w, h: entry.h };
    }
  }
  return CANVAS_FILE_DEFAULT_SIZE;
}

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

/** Blacks out the canvas under the welcome board, whose art runs to its own edges. */
function WelcomeGround() {
  const editor = useEditor();
  const isWelcome = useValue(
    "on the welcome page",
    () => editor.getCurrentPage().meta.canvasSlug === WELCOME_PAGE_SLUG,
    [editor],
  );
  useEffect(() => {
    const container = editor.getContainer();
    container.classList.toggle("canvas-welcome-ground", isWelcome);
    return () => container.classList.remove("canvas-welcome-ground");
  }, [editor, isWelcome]);
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
    color?: TLDefaultColorStyle;
    parentId?: TLPageId;
  },
) {
  const id = createShapeId(annotation.id);
  if (!annotation.text) return;

  const existing = editor.getShape<TLTextShape>(id);
  if (existing?.type === "text") {
    // Position too, not only the copy: a caption belongs to the shape above it, so when the
    // row it labels is reordered or resized, an annotation left where it was labels the
    // wrong card. It is placed by the layout on every pass, the way the cards are.
    editor.updateShape<TLTextShape>({
      id,
      type: "text",
      x: annotation.x,
      y: annotation.y,
      props: { richText: toRichText(annotation.text), w: annotation.w },
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
      color: annotation.color ?? "black",
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
 * directly above item N of the next. That alignment lets you read a reference row
 * against the mockup row above it.
 */
function layoutRow(
  editor: Editor,
  page: { id: TLPageId },
  rowFiles: CanvasLibraryFile[],
  rowTop: number,
  heading: string,
  caption: (file: CanvasLibraryFile, index: number) => string,
  links: CanvasLayoutLink[] = [],
) {
  if (!rowFiles.length) return rowTop;

  // A row holds one folder's boards, so one size covers it.
  const size = boardSize(rowFiles[0]);
  // The welcome board carries its own title and its own caption, so it gets neither.
  const bare = rowFiles[0].pageSlug === WELCOME_PAGE_SLUG;
  const rowX = (index: number) => index * (size.w + LIBRARY_GAP);
  const contentY = bare ? rowTop : rowTop + LIBRARY_HEADING_HEIGHT;
  const missing = rowFiles.filter((file) => !editor.getShape(fileShapeId(file)));
  if (missing.length) {
    editor.createShapes(
      missing.map((file) => ({
        id: fileShapeId(file),
        type: CANVAS_FILE_SHAPE_TYPE,
        parentId: page.id,
        x: rowX(rowFiles.indexOf(file)),
        y: contentY,
        props: {
          ...size,
          name: file.title,
          path: file.path,
        },
      })),
    );
  }

  if (bare) return contentY + size.h + LIBRARY_GAP;

  // Buttons sit between the boards and their captions, so the caption stays the bottom line
  // of the row whether or not it has any.
  const linksY = contentY + size.h + LIBRARY_LABEL_GAP;
  const linksH = links.length
    ? CANVAS_LINK_BUTTON_SIZE.h + LIBRARY_LABEL_GAP
    : 0;
  const missingLinks = links
    .map((link, index) => ({ link, index }))
    .filter(({ link }) => !editor.getShape(linkShapeId(link.url)));
  if (missingLinks.length) {
    editor.createShapes(
      missingLinks.map(({ link, index }) => ({
        id: linkShapeId(link.url),
        type: CANVAS_LINK_SHAPE_TYPE,
        parentId: page.id,
        x: index * (CANVAS_LINK_BUTTON_SIZE.w + LIBRARY_LABEL_GAP),
        y: linksY,
        props: {
          ...CANVAS_LINK_BUTTON_SIZE,
          label: link.label,
          page: "",
          path: "",
          url: link.url,
        },
      })),
    );
  }

  createAnnotation(editor, {
    id: `canvas-row-heading:${page.id}:${heading}`,
    text: heading,
    x: 0,
    y: rowTop,
    w: rowFiles.length * size.w + (rowFiles.length - 1) * LIBRARY_GAP,
    size: "l",
    parentId: page.id,
  });

  rowFiles.forEach((file, index) => {
    createAnnotation(editor, {
      id: `canvas-file-label:${file.path}`,
      text: caption(file, index),
      x: rowX(index),
      y: linksY + linksH,
      w: size.w,
      size: "s",
      align: "middle",
      parentId: page.id,
    });
  });

  return linksY + linksH + LIBRARY_LABEL_HEIGHT + LIBRARY_GAP;
}

function linkShapeId(name: string) {
  return createShapeId(`canvas-link:${name}`);
}

/**
 * What the welcome page carries besides its own board: a button that opens the repo, and one
 * card per other board folder that opens that folder's page. Both are shapes rather than markup
 * inside the board, because boards render in `<iframe srcDoc sandbox="">` where a link cannot
 * navigate anything.
 *
 * Cover art is the folder's first screen rather than its 00- board, which is a token sheet on
 * every example and would make five identical-looking cards. The cards sit in two rows, Apple's
 * own apps and everything else.
 */
function layoutWelcomeExtras(
  editor: Editor,
  page: { id: TLPageId },
  library: CanvasLibraryFile[][],
  rowTop: number,
) {
  const targets = library
    .filter((files) => files[0].pageSlug !== WELCOME_PAGE_SLUG)
    // Slug order otherwise, which is what a folder that says nothing gets. Sort
    // is stable, so `order` only moves the folders that ask to be moved.
    .sort(
      (a, b) =>
        (readCanvasLayout(a[0].pageSlug)?.order ?? 0) -
        (readCanvasLayout(b[0].pageSlug)?.order ?? 0),
    );

  // The repo CTA used to be a shape parked in the welcome board's header. It is chrome now
  // (canvasChrome.tsx, SharePanel), so a canvas saved before that still has to lose its copy.
  const starId = linkShapeId("star");
  if (editor.getShape(starId)) editor.deleteShape(starId);
  if (!targets.length) return;

  // Two rows, because twelve cards in one row read as a list of twelve unrelated things: the
  // apps this repo cloned first, Apple's own second. A card's id is its slug, so a folder that
  // changes group moves on the next force refresh rather than turning into a second card.
  // The top row is the cloned apps. Apple's own, and the empty folder you copy to start one,
  // are the row under it: neither is an app someone came here to look at.
  const isSecondRow = (files: CanvasLibraryFile[]) =>
    files[0].pageSlug.startsWith("apple-") || files[0].pageSlug === "templates";
  const groups = [
    {
      title: "Examples: iOS apps. Click a card to open its canvas",
      targets: targets.filter((files) => !isSecondRow(files)),
    },
    {
      title: "Examples: Apple's own apps, and the empty folder to copy",
      targets: targets.filter(isSecondRow),
    },
  ];

  // Headings are keyed by row, not by their own text: keyed by text, renaming one left the old
  // shape sitting on the canvas next to the new one. Anything else here is such a straggler.
  const headings = groups.map(
    (_, index) => `canvas-row-heading:${page.id}:${index}`,
  );
  const kept = new Set(headings.map((id) => createShapeId(id)));
  const orphans = [...editor.getPageShapeIds(page.id)].filter(
    (id) => id.startsWith("shape:canvas-row-heading:") && !kept.has(id),
  );
  if (orphans.length) editor.deleteShapes(orphans);

  const cardX = (index: number) =>
    index * (CANVAS_LINK_CARD_SIZE.w + LIBRARY_GAP);

  let top = rowTop;
  for (const [index, group] of groups.entries()) {
    if (!group.targets.length) continue;
    const contentY = top + LIBRARY_HEADING_HEIGHT;
    const cards = group.targets.map((files, index) => {
      const named = readCanvasLayout(files[0].pageSlug)?.cover;
      const cover =
        files.find((file) => file.fileName === named) ??
        files.find((file) => !file.fileName.startsWith("00")) ??
        files[0];
      return {
        id: linkShapeId(files[0].pageSlug),
        type: CANVAS_LINK_SHAPE_TYPE,
        parentId: page.id,
        x: cardX(index),
        y: contentY,
        props: {
          ...CANVAS_LINK_CARD_SIZE,
          label: files[0].pageName,
          page: files[0].pageSlug,
          path: cover.path,
          url: "",
        },
      };
    });
    const missing = cards.filter((card) => !editor.getShape(card.id));
    if (missing.length) editor.createShapes(missing);

    // A card that is already there is laid out again anyway, position included: the row it
    // belongs to, the label, the cover its layout.json names and the card size this build
    // draws are all computed here, and a stale one of those would show on the card and
    // nowhere else. The caption under it moves with it, so the two cannot disagree.
    for (const card of cards) {
      const shape = editor.getShape<CanvasLinkShape>(card.id);
      const stale =
        shape &&
        (shape.x !== card.x ||
          shape.y !== card.y ||
          (["label", "path", "w", "h"] as const).some(
            (key) => shape.props[key] !== card.props[key],
          ));
      if (stale) {
        editor.updateShape({
          id: card.id,
          type: card.type,
          x: card.x,
          y: card.y,
          props: { ...card.props },
        });
      }
    }

    createAnnotation(editor, {
      id: headings[index],
      text: group.title,
      x: 0,
      y: top,
      w:
        group.targets.length * CANVAS_LINK_CARD_SIZE.w +
        (group.targets.length - 1) * LIBRARY_GAP,
      size: "l",
      color: "white",
      parentId: page.id,
    });

    // The card is the device alone, so the caption under it carries the name as well as the
    // count; it is the only place either of them is written on this page.
    group.targets.forEach((files, index) => {
      createAnnotation(editor, {
        id: `canvas-file-label:${files[0].pageSlug}`,
        text: `${files[0].pageName}\n${files.length} board${
          files.length === 1 ? "" : "s"
        }`,
        x: cardX(index),
        y: contentY + CANVAS_LINK_CARD_SIZE.h + LIBRARY_LABEL_GAP,
        w: CANVAS_LINK_CARD_SIZE.w,
        size: "s",
        align: "middle",
        color: "white",
        parentId: page.id,
      });
    });

    top =
      contentY +
      CANVAS_LINK_CARD_SIZE.h +
      LIBRARY_LABEL_GAP +
      LIBRARY_LABEL_HEIGHT * 2 +   // the card's caption is two lines, name over count
      LIBRARY_GAP;
  }
}

/**
 * One tldraw page per mockups/canvases/<slug> folder, one shape per HTML file in it. If that
 * folder has a layout.json alongside its HTML files, its rows are laid out top-to-bottom in the
 * declared order; see CanvasLayoutConfig in canvasLibrary.ts. Anything not covered by a row
 * still appears, in a fallback grid below, so a file can never be silently hidden.
 *
 * A page is tied to its folder by the slug stamped in page.meta, not by its name, so renaming a
 * folder's layout.json `name` renames the page someone already has open (annotations and all)
 * instead of building a second one beside it.
 */
function initializeCanvasLibrary(editor: Editor) {
  const library = readCanvasLibrary();
  if (!library.length) return;

  const libraryPages = new Set<TLPageId>();

  for (const files of library) {
    const { pageSlug, pageName } = files[0];
    const bySlug = () =>
      editor.getPages().find((c) => c.meta.canvasSlug === pageSlug);
    let page =
      bySlug() ??
      editor.getPages().find((c) => c.name === pageName && !c.meta.canvasSlug);
    if (!page) {
      editor.createPage({ name: pageName, meta: { canvasSlug: pageSlug } });
      page = bySlug();
    }
    if (!page) continue;
    if (page.meta.canvasSlug !== pageSlug) {
      editor.updatePage({
        id: page.id,
        meta: { ...page.meta, canvasSlug: pageSlug },
      });
    }
    if (page.name !== pageName) editor.renamePage(page.id, pageName);
    libraryPages.add(page.id);

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
        row.links,
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

    if (files[0].pageSlug === WELCOME_PAGE_SLUG) {
      layoutWelcomeExtras(editor, page, library, rowTop);
    }
  }

  pruneEmptyOrphanPages(editor, libraryPages);
  orderPagesByLibrary(editor, libraryPages);
}

/**
 * The page menu lists pages by their index, which is creation order until something sets it:
 * the menu ends up in whatever order this browser happened to build its pages in, which is not
 * the order of anything else. Sort it into the library's own order, so the menu, the welcome
 * board's row of cards and the folder listing all read the same top to bottom.
 *
 * Pages that are not library pages keep their relative order, below the boards.
 */
function orderPagesByLibrary(editor: Editor, libraryPages: Set<TLPageId>) {
  const ordered = [
    ...libraryPages,
    ...editor
      .getPages()
      .filter((page) => !libraryPages.has(page.id))
      .map((page) => page.id),
  ];
  const indices = getIndices(ordered.length);
  ordered.forEach((id, position) => {
    if (editor.getPage(id)?.index !== indices[position]) {
      editor.updatePage({ id, index: indices[position] });
    }
  });
}

/**
 * Pages the library did not just fill, so the page menu lists the boards and nothing else.
 * They accumulate on their own: tldraw's default "Page 1", the page left behind whenever a
 * folder's layout.json `name` changes (pages are matched by name, so the new name creates a
 * new page), and a second page of the same name created by a tab that mounted concurrently.
 *
 * Only ever deletes a page with nothing on it, so a page someone drew on survives its folder.
 */
function pruneEmptyOrphanPages(editor: Editor, libraryPages: Set<TLPageId>) {
  for (const page of editor.getPages()) {
    if (libraryPages.has(page.id)) continue;
    if (editor.getPageShapeIds(page.id).size) continue;
    if (editor.getPages().length > 1) editor.deletePage(page.id);
  }
}

/**
 * Deletes every shape the library placed (row shapes, headings, captions, and the fallback
 * grid) on every page, then rebuilds them from the current file list and layout.json.
 *
 * Creation is idempotent. It fills in what's missing but never moves a shape that's already
 * there, so editing layout.json (inserting a file at the front of a row, say) leaves the old
 * shapes at their old positions while the new ones land on top of them. This is the force
 * refresh that clears that drift. Hand-drawn shapes and notes are untouched.
 */
function relayoutCanvasLibrary(editor: Editor) {
  const prefixes = [
    "shape:canvas-file:",
    "shape:canvas-row-heading:",
    "shape:canvas-file-label:",
    "shape:canvas-link:",
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
 * persisted.
 *
 * With no slug the bare URL opens the welcome page every time, so that page is the way in:
 * keep a board open across reloads by deep-linking it, not by leaving it on screen.
 */
function applyCanvasFromUrl(editor: Editor) {
  const slug =
    new URLSearchParams(window.location.search).get("canvas") ??
    WELCOME_PAGE_SLUG;
  const page = editor.getPages().find((c) => c.meta.canvasSlug === slug);
  if (page) editor.setCurrentPage(page.id);
}

/**
 * Snapping is on by default: every artboard sits on the same column pitch, so a shape dragged
 * near one should land on its edge rather than one pixel off it. Applied once per browser
 * rather than on every mount, so turning it back off in tldraw's preferences menu sticks.
 */
function applySnapDefault(editor: Editor) {
  try {
    if (localStorage.getItem(SNAP_DEFAULT_KEY)) return;
    localStorage.setItem(SNAP_DEFAULT_KEY, "1");
  } catch {
    // Storage unavailable (private mode, blocked cookies), so apply it for this session only.
  }
  editor.user.updateUserPreferences({ isSnapMode: true });
}

function initializeCanvas(editor: Editor) {
  applySnapDefault(editor);
  initializeCanvasLibrary(editor);
  editor.selectNone();
  requestAnimationFrame(() => editor.zoomToFit());
}

export default function App() {
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
        stylesVisible,
        toggleStyles: () => setStylesVisible((visible) => !visible),
        relayoutLibrary: () => {
          if (editorRef.current) relayoutCanvasLibrary(editorRef.current);
        },
      }}
    >
      <main className="tldraw__editor" aria-label="Prototype design canvas">
        <Tldraw
          assetUrls={canvasChromeAssetUrls}
          components={canvasChromeComponents}
          persistenceKey={PERSISTENCE_KEY}
          shapeUtils={shapeUtils}
          onMount={handleMount}
        >
          <AgentBridge />
          <WelcomeGround />
        </Tldraw>
      </main>
    </CanvasChromeContext.Provider>
  );
}
