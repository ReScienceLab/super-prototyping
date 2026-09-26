import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  Ellipse2d,
  ImageShapeUtil,
  Rectangle2d,
  Tldraw,
  commentSchemaRecords,
  createShapeId,
  defaultAssetUtils,
  defaultBindingUtils,
  defaultShapeUtils,
  getIndices,
  inlineBase64AssetStore,
  react,
  renderPlaintextFromRichText,
  toRichText,
  type Editor,
  type TLPageId,
  type TLAsset,
  type TLAssetStore,
  type TLCreateShapePartial,
  type TLImageShape,
  type TLShapePartial,
  type TLShape,
  type TLShapeId,
  type TLDefaultColorStyle,
  type TLTextShape,
  useEditor,
  useLocalStore,
} from "tldraw";
import "tldraw/tldraw.css";
import "@tldraw/commenting/commenting.css";
import { installAgentBridge } from "./agentBridge";
import {
  sameProject,
  targetFromUrl,
  tabFromUrl,
  windowUrl,
  urlForTab,
  type CanvasTab,
} from "./canvasUrl";
import { isHere, ownCanvases, pageOf, resolveTab, tabFor } from "./canvasTabs";
import { CanvasStrip } from "./CanvasStrip";
// The kits render inside the canvas as well as under brand.html, so this file imports their
// sheet too, and statically, because it is a few kilobytes against tldraw's megabyte, and a tab
// that had to wait for a chunk would be the one thing on the bar that opens slowly.
import { DocTab } from "./DocTab";
import { BrandKit } from "./BrandKit";
import { BrandKitIndex } from "./BrandKitIndex";
import "./brand.css";
import {
  CANVAS_FILE_SHAPE_TYPE,
  CanvasFileShapeUtil,
} from "./CanvasFileShapeUtil";
import { asCanvasTarget, installDoubleClickZoom, zoomToFill } from "./canvasClicks";
import { attachToChat } from "./canvasAttach";
import { CanvasStatusBannerShapeUtil } from "./CanvasStatusBannerShapeUtil";
import {
  CANVAS_LINK_BUTTON_SIZE,
  CANVAS_LINK_SHAPE_TYPE,
  CanvasLinkShapeUtil,
  installLockedLinkClicks,
} from "./CanvasLinkShapeUtil";
import {
  CANVAS_FILE_DEFAULT_SIZE,
  type CanvasLayoutImage,
  type CanvasLayoutLink,
  type CanvasLibraryFile,
  LAYOUT_CHANGED,
  BRAND_THUMB_EDGE,
  boardSize,
  brandThumbForSrc,
  canvasImageKey,
  canvasImageRef,
  canvasImageUrl,
  readCanvasLayout,
  pageNameFor,
  isLibraryShapeId,
  readCanvasLibrary,
  refetchBoards,
} from "./canvasLibrary";
import { BOARDS_CHANGED, canvasIndex } from "./canvasIndex";
import { lockedOverlayUtils } from "./lockedIndicator";
import { installCanvasComments, readCommentUser } from "./canvasComments";
import {
  CanvasLinkPaste,
  agentBoardPaths,
  boardShapeId,
  canvasAssetStore,
  contentTaken,
  installCanvasContent,
  personsShape,
  projectPages,
} from "./canvasContent";
import {
  CanvasChromeContext,
  canvasChromeComponents,
  canvasUiOverrides,
  canvasCommentTools,
  markFresh,
} from "./canvasChrome";

/**
 * A picture is the whole of its box. tldraw hit-tests an image that can carry transparency against
 * its own pixels, so a mockup drawn on nothing answers nothing where it is nothing: a double-click
 * does not zoom and the attach buttons never appear except over the drawing itself. Here a picture is
 * a tile in a row of tiles, and the empty part of a tile is still that tile.
 */
class CanvasImageShapeUtil extends ImageShapeUtil {
  override getGeometry(shape: TLImageShape) {
    const box = { width: shape.props.w, height: shape.props.h, isFilled: true };
    // A circle crop is still a circle; it is only the alpha channel that stops counting.
    return shape.props.crop?.isCircle
      ? new Ellipse2d(box)
      : new Rectangle2d(box);
  }
}

const shapeUtils = [
  CanvasFileShapeUtil,
  CanvasImageShapeUtil,
  CanvasLinkShapeUtil,
  CanvasStatusBannerShapeUtil,
];

/**
 * Bump the trailing version when a change would leave documents already in a browser's
 * IndexedDB inconsistent with the new code (a shape's props changing shape, say). Everything
 * persisted under the old key is then ignored, hand-drawn annotations included. Do not bump
 * it for ordinary layout edits; the force-refresh button already handles those.
 *
 * The namespace is per boards directory, and empty for this checkout's own: every canvas runs
 * on 127.0.0.1, so without it a second project started on the same port opens the first one's
 * document. See `canvasesNamespace` in server/boards.ts.
 */
const PERSISTENCE_KEY = `super-prototyping-canvas-v2${canvasIndex().canvasesNamespace}`;

/** Marks that the snap default below has been applied once in this browser. */
const SNAP_DEFAULT_KEY = `${PERSISTENCE_KEY}:snap-default`;

/**
 * The tldraw license, inlined at build time from the Pages project's own environment (it is set on
 * super-prototyping, production and preview both). Commenting is a licensed feature: with no key
 * `CanvasComments` renders nothing at all in production, so the hosted canvas would offer a comment
 * tool that does nothing.
 *
 * Not in development, and that is the trap: tldraw decides "development" from the *runtime* host,
 * so localhost, any loopback address and any plain-http origin get every feature unlicensed. A
 * production build served from 127.0.0.1 therefore cannot tell you whether the deployed site has
 * commenting. Only the deploy can.
 *
 * The key today is an evaluation license, which grants every feature and expires on 2026-12-12 with
 * no grace period. On that date commenting stops working again unless the key has been replaced.
 */
