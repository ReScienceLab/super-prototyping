import { useEffect } from "react";
import {
  createShapeId,
  defaultHandleExternalTextContent,
  defaultHandleExternalUrlContent,
  inlineBase64AssetStore,
  useEditor,
  useToasts,
  useTranslation,
  type Editor,
  type SerializedSchema,
  type TLAsset,
  type TLAssetStore,
  type TLImageShape,
  type TLPageId,
  type TLRecord,
  type TLShape,
  type TLShapeId,
  type VecLike,
} from "tldraw";
import { canvasIndex } from "./canvasIndex";
import {
  boardFileUrl,
  canvasImageKey,
  isLibraryShapeId,
  readCanvasLibrary,
} from "./canvasLibrary";
import { ownCanvases } from "./canvasTabs";
import { tabFromUrl, targetFromUrl, windowUrl } from "./canvasUrl";

/**
 * What a person put on a canvas, as its folder's canvas.json: the page's shapes that the library
 * did not place, the bindings from them and the assets they use, as tldraw records. A shape at the
 * page's root has no `parentId`, and an asset's `src` is relative to the folder, `./files/<name>`
 * or `../<slug>/files/<name>`. docs/2026-09-24-canvas-content-on-disk.md has the why.
 */
export interface ContentFile {
  tldraw: SerializedSchema;
  records: TLRecord[];
}

/** Where a folder's files are, as the store spells an asset's src: the page's own address for it. */
const filesUrl = (slug: string) => boardFileUrl(slug, "files/");
const FILES_SRC = new RegExp(
  `^${import.meta.env.BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}board/([^/]+)/files/`,
);

/** Slug -> page for the project's own canvases, the ones whose folder a person's content goes in.
 *  None on the hosted build, which has no folder to write to. */
function projectPages(editor: Editor) {
  const pages = new Map<string, TLPageId>();
  if (!canvasIndex().served) return pages;
  const own = new Set(ownCanvases());
  for (const page of editor.getPages()) {
    const slug = page.meta.canvasSlug as string | undefined;
    if (slug && own.has(slug)) pages.set(slug, page.id);
  }
  return pages;
}

/** The folder a shape a person put on the canvas belongs to, and nothing for the library's own
 *  shapes, or for anything on a page with no folder of its own. */
export function personsShape(editor: Editor, shape: TLShape | undefined) {
  if (!shape || isLibraryShapeId(shape.id)) return undefined;
  const pageId = editor.getAncestorPageId(shape);
  for (const [slug, id] of projectPages(editor)) if (id === pageId) return slug;
  return undefined;
}

/** Where the agent reads that shape: its file when it is a pasted picture or video, else its
 *  record in canvas.json. */
export function personsShapeName(editor: Editor, shape: TLShape, slug: string) {
  const assetId = (shape.props as { assetId?: TLAsset["id"] | null }).assetId;
  const src = assetId ? editor.getAsset(assetId)?.props.src : undefined;
  const match = src ? FILES_SRC.exec(src) : null;
  return match
    ? `${match[1]}/files/${src!.slice(match[0].length)}`
    : `${slug}/canvas.json#${shape.id}`;
}

/** A page's records as the file holds them, sorted by id so a diff moves line by line. */
function pageFile(editor: Editor, pageId: TLPageId, slug: string): ContentFile {
  const shapes = [...editor.getPageShapeIds(pageId)]
    .filter((id) => !isLibraryShapeId(id))
    .map((id) => editor.getShape(id)!);
  const ids = new Set<string>(shapes.map((shape) => shape.id));
  const assetIds = new Set(
    shapes.map((shape) => (shape.props as { assetId?: string }).assetId),
  );
  const own = filesUrl(slug);
  const records = editor.store.allRecords().flatMap((record): TLRecord[] => {
    if (record.typeName === "shape" && ids.has(record.id)) {
      if (record.parentId !== pageId) return [record];
      const { parentId: _parentId, ...rest } = record;
      return [rest as TLRecord];
    }
    if (record.typeName === "binding" && ids.has(record.fromId)) return [record];
    if (record.typeName !== "asset" || !assetIds.has(record.id)) return [];
    const src = record.props.src;
    const match = src && FILES_SRC.exec(src);
    if (!match) return [record];
    const rest = src.slice(match[0].length);
    const relative = src.startsWith(own) ? `./files/${rest}` : `../${match[1]}/files/${rest}`;
    return [{ ...record, props: { ...record.props, src: relative } } as TLRecord];
  });
  records.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { tldraw: editor.store.schema.serialize(), records };
}

