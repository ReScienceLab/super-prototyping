import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
  type TLImageShape,
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
  WELCOME_PAGE_SLUG,
  targetFromUrl,
  tabFromUrl,
  urlForTab,
  type CanvasTab,
} from "./canvasUrl";
import { isHere, pageOf, resolveTab, tabFor } from "./canvasTabs";
import { CanvasStrip } from "./CanvasStrip";
// The kits render inside the canvas as well as under brand.html, so this file imports their
// sheet too, and statically, because it is a few kilobytes against tldraw's megabyte, and a tab
// that had to wait for a chunk would be the one thing on the bar that opens slowly.
import { BrandKit } from "./BrandKit";
import { BrandKitIndex } from "./BrandKitIndex";
import "./brand.css";
import {
  CANVAS_FILE_SHAPE_TYPE,
  CanvasFileShapeUtil,
} from "./CanvasFileShapeUtil";
import {
  ImagePanel,
  InspectorClicks,
  InspectorPanel,
  type CanvasImagePick,
} from "./InspectorPanel";
import type { InspectorTarget } from "./inspectorClicks";
import {
  CANVAS_STATUS_BANNER_GAP,
  CANVAS_STATUS_BANNER_HEIGHT,
  CANVAS_STATUS_BANNER_SHAPE_TYPE,
  CanvasStatusBannerShapeUtil,
} from "./CanvasStatusBannerShapeUtil";
import {
  CANVAS_LINK_BUTTON_SIZE,
  CANVAS_LINK_CARD_SIZE,
  CANVAS_LINK_SHAPE_TYPE,
  type CanvasLinkShape,
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
  boardTabStatusForPath,
  brandThumbForSrc,
  canvasImageKey,
  canvasImageRef,
  canvasImageUrl,
  coverFile,
  readCanvasImage,
  readCanvasLayout,
  readCanvasLibrary,
} from "./canvasLibrary";
import { canvasIndex } from "./canvasIndex";
import { installCanvasComments, readCommentUser } from "./canvasComments";
import {
  CanvasChromeContext,
  canvasChromeComponents,
  canvasUiOverrides,
  canvasCommentTools,
} from "./canvasChrome";

/**
 * A picture is the whole of its box. tldraw hit-tests an image that can carry transparency against
 * its own pixels, so a mockup drawn on nothing answers nothing where it is nothing: the inspector
 * stays shut and the attach buttons never appear except over the drawing itself. Here a picture is
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

/**
 * The artboard box, which is 478 x 980 unless the folder's layout.json declares its own `w`/`h`
 * for that file, as 00-welcome does for its landscape strip.
 */