const TLDRAW_LICENSE_KEY: string | undefined = import.meta.env
  .VITE_TLDRAW_LICENSE_KEY;

/**
 * The store, built here rather than by `<Tldraw persistenceKey>`, because the comment record
 * types have to be registered on it and that component takes no `records` option. `useLocalStore`
 * is the hook it would have called itself, so IndexedDB persistence is unchanged, see
 * tldraw-local-store.d.ts. Module scope, so the options object keeps its identity across renders:
 * the hook rebuilds the store whenever it changes.
 */
const storeOptions = {
  persistenceKey: PERSISTENCE_KEY,
  // The same set `<Tldraw>` merges for itself; the schema has to know every type the document
  // can hold, hand-drawn annotations included. A default one of ours stands in for is dropped
  // rather than listed beside it: the schema refuses the same shape type twice.
  shapeUtils: [
    ...defaultShapeUtils.filter(
      (fallback) => !shapeUtils.some((ours) => ours.type === fallback.type),
    ),
    ...shapeUtils,
  ],
  bindingUtils: defaultBindingUtils,
  assetUtils: defaultAssetUtils,
  records: commentSchemaRecords,
  assets: {
    ...inlineBase64AssetStore,
    ...canvasAssetStore,
    /**
     * Draw the brand images at the size the screen is actually showing them. Zoomed to fit,
     * a page of them is a wall of thumbnails, and fetching the full-size file for each one is
     * tens of megabytes decoded down to a few hundred pixels.
     *
     * The original comes back the moment it has a use: zoomed past the variant's own
     * resolution, and unconditionally when the picture leaves the canvas for an export or the
     * clipboard. So nothing is ever *shown* at less than the pixels available to show it —
     * the only thing dropped is the pixels that would not have been visible.
     */
    resolve(
      asset,
      { screenScale, steppedScreenScale, dpr, shouldResolveToOriginal },
    ) {
      const src = asset.props.src ?? null;
      if (asset.type !== "image" || shouldResolveToOriginal || !src) return src;
      const thumb = brandThumbForSrc(src);
      if (!thumb) return src;
      // The variant's own width: its long edge is BRAND_THUMB_EDGE, so a portrait image is
      // narrower than that. Compare it against the device pixels the shape occupies now.
      const { w, h } = asset.props;
      const thumbWidth = (w * BRAND_THUMB_EDGE) / Math.max(w, h);
      return w * Math.max(screenScale, steppedScreenScale) * dpr <= thumbWidth
        ? thumb
        : src;
    },
  } satisfies TLAssetStore,
};

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

const LIBRARY_COLUMNS = 3;
const LIBRARY_GAP = 80;
const LIBRARY_LABEL_GAP = 12;
const LIBRARY_LABEL_HEIGHT = 28;
const LIBRARY_HEADING_HEIGHT = 44;

/** Deletes library shapes, which are locked and would otherwise be skipped by `deleteShapes`. */
function deleteLibraryShapes(editor: Editor, ids: TLShapeId[]) {
  if (!ids.length) return;
  editor.run(() => editor.deleteShapes(ids), { ignoreShapeLock: true });
}

function AgentBridge() {
  const editor = useEditor();
  useEffect(() => installAgentBridge(editor), [editor]);
  return null;
}

/** Cards and buttons are locked like everything else the library places; this keeps them clickable. */
function LockedLinkClicks() {
  const editor = useEditor();
  useEffect(() => installLockedLinkClicks(editor), [editor]);
  return null;
}

/**
 * A path as a single shell word. A boards directory is chosen by whoever ran `sp`, so it
 * can hold a space, and the command below is meant to be copied and run as it stands.
 */