/** The file's records as the store holds them: the page put back on root shapes, asset srcs
 *  made the page's own addresses again, and then tldraw's migrations. */
function storeRecords(editor: Editor, file: ContentFile, pageId: TLPageId, slug: string) {
  const store = Object.fromEntries(
    file.records.map((record) => {
      const out = { ...record } as Record<string, unknown> & { id: string };
      if (out.typeName === "shape" && !out.parentId) out.parentId = pageId;
      const props = out.props as { src?: string } | undefined;
      const src = out.typeName === "asset" ? props?.src : undefined;
      if (src?.startsWith("./files/"))
        out.props = { ...props, src: filesUrl(slug) + src.slice(8) };
      else if (src?.startsWith("../"))
        out.props = { ...props, src: `${import.meta.env.BASE_URL}board/${src.slice(3)}` };
      return [out.id, out];
    }),
  );
  const migrated = editor.store.schema.migrateStoreSnapshot({
    schema: file.tldraw,
    store: store as unknown as Record<TLRecord["id"], TLRecord>,
  });
  // Loud: skipping it would have the next save write this browser's copy over the file.
  if (migrated.type === "error")
    throw new Error(`${slug}/canvas.json does not load: ${migrated.reason}`);
  return Object.values(migrated.value) as TLRecord[];
}

let mounted: Editor | undefined;

/**
 * Load each project canvas's canvas.json over what this browser had, and write the page back to
 * it on every change, the way installCanvasComments does comments.json. The file wins on load; a
 * page with no file yet is written on the first pass, which is how what IndexedDB held gets out.
 * Returns a disposer, like the other installers in App.tsx.
 */
export function installCanvasContent(editor: Editor) {
  mounted = editor;
  const pages = projectPages(editor);
  const written = new Map<string, string>();

  editor.store.mergeRemoteChanges(() => {
    for (const [slug, pageId] of pages) {
      const file = canvasIndex().boards.find((b) => b.slug === slug)?.content;
      if (!file) {
        written.set(slug, "");
        continue;
      }
      const wanted = storeRecords(editor, file, pageId, slug);
      const kept = new Set<string>(
        [...editor.getPageShapeIds(pageId)].filter(isLibraryShapeId),
      );
      for (const record of wanted) if (record.typeName === "shape") kept.add(record.id);
      const had = pageFile(editor, pageId, slug).records;
      editor.store.remove(had.map((record) => record.id));
      // A binding to something no longer there, a board taken out of layout.json say, goes.
      editor.store.put(
        wanted.filter(
          (record) =>
            record.typeName !== "binding" ||
            (kept.has(record.fromId) && kept.has(record.toId)),
        ),
      );
      written.set(slug, JSON.stringify(pageFile(editor, pageId, slug)));
    }
  });

  let pending: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    pending = undefined;
    for (const [slug, pageId] of pages) {
      const file = pageFile(editor, pageId, slug);
      const body = file.records.length ? JSON.stringify(file) : "";
      if (written.get(slug) === body) continue;
      written.set(slug, body);
      void fetch(`${import.meta.env.BASE_URL}__sp/canvas-content`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, file: body ? file : null }),
      });
    }
  };
  flush();

  // Every document change is a candidate: a person's shape, an asset landing, a binding. flush
  // compares bodies, so a change to the library's own shapes writes nothing.
  const dispose = editor.store.listen(
    () => {
      clearTimeout(pending);
      pending = setTimeout(flush, 500);
    },
    { source: "user", scope: "document" },
  );
  return () => {
    dispose();
    clearTimeout(pending);
    mounted = undefined;
  };
}

/**
 * The store's asset store: a file pasted or dropped on a project canvas goes into its folder's
 * files/, named by the asset's id, and the asset points at it there. Anywhere else, the hosted
 * build or an example, it is inlined as before.
 */