function boardSize(file: CanvasLibraryFile) {
  for (const row of readCanvasLayout(file.pageSlug)?.rows ?? []) {
    for (const entry of row.files ?? []) {
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

/**
 * Id prefixes of everything the library places: boards, row headings, captions, and the cards
 * and buttons that open things. They are all created locked, and `lockLibraryShapes` locks any
 * that a browser persisted before that was so. Locked, a shape cannot be selected, so a reader
 * who means to pinch or scroll cannot drag a board out of its row by accident; the camera is the
 * only thing that moves. The layout is declared in layout.json, so a board is never repositioned
 * by hand anyway. Anything a person draws on top stays unlocked and editable.
 */
const LIBRARY_SHAPE_PREFIXES = [
  "shape:canvas-file:",
  "shape:canvas-image:",
  "shape:canvas-row-heading:",
  "shape:canvas-file-label:",
  "shape:canvas-link:",
  "shape:canvas-status-banner:",
];

function isLibraryShapeId(id: string) {
  return LIBRARY_SHAPE_PREFIXES.some((prefix) => id.startsWith(prefix));
}

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
        Ask for a board with the <strong>clone-prototype</strong> or{" "}
        <strong>new-ui-mock</strong> skill, or copy the folder skeleton
        yourself:
      </p>
      <pre className="canvas-empty__cmd">
        {`mkdir -p ${shellQuote(target)}\ncp -r "$(sp root)/canvases/templates" \\\n  ${shellQuote(`${target}/my-app`)}`}
      </pre>
    </div>
  );
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

/** The status tab above this board, when it has one. */
function statusBannerShapeId(file: CanvasLibraryFile) {
  return createShapeId(`canvas-status-banner:${file.path}`);
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
  // A status tab sits above its board, not inside it, so the row reserves the height once for
  // all of its boards. Reserving per row rather than per board keeps item N of one row aligned
  // with item N of the next even where only one board in the row carries a tab.
  const rowStatuses = rowFiles.map((file) => boardTabStatusForPath(file.path));
  const statusH = rowStatuses.some(Boolean)
    ? CANVAS_STATUS_BANNER_HEIGHT + CANVAS_STATUS_BANNER_GAP
    : 0;
  const contentY = (bare ? rowTop : rowTop + LIBRARY_HEADING_HEIGHT) + statusH;
  const missing = rowFiles.filter(
    (file) => !editor.getShape(fileShapeId(file)),
  );
  if (missing.length) {
    editor.createShapes(
      missing.map((file) => ({
        id: fileShapeId(file),
        type: CANVAS_FILE_SHAPE_TYPE,
        parentId: page.id,
        x: rowX(rowFiles.indexOf(file)),
        y: contentY,
        isLocked: true,
        props: {
          ...size,
          name: file.title,
          path: file.path,
        },
      })),
    );
  }

  // Idempotent like the boards above: only tabs not on the canvas yet are created, so a
  // reload never moves one. A status changed in layout.json lands on the next force refresh.
  const missingBanners = rowFiles.filter(
    (file, index) =>
      rowStatuses[index] && !editor.getShape(statusBannerShapeId(file)),
  );
  if (missingBanners.length) {
    editor.createShapes(
      missingBanners.map((file) => {
        const index = rowFiles.indexOf(file);
        return {
          id: statusBannerShapeId(file),
          type: CANVAS_STATUS_BANNER_SHAPE_TYPE,
          parentId: page.id,
          x: rowX(index),
          y: contentY - statusH,
          isLocked: true,
          props: {
            w: size.w,
            h: CANVAS_STATUS_BANNER_HEIGHT,
            status: rowStatuses[index]!,
          },
        };
      }),
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
  page: { id: TLPageId },
  pageSlug: string,
  images: CanvasLayoutImage[],
  rowTop: number,
  heading: string,
) {
  const placed = images.flatMap((image) => {
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
  if (!placed.length) return rowTop;

  const bandH = Math.max(...placed.map((entry) => entry.h));
  const contentY = rowTop + LIBRARY_HEADING_HEIGHT;

  // The asset holds the URL and the real pixel size; the shape holds the size it draws at and
  // points at the asset by id. Created first, because a shape whose assetId resolves to nothing
  // renders as a broken placeholder until something fills it in.
  const assets = placed.map((entry) => ({
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
  const xs = placed.map((entry) => {
    const at = x;
    x += entry.w + LIBRARY_GAP;
    return at;
  });

  const missing = placed
    .map((entry, index) => ({ entry, index }))
    .filter(
      ({ entry }) => !editor.getShape(imageShapeId(pageSlug, entry.image.file)),
    );
  if (missing.length) {
    editor.createShapes(
      missing.map(({ entry, index }) => ({
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
  }

  createAnnotation(editor, {
    id: `canvas-row-heading:${page.id}:${heading}`,
    text: heading,
    x: 0,
    y: rowTop,
    w: Math.max(x - LIBRARY_GAP, 1),
    size: "l",
    parentId: page.id,
  });

  const captionY = contentY + bandH + LIBRARY_LABEL_GAP;
  placed.forEach((entry, index) => {
    createAnnotation(editor, {
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
 * every example and would make five identical-looking cards. The cards sit in four rows: two
 * of example apps grouped by what the app is for, then Apple's own apps, then the template.
 */
function layoutWelcomeExtras(
  editor: Editor,
  page: { id: TLPageId },
  library: CanvasLibraryFile[][],
  rowTop: number,
) {
  const targets = library.filter(
    (files) => files[0].pageSlug !== WELCOME_PAGE_SLUG,
  );

  // The repo CTA used to be a shape parked in the welcome board's header, and is gone now, so a
  // canvas saved before that still has to lose its copy.
  const starId = linkShapeId("star");
  if (editor.getShape(starId)) deleteLibraryShapes(editor, [starId]);
  if (!targets.length) return;

  // Four rows, because twenty-one cards in one row read as a list of twenty-one unrelated
  // things. Two rows of cloned apps split by what the app is for, then Apple's own, then the
  // empty template on its own: it is the one card that is not an app to look at but a folder
  // to copy, and a row of one says that where a seat at the end of the Apple row did not. A
  // card's id is its slug, so a folder that changes row moves on the next force refresh
  // rather than turning into a second card.
  //
  // Both orders are by hand rather than alphabetical, which wedged Duolingo between Claude and
  // Grok. A slug named in neither list still shows, at the end of the first row, so a new
  // folder is never silently dropped; the last row has no list, so it keeps library order.
  const ROWS = [
    [
      "snapaction-ios",
      "chatgpt-ios",
      "claude-ios",
      "grok-ios",
      "notion-ios",
      "raycast-ios",
    ],
    [
      "luma-ios",
      "instagram-ios",
      "tiktok-ios",
      "x-ios",
      "substack-ios",
      "spotify-ios",
      "duolingo-ios",
    ],
  ];
  const rowOf = (slug: string) => {
    if (slug === "templates") return 3;
    if (slug.startsWith("apple-")) return 2;
    const found = ROWS.findIndex((row) => row.includes(slug));
    return found === -1 ? 0 : found;
  };
  const inRow = (index: number) => {
    const order = ROWS[index] ?? [];
    const rank = (files: CanvasLibraryFile[]) => {
      const at = order.indexOf(files[0].pageSlug);
      return at === -1 ? order.length : at;
    };
    return targets
      .filter((files) => rowOf(files[0].pageSlug) === index)
      .sort((a, b) => rank(a) - rank(b));
  };
  const groups = [
    {
      title:
        "Examples: AI assistants and productivity tools. Click a card to open its canvas",
      targets: inRow(0),
    },
    { title: "Examples: social, media and learning apps", targets: inRow(1) },
    { title: "Examples: Apple's own apps", targets: inRow(2) },
    { title: "The empty folder to copy to start your own", targets: inRow(3) },
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
  deleteLibraryShapes(editor, orphans);

  const cardX = (index: number) =>
    index * (CANVAS_LINK_CARD_SIZE.w + LIBRARY_GAP);

  let top = rowTop;
  for (const [index, group] of groups.entries()) {
    if (!group.targets.length) continue;
    const contentY = top + LIBRARY_HEADING_HEIGHT;
    const cards = group.targets.map((files, index) => {
      const cover = coverFile(files);
      return {
        id: linkShapeId(files[0].pageSlug),
        type: CANVAS_LINK_SHAPE_TYPE,
        parentId: page.id,
        x: cardX(index),
        y: contentY,
        isLocked: true,
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
          isLocked: true,
          props: { ...card.props },
        });
      }
    }

    createAnnotation(editor, {
      id: headings[index],
      text: group.title,
      x: 0,
      y: top,
      // A heading is as wide as the row it labels, so it wraps at the last card rather than
      // running out over the canvas. Floored at three cards: the row holding only the empty
      // template is one card wide, and a heading that narrow wraps to a word a line.
      w: (() => {
        const cols = Math.max(group.targets.length, 3);
        return cols * CANVAS_LINK_CARD_SIZE.w + (cols - 1) * LIBRARY_GAP;
      })(),
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
      LIBRARY_LABEL_HEIGHT * 2 + // the card's caption is two lines, name over count
      LIBRARY_GAP;
  }
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
      if (row.images?.length) {
        rowTop = layoutImageRow(
          editor,
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
          };
        }),
      );
    }

    if (files[0].pageSlug === WELCOME_PAGE_SLUG) {
      layoutWelcomeExtras(editor, page, library, rowTop);
    }
  }

  lockLibraryShapes(editor);
  pruneEmptyOrphanPages(editor, libraryPages);
  orderPagesByLibrary(editor, libraryPages);
}

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
 * Deletes every shape the library placed (row shapes, headings, captions, and the fallback
 * grid) on every page, then rebuilds them from the current file list and layout.json.
 *
 * Creation is idempotent. It fills in what's missing but never moves a shape that's already
 * there, so editing layout.json (inserting a file at the front of a row, say) leaves the old
 * shapes at their old positions while the new ones land on top of them. This is the force
 * refresh that clears that drift. Hand-drawn shapes and notes are untouched.
 */
function relayoutCanvasLibrary(editor: Editor) {
  for (const page of editor.getPages()) {
    deleteLibraryShapes(
      editor,
      [...editor.getPageShapeIds(page.id)].filter(isLibraryShapeId),
    );
  }
  initializeCanvasLibrary(editor);
}

/**
 * Opens what the address names (canvasUrl.ts): the tab, `?canvas=<slug>` or the bare URL for the
 * welcome page and `?brand=<slug>` for a brand kit, and after the hash a board of that page,
 * `#<file>`, which opens in the inspector. So a specific round, or one board in it, can be
 * linked to or scripted against instead of relying on whichever page tldraw last persisted, and
 * the bare URL is always the way in, so keep a board open across reloads by deep-linking it, not
 * by leaving it on screen. A board the address names that is not on that page closes the
 * inspector, so what is on screen never contradicts the address. Returns the board opened, if any.
 */
/** What the inspector has open, as the address spells it: the page it belongs to, and either a
 * board's file name or a picture's path inside that folder. */
type CanvasAddress = { slug: string; name: string };

function applyCanvasFromUrl(
  editor: Editor,
  open: (tab: CanvasTab) => void,
  show: {
    board: (file: CanvasLibraryFile | null) => void;
    image: (pick: CanvasImagePick) => void;
  },
) {
  const tab = tabFromUrl(window.location.href);
  // A kit is an overlay over the whole editor rather than a page of it, so there is no page to
  // set and no board under the hash to go looking for. `open` shuts the inspector for it.
  if (tab.kind === "brand") {
    open(tab);
    return false;
  }
  // The folder whose page the address shows, which for the bare address is Start here's. The
  // board or picture the hash names is one of that folder's.
  const slug = pageOf(tab);
  const page = editor.getPages().find((c) => c.meta.canvasSlug === slug);
  if (page) editor.setCurrentPage(page.id);
  // The tab is the one asked for when its page is there, since the bare address and Start
  // here's own are two views of the same page (canvasTabs.ts) and the page alone cannot say
  // which. Otherwise it is the page landed on, because an address naming a folder that has
  // since gone leaves tldraw on whichever page it persisted, and a chip for that folder would
  // be one that opens nothing. `write` then corrects the address to match.
  const here = editor.getCurrentPage().meta.canvasSlug;
  if (page) open(tab);
  else if (typeof here === "string") open({ kind: "canvas", slug: here });
  const named = targetFromUrl(window.location.href);
  const file =
    readCanvasLibrary()
      .flat()
      .find((c) => c.pageSlug === slug && c.fileName === named) ?? null;
  // Then a picture of this page, which the address names by its path inside the folder. Every
  // one of them is under assets/brand and a board is one file at the folder's root, so the two
  // kinds of name cannot collide and the hash does not have to say which it is.
  const found = !file && named ? readCanvasImage(slug, named) : undefined;
  if (named && found) {
    show.image({
      shapeId: imageShapeId(slug, named),
      slug,
      file: named,
      ...found,
    });
    return true;
  }
  show.board(file);
  return Boolean(file);
}

/**
 * Keeps the address on what is being looked at, so whatever is on screen can be shared by
 * copying the URL: the tab in front, and the board or picture open in the inspector when it is
 * one of that page's (an inspector left open across a page change names something of the other
 * page, which the address then leaves out). `write` derives the address from those two whenever
 * either changes, and never edits it in place, so the two writers cannot disagree. App calls
 * `write` through `tab.open` when a tab comes forward, and directly when the inspector opens or
 * closes.
 *
 * This watches the page rather than writing from it, because the page is only one of the two
 * ways a canvas tab comes forward and the other is the bar. tldraw's own page changes, from a
 * welcome card or a link on a board, arrive here as a page and become the tab naming it. Pages
 * tldraw persisted that no folder claims have no slug, and leave the bar and the address as they
 * are.
 *
 * Each change pushes a history entry, so Back returns to the previous one and, from there, to
 * its page and the welcome page; a popstate applies the entry it lands on. Applying an address
 * is the one time what is on screen changes without the address needing to follow, so the
 * watcher skips it and every write it provokes replaces instead of pushing, since an entry
 * there would be a second copy of the one just landed on.
 */
function installCanvasUrlSync(
  editor: Editor,
  tab: { active: () => CanvasTab; open: (tab: CanvasTab) => void },
  opened: () => CanvasAddress | null,
  show: {
    board: (file: CanvasLibraryFile | null) => void;
    image: (pick: CanvasImagePick) => void;
  },
) {
  let applying = false;

  const write = (push: boolean) => {
    const active = tab.active();
    const open = opened();
    const named =
      active.kind === "canvas" && open?.slug === pageOf(active)
        ? open.name
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
      named = applyCanvasFromUrl(editor, tab.open, show);
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
    // brought forward sets its page after it is in front, and the page of the project's own
    // view with no canvas is Start here's, which is also an example's (canvasTabs.ts).
    if (typeof slug !== "string" || slug === pageOf(tab.active())) return;
    tab.open({ kind: "canvas", slug });
  });
  window.addEventListener("popstate", apply);
  return {
    apply,
    write,
    uninstall: () => {
      stopSync();
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

/** Distance from the viewport's edge to the board the address named, in screen px. */
const BOARD_ZOOM_INSET = 80;

export default function App() {
  /** The board open in the inspector: click any board on the canvas to open it, Escape or × to close. */
  const [inspecting, setInspecting] = useState<CanvasLibraryFile | null>(null);
  /** The brand image open in the inspector instead, when a picture was the thing clicked. */
  const [inspectingImage, setInspectingImage] =
    useState<CanvasImagePick | null>(null);
  const [commentUser, setCommentUser] = useState(readCommentUser);
  /** State rather than a ref: the inspector panel renders outside `<Tldraw>` and needs it. */
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
  /** What the inspector has open, spelled the way the address spells it: a board by file name,
   * a picture by its path inside the folder, each with the page it belongs to. For the address
   * writer, which runs outside React. */
  const opened = useRef<CanvasAddress | null>(null);
  /** Writes the address from the tab in front and the inspector; installed with the editor. */
  const writeUrl = useRef<(push: boolean) => void>(() => {});
  /** The tab in front as of this call rather than as of the last render, for that writer. */
  const active = useRef(activeTab);
  /** What the address named, for the camera to go to once the inspector is beside it. */
  const zoomTo = useRef<TLShapeId | null>(null);
  /** That board's frame on the canvas: the panel reads its report and posts its selection there. */
  const inspectorFrame = useRef<HTMLIFrameElement | null>(null);

  // A layout.json edit moves boards: a row reserves the height of a status tab for all of its
  // boards, so a status appearing or disappearing reflows the row. Creation is idempotent and
  // never moves a shape that is already there, so only the force refresh catches up. This is
  // what the status control used to get from a full page reload.
  useEffect(() => {
    if (!editor) return;
    const relayout = () => relayoutCanvasLibrary(editor);
    window.addEventListener(LAYOUT_CHANGED, relayout);
    return () => window.removeEventListener(LAYOUT_CHANGED, relayout);
  }, [editor]);

  /**
   * Opens a board in the inspector, or closes it. A pick or a close is a new address; applying
   * an address is not, and passes `push: false`.
   */
  const show = useCallback((file: CanvasLibraryFile | null, push: boolean) => {
    opened.current = file ? { slug: file.pageSlug, name: file.fileName } : null;
    setInspecting(file);
    // One dock, one thing in it: a board opening takes the place of a picture and the other way.
    setInspectingImage(null);
    if (push) {
      zoomTo.current = null; // the reader's own pick or close, so no address is left to zoom to
      writeUrl.current(true);
    }
  }, []);
  /** The same for a picture, which has an address of its own for the same reason a board does:
   * it is a thing on the canvas someone will want to send to someone else. */
  const showImage = useCallback((pick: CanvasImagePick, push: boolean) => {
    opened.current = { slug: pick.slug, name: pick.file };
    setInspecting(null);
    setInspectingImage(pick);
    if (push) {
      zoomTo.current = null;
      writeUrl.current(true);
    }
  }, []);
  const onCloseInspector = useCallback(() => show(null, true), [show]);
  const onPick = useCallback(
    (shape: InspectorTarget) => {
      if (shape.type === CANVAS_FILE_SHAPE_TYPE) {
        const file = readCanvasLibrary()
          .flat()
          .find((c) => c.path === shape.props.path);
        if (file) show(file, true);
        return;
      }
      // Brand material, addressed by the folder path its shape is keyed by.
      const ref = canvasImageRef(shape.id);
      const entry = ref && readCanvasImage(ref.slug, ref.file);
      if (!ref || !entry) return;
      showImage({ shapeId: shape.id, ...ref, ...entry }, true);
    },
    [show, showImage],
  );

  /**
   * Brings a tab forward. That marks it the one in front and puts it in the address, which the
   * window mirrors and takes the bar's chip from. It is everything a tab is except the tldraw
   * page, which `openTab` adds.
   *
   * Split in two because the address sync captures this one when the editor mounts and holds it
   * for the life of that editor, so it has to be a function whose behaviour does not depend on
   * anything it closed over changing. It closes over `show` and nothing else.
   */
  const showTab = useCallback(
    (tab: CanvasTab) => {
      const open = resolveTab(tab);
      // A kit covers the canvas whole, and the inspector left open beside it would be a dock
      // onto a board of a page that is no longer in front.
      if (open.kind === "brand") show(null, false);
      active.current = open;
      setActiveTab(open);
      writeUrl.current(true);
    },
    [show],
  );

  /**
   * From a chip, a row of the bar's "+" menu, a card on the welcome page or a link on a board.
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
    };
  });

  // The camera goes to what the address named, after the inspector has taken its share of the
  // window: a layout effect, so the panel is in the DOM, and the viewport measured here because
  // tldraw measures it on a throttled resize observer, up to 200ms behind, which would fit the
  // board to the canvas width the panel just took. Every `show` from an address is a fresh
  // object, so the effect runs even for the one already open.
  useLayoutEffect(() => {
    const id = zoomTo.current;
    zoomTo.current = null;
    if (!editor || !id) return;
    const bounds = editor.getShapePageBounds(id);
    if (!bounds) return;
    editor.updateViewportScreenBounds(editor.getContainer());
    editor.zoomToBounds(bounds, { inset: BOARD_ZOOM_INSET });
  }, [inspecting, inspectingImage, editor]);

  function handleMount(editor: Editor) {
    setEditor(editor);
    // tldraw's own dark theme, to match the panel's. A dark rail against tldraw's near-white ground
    // looks like two apps in one window, and the ground is most of the window.
    editor.user.updateUserPreferences({ colorScheme: "dark" });
    initializeCanvas(editor);
    // After the library, which is what creates the pages the comments are keyed to.
    const disposeComments = installCanvasComments(editor);
    const sync = installCanvasUrlSync(
      editor,
      { active: () => active.current, open: showTab },
      () => opened.current,
      {
        board: (file) => {
          zoomTo.current = file ? fileShapeId(file) : null;
          show(file, false);
        },
        image: (pick) => {
          zoomTo.current = pick.shapeId;
          showImage(pick, false);
        },
      },
    );
    writeUrl.current = sync.write;
    // The address names one of them, or the whole page is the view.
    if (!sync.apply()) requestAnimationFrame(() => editor.zoomToFit());
    return () => {
      disposeComments();
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
        inspectBoard: onPick,
        inspectingPath: inspecting?.path ?? null,
        inspectorOpen: Boolean(inspecting || inspectingImage),
        activeTab,
        openTab,
        setInspectorFrame: (frame: HTMLIFrameElement | null) => {
          inspectorFrame.current = frame;
        },
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
              inert={activeTab.kind === "brand"}
            >
              <Tldraw
                components={canvasChromeComponents}
                store={store}
                shapeUtils={shapeUtils}
                tools={canvasCommentTools}
                overrides={canvasUiOverrides}
                // Every board and picture is locked (below, and the library's own placement) so a
                // pan can't drag one and a click opens the inspector instead of tldraw's own
                // selection — but by default tldraw also drops locked shapes from a marquee drag
                // entirely, which is the one thing this option turns back on. The lock itself is
                // what keeps them from moving: `updateShapes` skips a locked shape's own partial
                // regardless of this flag, so a selected board still can't be dragged or resized.
                options={{ selectLockedShapes: true }}
                licenseKey={TLDRAW_LICENSE_KEY}
                onMount={handleMount}
              >
                <AgentBridge />
                <LockedLinkClicks />
                <InspectorClicks
                  onPick={onPick}
                  onDismiss={onCloseInspector}
                  inspectingPath={inspecting?.path ?? null}
                  frame={inspectorFrame}
                />
                <EmptyLibraryNotice />
              </Tldraw>
            </main>
            {/* The kit as a tab: the same components brand.html renders, over the canvas instead
                of in a window of their own, and given `openTab` so the links inside them open
                tabs rather than reloading the app out from under the conversation. Keyed by the
                kit, so switching to another starts at the top of it the way a page would. */}
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
          {inspecting ? (
            // Keyed by path: a different board is a fresh panel, with its own selection and
            // report, rather than one that resets its state in an effect.
            <InspectorPanel
              key={inspecting.path}
              path={inspecting.path}
              name={inspecting.title}
              size={boardSize(inspecting)}
              frame={inspectorFrame}
              onClose={onCloseInspector}
            />
          ) : inspectingImage ? (
            <ImagePanel
              key={inspectingImage.shapeId}
              pick={inspectingImage}
              onClose={onCloseInspector}
            />
          ) : null}
        </div>
      </div>
    </CanvasChromeContext.Provider>
  );
}