const shellQuote = (s: string) => `'${s.replaceAll("'", `'\\''`)}'`;

/**
 * The agent is writing to the canvas in front (AppShell.tsx keeps what it writes to). Only a
 * glow, over the canvas and not the strip above it: the canvas under it takes the person's
 * pointer and keys as ever, and the boards land in it live (canvasLibrary.ts). Its own
 * component, so a turn's progress re-renders this and not the editor.
 */
function AgentGlow({ slug }: { slug: string | undefined }) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    window.parent.addEventListener("sp:working", rerender);
    return () => window.parent.removeEventListener("sp:working", rerender);
  }, []);
  const working = window.parent.spShell!.working;
  const on =
    !!slug &&
    working.project === canvasIndex().project &&
    working.slugs.includes(slug);
  return <div className="agent-glow" data-on={on || undefined} aria-hidden />;
}

/**
 * What a project with no boards yet sees, which is otherwise an empty grey grid with no way to
 * tell a misdirected canvas from an empty one. The directory is the whole point of the notice.
 * It is the project's `canvases` folder, which the server knows and the page otherwise does not.
 *
 * The library is a build-time constant, so this is a plain check rather than a subscription; the
 * dev server full-reloads the page when the first board folder appears.
 */
function EmptyLibraryNotice() {
  if (readCanvasLibrary().length) return null;
  // Empty in a production build, which does not ship the build machine's paths. The notice still
  // has something worth saying without it, so it degrades rather than disappearing.
  const { canvasesDir } = canvasIndex();
  const target = canvasesDir || "canvases";
  return (
    <div className="canvas-empty" role="status">
      <h1 className="canvas-empty__title">No boards here yet</h1>
      <p className="canvas-empty__body">
        {canvasesDir
          ? "This canvas is showing"
          : "This canvas has no boards in it."}
        {canvasesDir && (
          <code className="canvas-empty__path">{canvasesDir}</code>
        )}
        Every subfolder with <code>.html</code> files in it becomes a page, and
        one appears here on its own the moment it is written — no restart.
      </p>
      <p className="canvas-empty__body">
        Ask for a board with the <strong>sp-clone-prototype</strong> or{" "}
        <strong>sp-new-ui-mock</strong> skill, or copy the folder skeleton
        yourself:
      </p>
      <pre className="canvas-empty__cmd">
        {`mkdir -p ${shellQuote(target)}\ncp -r "$(sp root)/canvases/templates" \\\n  ${shellQuote(`${target}/my-app`)}`}
      </pre>
    </div>
  );
}

/**
 * Puts library shapes where the layout says they go: creates the ones not on the canvas yet,
 * moves and refreshes the rest, and records every id in `placed`, so that the pass can sweep up
 * whatever it did not place (a board renamed or removed, a heading retitled).
 *
 * The update is what keeps a new board from landing on top of an old one. A board inserted
 * mid-row takes the x of the board after it, and only moving that board makes room. It works on
 * locked shapes only because initializeCanvasLibrary runs the pass with `ignoreShapeLock`;
 * outside it, tldraw's `updateShapes` drops a locked shape's partial without a word.
 */
function placeShapes(
  editor: Editor,
  placed: Set<TLShapeId>,
  shapes: (TLCreateShapePartial & { id: TLShapeId })[],
) {
  for (const shape of shapes) placed.add(shape.id);
  const missing = shapes.filter((shape) => !editor.getShape(shape.id));
  if (missing.length) editor.createShapes(missing);
  const present = shapes.filter((shape) => !missing.includes(shape));
  if (present.length) editor.updateShapes(present as TLShapePartial[]);
}

/** Creates the text shape if it isn't there yet, otherwise only refreshes its copy. */
function createAnnotation(
  editor: Editor,
  placed: Set<TLShapeId>,
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
  placed.add(id);

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
      isLocked: true,
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
    isLocked: true,
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
 * above it and a per-shape caption below it. Idempotent: a board already on the canvas is moved
 * to where the row now puts it rather than created again. Returns the y to start the next row at.
 *
 * Every row starts at x = 0 and uses the same column pitch, so item N of one row always sits
 * directly above item N of the next. That alignment lets you read a reference row
 * against the mockup row above it.
 */
function layoutRow(
  editor: Editor,
  placed: Set<TLShapeId>,
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
  const rowX = (index: number) => index * (size.w + LIBRARY_GAP);
  const contentY = rowTop + LIBRARY_HEADING_HEIGHT;
  placeShapes(
    editor,
    placed,
    rowFiles.map((file, index) => ({
      id: fileShapeId(file),
      type: CANVAS_FILE_SHAPE_TYPE,
      parentId: page.id,
      x: rowX(index),
      y: contentY,
      isLocked: true,
      props: {
        ...size,
        name: file.title,
        path: file.path,
      },
    })),
  );

  // Buttons sit between the boards and their captions, so the caption stays the bottom line
  // of the row whether or not it has any.
  const linksY = contentY + size.h + LIBRARY_LABEL_GAP;
  const linksH = links.length
    ? CANVAS_LINK_BUTTON_SIZE.h + LIBRARY_LABEL_GAP
    : 0;
  placeShapes(
    editor,
    placed,
    links.map((link, index) => ({
      id: linkShapeId(link.url),
      type: CANVAS_LINK_SHAPE_TYPE,
      parentId: page.id,
      x: index * (CANVAS_LINK_BUTTON_SIZE.w + LIBRARY_LABEL_GAP),
      y: linksY,
      isLocked: true,
      props: {
        ...CANVAS_LINK_BUTTON_SIZE,
        label: link.label,
        page: "",
        path: "",
        url: link.url,
      },
    })),
  );

  createAnnotation(editor, placed, {
    id: `canvas-row-heading:${page.id}:${heading}`,
    text: heading,
    x: 0,
    y: rowTop,
    w: rowFiles.length * size.w + (rowFiles.length - 1) * LIBRARY_GAP,
    size: "l",
    parentId: page.id,
  });

  rowFiles.forEach((file, index) => {
    createAnnotation(editor, placed, {
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

/**
 * The box a picture in an image row draws inside, before its own proportions decide the rest.
 * Wider than a board and shorter, because these rows are read across: a row of one platform's
 * assets against the row of the next, not a wall of full-height artwork.
 */
const IMAGE_FIT = { w: 760, h: 520 };

const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

function imageShapeId(pageSlug: string, file: string) {
  return createShapeId(canvasImageKey(pageSlug, file));
}

/**
 * The asset record a picture's shape points at. Derived from the path rather than from the
 * bytes, so it is the same id on every machine and every reload: an asset keyed by a content
 * hash would be a second record the moment someone re-exported the file at a different quality,
 * and the shapes would still point at the first one.
 */
function imageAssetId(pageSlug: string, file: string): TLAsset["id"] {
  // Branded string: the store validates only the `asset:` prefix, the rest is ours to choose.
  return `asset:${canvasImageKey(pageSlug, file)}` as TLAsset["id"];
}

/**
 * Lays out one row of pictures the way layoutRow lays out a row of boards: heading above,
 * caption under each, idempotent, returning the y for the next row.
 *
 * These are tldraw's own image shapes, not boards in an iframe, so they can be zoomed into and
 * read at their real resolution. Unlike a row of boards they are not one shape — an avatar is
 * square, a profile banner is 3:1, a phone screenshot is 9:19.5 — so each is fitted into the
 * same box and the row is as tall as the tallest result, with the shorter ones centred in it.
 * Nothing is scaled up past its own pixels: a 400px avatar drawn at 520 would be the only
 * blurry thing on the page.
 */
function layoutImageRow(
  editor: Editor,
  placed: Set<TLShapeId>,
  page: { id: TLPageId },
  pageSlug: string,
  images: CanvasLayoutImage[],
  rowTop: number,
  heading: string,
) {
  const fitted = images.flatMap((image) => {
    const src = canvasImageUrl(pageSlug, image.file);
    // A layout naming a file nobody committed draws nothing, rather than an empty box with a
    // caption under it that reads as a missing asset.
    if (!src || !image.w || !image.h) return [];
    const scale = Math.min(IMAGE_FIT.w / image.w, IMAGE_FIT.h / image.h, 1);
    return [
      {
        image,
        src,
        w: Math.round(image.w * scale),
        h: Math.round(image.h * scale),
      },
    ];
  });
  if (!fitted.length) return rowTop;

  const bandH = Math.max(...fitted.map((entry) => entry.h));
  const contentY = rowTop + LIBRARY_HEADING_HEIGHT;

  // The asset holds the URL and the real pixel size; the shape holds the size it draws at and
  // points at the asset by id. Created first, because a shape whose assetId resolves to nothing
  // renders as a broken placeholder until something fills it in.
  const assets = fitted.map((entry) => ({
    id: imageAssetId(pageSlug, entry.image.file),
    typeName: "asset" as const,
    type: "image" as const,
    meta: {},
    props: {
      w: entry.image.w,
      h: entry.image.h,
      name: entry.image.file.split("/").pop() ?? entry.image.file,
      isAnimated: entry.image.file.toLowerCase().endsWith(".gif"),
      mimeType:
        IMAGE_MIME[entry.image.file.split(".").pop()?.toLowerCase() ?? ""] ??
        null,
      src: entry.src,
    },
  }));
  // A build gives each file a content-hashed URL, so a returning browser's persisted asset can
  // point at a URL this deployment no longer serves — a broken picture that no amount of force
  // refreshing fixes, because the refresh rebuilds shapes and leaves assets alone. The id is the
  // path, so only what the path does not already fix can go stale: the URL and the pixel size.
  const stale = assets.filter((asset) => {
    const current = editor.getAsset(asset.id);
    if (!current) return false;
    return (
      current.type !== "image" ||
      current.props.src !== asset.props.src ||
      current.props.w !== asset.props.w ||
      current.props.h !== asset.props.h
    );
  });
  const created = assets.filter((asset) => !editor.getAsset(asset.id));
  if (created.length) editor.createAssets(created);
  if (stale.length) editor.updateAssets(stale);

  // Each picture starts where the last one ended, so a row of mixed proportions has one gap
  // between neighbours rather than a column pitch set by its widest member.
  let x = 0;
  const xs = fitted.map((entry) => {
    const at = x;
    x += entry.w + LIBRARY_GAP;
    return at;
  });

  placeShapes(
    editor,
    placed,
    fitted.map((entry, index) => ({
      id: imageShapeId(pageSlug, entry.image.file),
      type: "image",
      parentId: page.id,
      x: xs[index],
      y: contentY + (bandH - entry.h) / 2,
      isLocked: true,
      props: {
        w: entry.w,
        h: entry.h,
        assetId: imageAssetId(pageSlug, entry.image.file),
        altText: entry.image.label,
      },
    })),
  );

  createAnnotation(editor, placed, {
    id: `canvas-row-heading:${page.id}:${heading}`,
    text: heading,
    x: 0,
    y: rowTop,
    w: Math.max(x - LIBRARY_GAP, 1),
    size: "l",
    parentId: page.id,
  });

  const captionY = contentY + bandH + LIBRARY_LABEL_GAP;
  fitted.forEach((entry, index) => {
    createAnnotation(editor, placed, {
      id: `canvas-file-label:${pageSlug}/${entry.image.file}`,
      text: entry.image.label,
      x: xs[index],
      y: captionY,
      w: entry.w,
      size: "s",
      align: "middle",
      parentId: page.id,
    });
  });

  return captionY + LIBRARY_LABEL_HEIGHT + LIBRARY_GAP;
}

/**
 * One tldraw page per canvases/<slug> folder, one shape per HTML file in it. If that
 * folder has a layout.json alongside its HTML files, its rows are laid out top-to-bottom in the
 * declared order; see CanvasLayoutConfig in canvasLibrary.ts. Anything not covered by a row
 * still appears, in a fallback grid below, so a file can never be silently hidden.
 *
 * A page is tied to its folder by the slug stamped in page.meta, not by its name, so renaming a
 * folder's layout.json `name` renames the page someone already has open (annotations and all)
 * instead of building a second one beside it.
 *
 * Every pass reconciles: what the layout places is created or moved into place, and any library
 * shape it did not place is deleted, so the canvas always matches the folder, a board added
 * mid-row or renamed included. One transaction, so the reader never sees a frame in between,
 * kept out of the undo stack, so Cmd-Z after an agent run undoes the reader's own last edit.
 *
 * The boards it had to create glow until the reader points at them (canvasChrome.tsx),
 * unless there were no library shapes at all before it: that is a first load, or the force
 * refresh, and everything on the canvas being new is not news.
 */
function initializeCanvasLibrary(editor: Editor) {
  // An empty library still runs the pass: the last board removed has to take its shapes and
  // its page with it, which the prune below does for every page the loop did not fill.
  const library = readCanvasLibrary();
  const before = new Set(
    editor
      .getPages()
      .flatMap((page) => [...editor.getPageShapeIds(page.id)])
      .filter(isLibraryShapeId),
  );
  const placed = new Set<TLShapeId>();
  editor.run(
    () => {
      const libraryPages = new Set<TLPageId>();

      for (const { slug: pageSlug, files } of library) {
        const pageName = pageNameFor(pageSlug);
        const bySlug = () =>
          editor.getPages().find((c) => c.meta.canvasSlug === pageSlug);
        let page =
          bySlug() ??
          editor
            .getPages()
            .find((c) => c.name === pageName && !c.meta.canvasSlug);
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

        /** Board files a row has taken, so the fallback grid below gets only the rest. */
        const inRows = new Set<string>();
        let rowTop = 0;

        for (const row of readCanvasLayout(pageSlug)?.rows ?? []) {
          if (row.images?.length) {
            rowTop = layoutImageRow(
              editor,
              placed,
              page,
              pageSlug,
              row.images,
              rowTop,
              row.title,
            );
            continue;
          }
          const rowFiles: { file: CanvasLibraryFile; label?: string }[] = [];
          for (const entry of row.files ?? []) {
            const fileName = typeof entry === "string" ? entry : entry.file;
            const label = typeof entry === "string" ? undefined : entry.label;
            const file = files.find(
              (c) => c.fileName === fileName && !inRows.has(c.path),
            );
            if (file) rowFiles.push({ file, label });
          }
          if (!rowFiles.length) continue;
          rowFiles.forEach(({ file }) => inRows.add(file.path));
          rowTop = layoutRow(
            editor,
            placed,
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

        // A board the agent already placed on this page (a random, non-library shape id) must
        // not show twice. Read the live store once the slug's canvas.json has been taken; before
        // that (this pass runs first) its records are only in the index.
        const agentPaths = contentTaken(pageSlug)
          ? agentBoardPaths(
              [...editor.getPageShapeIds(page.id)].map((id) =>
                editor.getShape(id)!,
              ),
            )
          : agentBoardPaths(
              (
                canvasIndex().boards.find((b) => b.slug === pageSlug)?.content
                  ?.records ?? []
              ).filter((r): r is TLShape => r.typeName === "shape"),
            );
        const leftover = files.filter(
          (file) => !inRows.has(file.path) && !agentPaths.has(file.path),
        );
        placeShapes(
          editor,
          placed,
          leftover.map((file, index) => ({
            id: fileShapeId(file),
            type: CANVAS_FILE_SHAPE_TYPE,
            parentId: page.id,
            isLocked: true,
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
          })),
        );

      }

      // What the pass did not place is what the folder no longer has: a board renamed or removed,
      // a heading retitled. Left, it would sit under or over what replaced it.
      for (const pageId of libraryPages) {
        editor.deleteShapes(
          [...editor.getPageShapeIds(pageId)].filter(
            (id) => isLibraryShapeId(id) && !placed.has(id),
          ),
        );
      }
      // What the pass made goes under the rest, as the shapes it replaced were: created, it would
      // cover what the person or the agent put over a board. A Force refresh makes all of it.
      editor.sendToBack([...placed].filter((id) => !before.has(id)));
      lockLibraryShapes(editor);
      pruneEmptyOrphanPages(editor, libraryPages);
      orderPagesByLibrary(editor, libraryPages);
    },
    { history: "ignore", ignoreShapeLock: true },
  );
  if (before.size) {
    markFresh(
      [...placed].filter(
        (id) =>
          !before.has(id) &&
          FRESH_SHAPE_PREFIXES.some((prefix) => id.startsWith(prefix)),
      ),
      "new",
    );
  }
}

/** What counts as new content when it arrives: a board, a picture, a card. Not its caption. */
const FRESH_SHAPE_PREFIXES = [
  "shape:canvas-file:",
  "shape:canvas-image:",
  "shape:canvas-link:",
];

/**
 * Locks every library shape that is not locked yet. New ones are created locked; this is for
 * shapes a browser persisted before they were, and for any unlocked with "Unlock all" to be
 * nudged in the meantime. They lock again on the next load, so the layout is not left movable
 * for the next reader by accident.
 */
function lockLibraryShapes(editor: Editor) {
  const unlocked = editor
    .getPages()
    .flatMap((page) => [...editor.getPageShapeIds(page.id)])
    .filter(isLibraryShapeId)
    .map((id) => editor.getShape(id))
    .filter((shape) => shape && !shape.isLocked)
    .map((shape) => ({ id: shape!.id, type: shape!.type, isLocked: true }));
  if (unlocked.length) editor.updateShapes(unlocked);
}

function linkShapeId(name: string) {
  return createShapeId(`canvas-link:${name}`);
}

/**
 * The page menu lists pages by their index, which is creation order until something sets it:
 * the menu ends up in whatever order this browser happened to build its pages in, which is not
 * the order of anything else. Sort it into the library's own order, so the menu and the folder
 * listing read the same top to bottom.
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
    // The boards are gone with the folder, so the shapes the library put here are all that is
    // keeping the page alive, and nothing else ever reclaims them, because every other sweep
    // walks the pages the library just filled. Without this, renaming or deleting a folder
    // leaves a page of dead boards behind for good.
    deleteLibraryShapes(
      editor,
      [...editor.getPageShapeIds(page.id)].filter(isLibraryShapeId),
    );
    if (drawnOn(editor, page.id)) continue;
    if (editor.getPages().length > 1) editor.deletePage(page.id);
  }
}

/**
 * Whether anything a person would see is left on a page.
 *
 * Text shapes with no text do not count. Clicking the text tool on the canvas and then clicking
 * away leaves one behind, zero-width and rendering nothing, and the page it sits on cannot be told
 * from an empty one by looking at it. Counting those as content kept a folder's page in the menu
 * forever over a shape nobody knew they had made.
 */
function drawnOn(editor: Editor, pageId: TLPageId) {
  return [...editor.getPageShapeIds(pageId)].some((id) => {
    const shape = editor.getShape(id);
    if (shape?.type !== "text") return true;
    const { richText } = (shape as TLTextShape).props;
    return renderPlaintextFromRichText(editor, richText).trim() !== "";
  });
}

/**
 * The force refresh: deletes every shape the library placed on every page, then builds them all
 * again from the current file list and layout.json. Every load and every layout change already
 * reconciles, so this is only the way out for a persisted document that has drifted in some way
 * the reconcile does not model. Hand-drawn shapes and notes are untouched.
 */
function relayoutCanvasLibrary(editor: Editor) {
  editor.run(
    () => {
      for (const page of editor.getPages()) {
        deleteLibraryShapes(
          editor,
          [...editor.getPageShapeIds(page.id)].filter(isLibraryShapeId),
        );
      }
      initializeCanvasLibrary(editor);
    },
    { history: "ignore" },
  );
}

/**
 * The shape the hash of an address names on a page: a board by its file name, a picture by its
 * path inside the folder, or one of the person's own shapes by id (canvasContent.ts). Every
 * picture is under assets/brand and a board is one file at the folder's root, so the kinds of name
 * cannot collide and the hash does not have to say which it is.
 */
function namedShape(editor: Editor, slug: string, name: string) {
  if (name.startsWith("shape:")) return editor.getShape(name as TLShapeId);
  const file = readCanvasLibrary()
    .flatMap((c) => c.files)
    .find((c) => c.pageSlug === slug && c.fileName === name);
  return editor.getShape(
    file
      ? boardShapeId(editor, file.path, projectPages(editor).get(slug))
      : imageShapeId(slug, name),
  );
}

/** The other way: how an address names the one shape selected, if it can name it. */
function shapeName(editor: Editor, shape: TLShape | undefined) {
  const target = asCanvasTarget(shape);
  if (target?.type === CANVAS_FILE_SHAPE_TYPE)
    return readCanvasLibrary()
      .flatMap((c) => c.files)
      .find((c) => c.path === target.props.path)?.fileName;
  if (target) return canvasImageRef(target.id)?.file;
  return shape && personsShape(editor, shape) ? shape.id : undefined;
}

/**
 * Opens what the address names (canvasUrl.ts): the tab, `?canvas=<slug>` or the bare URL for the
 * project's own view and `?brand=<slug>` for a brand kit, and after the hash a shape of that page,
 * `#<file>`, selected with the camera filling the canvas with it. So a specific round, or one
 * board in it, can be linked to or scripted against instead of relying on whichever page tldraw
 * last persisted, and the bare URL is always the way in. Returns whether the hash named a shape.
 */