export const canvasAssetStore: Pick<TLAssetStore, "upload"> = {
  async upload(asset, file, abortSignal) {
    const slug = mounted?.getCurrentPage().meta.canvasSlug as string | undefined;
    if (!mounted || !slug || !projectPages(mounted).has(slug))
      return inlineBase64AssetStore.upload(asset, file, abortSignal);
    const ext =
      /\.[a-z0-9]+$/i.exec(file.name)?.[0].toLowerCase() ??
      `.${file.type.split("/")[1]?.replace("+xml", "")}`;
    const name = `${asset.id.replace(/^asset:/, "")}${ext}`;
    const res = await fetch(
      `${import.meta.env.BASE_URL}__sp/canvas-file?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}`,
      { method: "POST", body: file, signal: abortSignal },
    );
    if (!res.ok) throw new Error(await res.text());
    return { src: filesUrl(slug) + name };
  },
};

/**
 * What a link copied off this canvas pastes as (⌘C copies links, canvasChrome.tsx): a board or a
 * picture becomes a picture the person owns, and one of the person's own shapes a copy of it.
 * Undefined for any other text, which tldraw handles as it always has.
 */
async function fromLinks(editor: Editor, text: string, point?: VecLike) {
  const here = new URL(windowUrl(window.location.href));
  const links = text.trim().split("\n").map((line) => line.trim());
  const found = links.map((href) => {
    if (!URL.canParse(href)) return undefined;
    const url = new URL(href);
    const tab = tabFromUrl(href);
    const named = targetFromUrl(href);
    if (url.origin !== here.origin || url.pathname !== here.pathname) return undefined;
    if (tab.kind !== "canvas" || !named) return undefined;
    if (named.startsWith("shape:")) {
      const shape = editor.getShape(named as TLShapeId);
      return personsShape(editor, shape) ? { shape: shape! } : undefined;
    }
    const board = readCanvasLibrary()
      .flatMap((c) => c.files)
      .find((c) => c.pageSlug === tab.slug && c.fileName === named);
    const shape = editor.getShape(
      createShapeId(board ? `canvas-file:${board.path}` : canvasImageKey(tab.slug, named)),
    );
    return shape ? { board: board && `${tab.slug}/${board.fileName}.html`, shape } : undefined;
  });
  if (!found.every(Boolean)) return false;

  const own = found.filter((f) => !("board" in f!)).map((f) => f!.shape.id);
  const content = own.length ? editor.getContentFromCurrentPage(own) : undefined;
  if (content) editor.putContentOntoCurrentPage(content, { point, select: true });

  const files = await Promise.all(
    found
      .filter((f) => "board" in f!)
      .map(async (f) => {
        const { shape, board } = f as { shape: TLShape; board?: string };
        const { w, h } = shape.props as { w: number; h: number };
        const src = board
          ? `${import.meta.env.BASE_URL}__sp/shoot?path=${encodeURIComponent(board)}&w=${Math.round(w)}&h=${Math.round(h)}`
          : editor.getAsset((shape as TLImageShape).props.assetId!)!.props.src!;
        const bytes = await (await fetch(src)).blob();
        const name = (board ?? src).split("/").pop()!.replace(/\.html$/, ".png");
        return new File([bytes], name, { type: bytes.type });
      }),
  );
  if (files.length) await editor.putExternalContent({ type: "files", files, point });
  return true;
}

/** Puts `fromLinks` in front of tldraw's own handling of pasted links and text. A component,
 *  since tldraw's url handler wants the toasts and strings only its UI holds. */
export function CanvasLinkPaste() {
  const editor = useEditor();
  const toasts = useToasts();
  const msg = useTranslation();
  useEffect(() => {
    editor.registerExternalContentHandler("url", async (content) => {
      if (!(await fromLinks(editor, content.url, content.point)))
        await defaultHandleExternalUrlContent(editor, content, { toasts, msg });
    });
    editor.registerExternalContentHandler("text", async (content) => {
      if (!(await fromLinks(editor, content.text, content.point)))
        await defaultHandleExternalTextContent(editor, content);
    });
  }, [editor, toasts, msg]);
  return null;
}