function applyCanvasFromUrl(editor: Editor, open: (tab: CanvasTab) => void) {
  // Resolved first, so the bare address sets the page of the canvas it lands on.
  const tab = resolveTab(tabFromUrl(window.location.href));
  // Read before `open`, which writes the address from the selection.
  const named = targetFromUrl(window.location.href);
  // A kit or a document is an overlay over the whole editor rather than a page of it, so there
  // is no page to set and no shape under the hash to go looking for. Nor is there for a project
  // with nothing in it yet, which shows no page (HOME_TAB).
  if (tab.kind !== "canvas" || !tab.slug) {
    open(tab);
    return false;
  }
  // The folder whose page the address shows. The shape the hash names is on that page.
  const slug = pageOf(tab);
  const page = editor.getPages().find((c) => c.meta.canvasSlug === slug);
  if (page) editor.setCurrentPage(page.id);
  // The tab is the one asked for when its page is there. Otherwise it is the page landed on, because an address naming a folder that has
  // since gone leaves tldraw on whichever page it persisted, and a chip for that folder would
  // be one that opens nothing. `write` then corrects the address to match.
  const here = editor.getCurrentPage().meta.canvasSlug;
  if (page) open(tab);
  else if (typeof here === "string") open({ kind: "canvas", slug: here });
  const shape = named ? namedShape(editor, slug, named) : undefined;
  if (!shape) {
    editor.selectNone();
    return false;
  }
  // Selected now, so the address written after this names it; the camera once tldraw has
  // measured the viewport.
  editor.select(shape.id);
  requestAnimationFrame(() => zoomToFill(editor, shape.id, false));
  return true;
}

/**
 * Keeps the address on what is being looked at, so whatever is on screen can be shared by
 * copying the URL: the tab in front, and the shape selected when it is the only one and the
 * address can name it. `write` derives the address from those two whenever either changes, and
 * never edits it in place, so the writers cannot disagree. App calls `write` through `tab.open`
 * when a tab comes forward; the selection writes it here.
 *
 * This watches the page rather than writing from it, because the page is only one of the two
 * ways a canvas tab comes forward and the other is the bar. tldraw's own page changes, from a
 * link on a board, arrive here as a page and become the tab naming it. Pages
 * tldraw persisted that no folder claims have no slug, and leave the bar and the address as they
 * are.
 *
 * A change of tab pushes a history entry, so Back returns to the previous one; a change of
 * selection replaces the entry, since it is not somewhere to go back to. A popstate applies the
 * entry it lands on. Applying an address is the one time what is on screen changes without the
 * address needing to follow, so the watchers skip it and every write it provokes replaces
 * instead of pushing, since an entry there would be a second copy of the one just landed on.
 */
function installCanvasUrlSync(
  editor: Editor,
  tab: { active: () => CanvasTab; open: (tab: CanvasTab) => void },
) {
  let applying = false;

  const write = (push: boolean) => {
    const active = tab.active();
    const named =
      active.kind === "canvas"
        ? shapeName(editor, editor.getOnlySelectedShape() ?? undefined)
        : undefined;
    const href = urlForTab(window.location.href, active, named);
    // The window shows this address as its own, and the bar the tab it is on (AppShell.tsx).
    window.parent.spShell!.shown(tabFor(active), href);
    if (href === window.location.href) return;
    if (push && !applying) window.history.pushState(null, "", href);
    else window.history.replaceState(null, "", href);
  };

  const apply = () => {
    applying = true;
    let named: boolean;
    try {
      named = applyCanvasFromUrl(editor, tab.open);
    } finally {
      applying = false;
    }
    write(false);
    return named;
  };

  // The first run is the subscription; `apply` opens the address's tab right after it.
  let first = true;
  const stopSync = react("canvas page in the tab bar", () => {
    const slug = editor.getCurrentPage().meta.canvasSlug;
    if (first || applying) {
      first = false;
      return;
    }
    // The page of the tab already in front is that tab arriving, not a change of tab. A tab
    // brought forward sets its page after it is in front. The project's own view with no
    // canvas shows no page, so whatever tldraw is on under it is no change of tab either.
    const active = pageOf(tab.active());
    if (typeof slug !== "string" || !active || slug === active) return;
    tab.open({ kind: "canvas", slug });
  });
  // `write` reads the selected shape's record, so this also runs as that shape is dragged or
  // typed into. Only a different shape is a new address.
  let selected: string | null | undefined;
  const stopSelection = react("selection in the address", () => {
    const id = editor.getOnlySelectedShapeId();
    const first = selected === undefined;
    if (id === selected) return;
    selected = id;
    if (first || applying) return;
    write(false);
  });
  window.addEventListener("popstate", apply);
  return {
    apply,
    write,
    uninstall: () => {
      stopSync();
      stopSelection();
      window.removeEventListener("popstate", apply);
    },
  };
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
}

export default function App() {
  const [commentUser, setCommentUser] = useState(readCommentUser);
  /** State rather than a ref: the chrome context hands it to parts that render outside `<Tldraw>`. */
  const [editor, setEditor] = useState<Editor | null>(null);
  /**
   * The tab in front. State rather than something derived from the tldraw page, because a brand
   * kit is a tab with no page of its own. It covers the editor, which stays on whichever canvas
   * it was on underneath.
   */
  const [activeTab, setActiveTab] = useState<CanvasTab>(() =>
    resolveTab(tabFromUrl(window.location.href)),
  );
  const store = useLocalStore(storeOptions);
  /** Writes the address from the tab in front and the selection; installed with the editor. */
  const writeUrl = useRef<(push: boolean) => void>(() => {});
  /** The tab in front as of this call rather than as of the last render, for that writer. */
  const active = useRef(activeTab);

  // A board rewritten in place is news as much as a new one: it rings green, where a new one
  // rings blue, until the pointer passes over it (canvasChrome.tsx). The server lists only the
  // boards whose bytes changed, not every one a generator wrote out again (sp.ts).
  useEffect(() => {
    const changed = (event: Event) => {
      const rewritten = (event as CustomEvent<string[]>).detail;
      refetchBoards(rewritten);
      markFresh(
        readCanvasLibrary()
          .flatMap((canvas) => canvas.files)
          .filter((file) =>
            rewritten.some((board) => file.path.endsWith(`canvases/${board}`)),
          )
          .map(fileShapeId),
        "updated",
      );
    };
    window.addEventListener(BOARDS_CHANGED, changed);
    return () => window.removeEventListener(BOARDS_CHANGED, changed);
  }, []);

  /**
   * Brings a tab forward. That marks it the one in front and puts it in the address, which the
   * window mirrors and takes the bar's chip from. It is everything a tab is except the tldraw
   * page, which `openTab` adds.
   *
   * Split in two because the address sync captures this one when the editor mounts and holds it
   * for the life of that editor, so it has to be a function whose behaviour does not depend on
   * anything it closed over changing. It closes over nothing that does.
   */
  const showTab = useCallback((tab: CanvasTab) => {
    const open = resolveTab(tab);
    active.current = open;
    setActiveTab(open);
    writeUrl.current(true);
  }, []);

  /**
   * From a chip, a row of the bar's "+" menu, or a link on a board.
   * Brings the tab forward, and with it the page that is what a canvas tab shows.
   *
   * Before the editor has mounted there is no page to set, since the bar renders as soon as the
   * app does, and tldraw takes a moment. Nothing is lost, because `showTab` has already written
   * the address, and applying the address is the first thing the editor does when it arrives.
   */
  const openTab = (tab: CanvasTab) => {
    showTab(tab);
    if (!editor || tab.kind !== "canvas") return;
    const page = editor
      .getPages()
      .find((c) => c.meta.canvasSlug === pageOf(tab));
    if (page) editor.setCurrentPage(page.id);
  };

  // A layout.json edit moves boards: a row reordered, a label changed, a size override added.
  // The pass reconciles, so the boards that stay keep their shapes and only what moved is
  // touched.
  useEffect(() => {
    if (!editor) return;
    const relayout = () => {
      initializeCanvasLibrary(editor);
      // A project's first canvas lands in front of the blank that stood in for it, and a canvas
      // whose folder went hands over to the one the bare address opens (resolveTab).
      const next = resolveTab(active.current);
      if (next !== active.current) openTab(next);
    };
    window.addEventListener(LAYOUT_CHANGED, relayout);
    return () => window.removeEventListener(LAYOUT_CHANGED, relayout);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- openTab is new each render and reads only editor
  }, [editor]);

  // A chip on the window's bar (AppShell.tsx) opens its view here when the tab is this project
  // or an example, which every project's server has. This declines another project's, and the
  // window loads that project's canvas into the frame instead. Installed on every render, since
  // `openTab` closes over the editor, which arrives after the first.
  useEffect(() => {
    window.spCanvas = {
      goTo(tab) {
        if (!isHere(tab)) return false;
        openTab(tab.view);
        return true;
      },
      // Links Copy link made (canvasChrome.tsx), pasted into the chat: the boards and pictures
      // their hashes name, as the chips their + would have put there. All of them or none, so a
      // paste is never half chips and half text. Only this project's: another's link names its
      // folders, which this canvas may have one of the same name as.
      attach(hrefs) {
        if (!editor) return false;
        const here = new URL(windowUrl(window.location.href));
        const targets = hrefs.map((href) => {
          if (!URL.canParse(href)) return undefined;
          if (!sameProject(href, here.href)) return undefined;
          const tab = tabFromUrl(href);
          const name = targetFromUrl(href);
          if (tab.kind !== "canvas" || !name) return undefined;
          const shape = namedShape(editor, tab.slug, name);
          return name.startsWith("shape:")
            ? personsShape(editor, shape)
              ? shape
              : undefined
            : asCanvasTarget(shape);
        });
        if (!targets.every(Boolean)) return false;
        void attachToChat(editor, targets as TLShape[]);
        return true;
      },
    };
  });

  function handleMount(editor: Editor) {
    setEditor(editor);
    // tldraw's own dark theme, to match the panel's. A dark rail against tldraw's near-white ground
    // looks like two apps in one window, and the ground is most of the window.
    editor.user.updateUserPreferences({ colorScheme: "dark" });
    initializeCanvas(editor);
    // After the library, which is what creates the pages both are keyed to, and content first,
    // since a comment can be pinned to a shape the person put there.
    const disposeContent = installCanvasContent(editor);
    const disposeComments = installCanvasComments(editor);
    const sync = installCanvasUrlSync(editor, {
      active: () => active.current,
      open: showTab,
    });
    writeUrl.current = sync.write;
    // The address names one of them, or the whole page is the view. Not on a reload, which is
    // mostly the server's answer to a board the agent just wrote: tldraw has already put back
    // this tab's camera, and fitting the page would throw away where the reader was looking.
    const reloaded =
      (
        performance.getEntriesByType("navigation")[0] as
          PerformanceNavigationTiming | undefined
      )?.type === "reload";
    if (!sync.apply() && !reloaded)
      requestAnimationFrame(() => editor.zoomToFit());
    const disposeZoom = installDoubleClickZoom(editor);
    return () => {
      disposeContent();
      disposeComments();
      disposeZoom();
      sync.uninstall();
    };
  }

  return (
    <CanvasChromeContext.Provider
      value={{
        relayoutLibrary: () => {
          if (editor) relayoutCanvasLibrary(editor);
        },
        editor,
        commentUser,
        setCommentUser,
        activeTab,
        openTab,
      }}
    >
      {/* The project's side of the window: its canvases across the top, then the canvas. The bar
          above and the agent's panel beside are the window's (AppShell.tsx), outside this frame. */}
      <div className="canvas-project">
        <CanvasStrip />
        <div className="canvas-work">
          <div className="canvas-stage">
            <main
              className="tldraw__editor"
              aria-label="Prototype design canvas"
              // A kit covers the editor rather than replacing it, because tldraw measures its
              // viewport from this element, and one taken out of the layout comes back at zero
              // by zero with its camera lost. Inert instead, so nothing underneath takes a click
              // or the focus.
              inert={activeTab.kind !== "canvas"}
            >
              <Tldraw
                components={canvasChromeComponents}
                store={store}
                shapeUtils={shapeUtils}
                overlayUtils={lockedOverlayUtils}
                tools={canvasCommentTools}
                overrides={canvasUiOverrides}
                // Every board and picture is locked (below, and the library's own placement) so a
                // pan can't drag one — but by default tldraw also drops locked shapes from a marquee drag
                // entirely, which is the one thing this option turns back on. The lock itself is
                // what keeps them from moving: `updateShapes` skips a locked shape's own partial
                // regardless of this flag, so a selected board still can't be dragged or resized.
                // An export waits up to `maxExportDelayMs` for every shape's picture, and past it
                // leaves all of them out, not just the late one. A board's is drawn by the server
                // (CanvasFileShapeUtil.tsx), seconds each when it has changed, so it gets the
                // server's own 120 s for a shot rather than tldraw's 5.
                options={{
                  selectLockedShapes: true,
                  maxExportDelayMs: 120_000,
                }}
                // No cap where a server is behind the page: a pasted file streams into the
                // canvas's files/ (canvasContent.ts), so a gigabyte video is as fine as a
                // screenshot. The hosted build inlines into the browser, so it keeps tldraw's 10 MB.
                maxAssetSize={canvasIndex().served ? Infinity : undefined}
                licenseKey={TLDRAW_LICENSE_KEY}
                onMount={handleMount}
              >
                <AgentBridge />
                <CanvasLinkPaste />
                <LockedLinkClicks />
                <EmptyLibraryNotice />
              </Tldraw>
            </main>
            <AgentGlow
              slug={activeTab.kind === "canvas" ? activeTab.slug : undefined}
            />
            {/* The kit as a tab: the same components brand.html renders, over the canvas instead
                of in a window of their own, and given `openTab` so the links inside them open
                tabs rather than reloading the app out from under the conversation. Keyed by the
                kit, so switching to another starts at the top of it the way a page would. */}
            {/* A Markdown file as a tab (DocTab.tsx). Keyed by the file, so switching to another
                starts at the top of it, and in Read. */}
            {activeTab.kind === "doc" && (
              <DocTab slug={activeTab.slug} key={activeTab.slug} />
            )}
            {/* A project with no canvas yet: blank, rather than whichever page tldraw is on
                under it. Its agent makes and names the first one
                (AppShell.tsx), and the index that brings it lands there (resolveTab). */}
            {activeTab.kind === "canvas" &&
              !activeTab.slug &&
              canvasIndex().project &&
              ownCanvases().length === 0 && <div className="canvas-blank" />}
            {activeTab.kind === "brand" && (
              <div className="brand-page canvas-brand-tab" key={activeTab.slug}>
                {activeTab.slug ? (
                  <BrandKit slug={activeTab.slug} open={openTab} />
                ) : (
                  <BrandKitIndex open={openTab} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </CanvasChromeContext.Provider>
  );
}
