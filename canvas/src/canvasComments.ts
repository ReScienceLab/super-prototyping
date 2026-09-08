import {
  putCommentRecords,
  shapeAnchorAt,
  type CommentAuthor,
  type TLCommentRecord,
} from "@tldraw/commenting";
import type { Editor, TLCommentAnchor, TLPageId, TLRecord, TLShapeId } from "tldraw";
import { rawComments } from "virtual:canvases";
import { CANVAS_FILE_SHAPE_TYPE, type CanvasFileShape } from "./CanvasFileShapeUtil";

// Comments live in the board folder, as `<slug>/comments.json`, and go into Git with the boards.
// That is the whole design decision: this canvas serves one repo, has no login and no sync
// server, and a note on a mockup is only worth keeping next to the mockup it is about. So the
// file is the source of truth and the tldraw store is a working copy of it — loaded over
// whatever IndexedDB had, written back on every change.
//
// Two things the records cannot carry into the file. Page ids are minted per browser (App.tsx
// asks tldraw to create the page, tldraw hands out the id), so the folder slug plays that role
// and the page id is re-attached on load. Author ids are made up here rather than issued by
// anything, so each file also carries the names of the people in it — that is what turns an id
// back into a name in someone else's checkout.

/** A board folder's comments.json. `records` carry no `pageId`: the folder is the page. */
export interface CommentsFile {
  /** Author id -> display info, for every author appearing in `records`. */
  authors: Record<string, CommentAuthor>;
  records: FileCommentRecord[];
}

type FileCommentRecord = Omit<TLCommentRecord, "pageId">;

/** Who this browser posts as. No login: a GitHub handle typed once, kept in localStorage. */
export interface CommentUser {
  id: string;
  name: string;
  image: string;
}

const USER_KEY = "super-prototyping-comment-user";

const COMMENT_TYPES = new Set(["comment-thread", "comment", "comment-reaction"]);

const isComment = (record: { typeName: string }) => COMMENT_TYPES.has(record.typeName);

/**
 * Every comment record in the store. The comment types are registered records rather than part
 * of `TLRecord`, so they cross into the typed world here and nowhere else.
 */
const allComments = (editor: Editor) =>
  (editor.store.allRecords() as unknown as TLCommentRecord[]).filter(isComment);

/**
 * Every author named by any board's comments.json, plus this browser's own. Not reactive: it is
 * read while a comment renders, and the only entry that changes during a session is the local
 * user's own name, which re-renders the layer through the identity state in App.tsx anyway.
 */
const authors = new Map<string, CommentAuthor>();
for (const file of Object.values(rawComments)) {
  for (const [id, author] of Object.entries<CommentAuthor>(file.authors ?? {}))
    authors.set(id, author);
}

/**
 * Name an author id, for `CanvasComments`. Every id is a GitHub login, so one from a board this
 * canvas has not loaded still resolves to a name and an avatar rather than to nothing.
 */
export function resolveAuthor(id: string): CommentAuthor {
  return authors.get(id) ?? githubUser(id.replace(/^user:/, ""));
}

/**
 * The login in whatever was typed: a handle, an `@handle`, or a pasted profile URL. Null when it
 * is not a GitHub username — GitHub's own rule, alphanumerics and single inner hyphens, 39 max.
 */
export function githubLogin(input: string): string | null {
  const login = input
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
  return /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(login) ? login : null;
}

/**
 * The identity a login gives, avatar included. There is no account here and no directory, so the
 * handle is both the id and the display name — the one thing everyone reviewing this repo already
 * has, and the one that means the same in a pull request. The avatar needs no API: github.com
 * redirects `<login>.png` to it, which is also a URL worth reading in the committed JSON.
 */
function githubUser(login: string): CommentUser {
  return {
    id: `user:${login.toLowerCase()}`,
    name: login,
    image: `https://github.com/${login}.png?size=80`,
  };
}

/**
 * Who a typed handle is, or null if GitHub will not serve an avatar for it — which catches the
 * typo before it is committed and confirms the one thing this needs in the same request.
 * `api.github.com` answers the same question, but it rate-limits an unauthenticated caller hard
 * enough to 403 every check away, and a 403 is not a "no such user".
 */
export async function resolveGithubUser(input: string): Promise<CommentUser | null> {
  const login = githubLogin(input);
  if (!login) return null;
  const user = githubUser(login);
  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(user);
    img.onerror = () => resolve(null);
    img.src = user.image;
  });
}

export function readCommentUser(): CommentUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    const user = raw ? (JSON.parse(raw) as CommentUser) : null;
    // Both, so a name-only identity stored before avatars asks for the GitHub handle once.
    return user?.name && user.image ? user : null;
  } catch {
    return null;
  }
}

export function writeCommentUser(user: CommentUser) {
  authors.set(user.id, { name: user.name, image: user.image });
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // A browser refusing storage still gets to comment; it just asks for the handle again later.
  }
}

/** Distance from a page point to a box, zero anywhere inside it. */
export function distanceToBox(
  point: { x: number; y: number },
  box: { x: number; y: number; w: number; h: number },
) {
  const dx = Math.max(box.x - point.x, 0, point.x - (box.x + box.w));
  const dy = Math.max(box.y - point.y, 0, point.y - (box.y + box.h));
  return Math.hypot(dx, dy);
}

/**
 * How far outside a board a comment still belongs to it, in page units — one column gap
 * (LIBRARY_GAP in App.tsx), so a note dropped in the margin beside a mockup attaches to it while
 * one dropped out in open canvas stays where it was put. Nearest board wins, so the gap between
 * two boards splits down the middle rather than being ambiguous.
 */
const NEARBY = 80;

/**
 * The board a comment placed at `point` is about, or undefined out in open canvas. Inside a board
 * the comment tool has already resolved this itself; this is only for the ones that landed beside
 * one.
 */
export function nearestBoard(editor: Editor, pageId: TLPageId, point: { x: number; y: number }) {
  let best: { id: TLShapeId; distance: number } | undefined;
  for (const id of editor.getPageShapeIds(pageId)) {
    const shape = editor.getShape(id);
    if (shape?.type !== CANVAS_FILE_SHAPE_TYPE) continue;
    const bounds = editor.getShapePageBounds(shape);
    if (!bounds) continue;
    const distance = distanceToBox(point, bounds);
    if (distance <= NEARBY && (!best || distance < best.distance)) {
      best = { id: shape.id, distance };
    }
  }
  return best?.id;
}

/**
 * Re-anchor a freshly placed thread onto the board beside it. A shape anchor is a normalized
 * offset within the board's own bounds, unclamped both when it is recorded and when it is drawn,
 * so a pin in the margin keeps exactly the spot it was dropped on *and* rides the board when a
 * layout.json edit reflows the page. That is the point of doing this at all: the boards move, and
 * the notes about them should move with them.
 */
function anchorToNearbyBoard(editor: Editor, records: { typeName: string }[]) {
  const updates: TLCommentRecord[] = [];
  for (const record of records) {
    if (record.typeName !== "comment-thread") continue;
    const thread = record as unknown as Extract<TLCommentRecord, { typeName: "comment-thread" }>;
    const anchor = thread.anchor;
    // Anything but a bare point was resolved deliberately — by the tool's own hit-test, or by
    // someone dragging the pin — and is left alone.
    if (anchor.type !== "point") continue;
    const shapeId = nearestBoard(editor, thread.pageId, anchor);
    if (!shapeId) continue;
    updates.push({ ...thread, anchor: shapeAnchorAt(editor, shapeId, anchor, true) });
  }
  if (updates.length) putCommentRecords(editor, updates);
}

/**
 * The board a thread is linked to, or undefined for one left out in open canvas. The shape anchor
 * *is* the link — the comment tool records one for a comment placed on a mockup, and the function
 * above writes one for a comment placed beside it — so this only reads it back, for the surfaces
 * that show which mockup a note is about.
 */
export function linkedBoard(editor: Editor, anchor: TLCommentAnchor): CanvasFileShape | undefined {
  if (anchor.type !== "shape") return undefined;
  const shape = editor.getShape(anchor.shapeId);
  return shape?.type === CANVAS_FILE_SHAPE_TYPE ? (shape as CanvasFileShape) : undefined;
}

/** The records of one board, as they go into Git: no page id, no tombstones, sorted by id. */
export function commentsFileFor(records: TLCommentRecord[]): CommentsFile {
  // Soft-deletes are left for a sync server to prune, and there is no server — so a delete drops
  // the record from the file here, and the next load takes it out of the store.
  const threads = new Set(
    records.filter((r) => r.typeName === "comment-thread" && !r.isDeleted).map((r) => r.id),
  );
  const comments = new Set(
    records
      .filter((r) => r.typeName === "comment" && !r.isDeleted && threads.has(r.threadId))
      .map((r) => r.id),
  );
  const kept = records.filter((record) => {
    if (record.typeName === "comment-thread") return threads.has(record.id);
    if (record.typeName === "comment") return comments.has(record.id);
    return comments.has(record.commentId);
  });

  const named: Record<string, CommentAuthor> = {};
  const name = (id: string) => {
    const author = authors.get(id);
    if (author) named[id] = author;
  };
  for (const record of kept) {
    if (record.typeName === "comment-thread") name(record.createdBy);
    else if (record.typeName === "comment") name(record.authorId);
    else name(record.userId);
  }

  return {
    authors: named,
    records: kept
      .map(({ pageId: _pageId, ...rest }) => rest as FileCommentRecord)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  };
}

/** Slug -> page id for every page a board folder backs. */
function boardPages(editor: Editor) {
  const bySlug = new Map<string, TLPageId>();
  for (const page of editor.getPages()) {
    const slug = page.meta.canvasSlug as string | undefined;
    if (slug) bySlug.set(slug, page.id);
  }
  return bySlug;
}

/**
 * Load the folders' comments over whatever this browser had, wire the store back to them, and
 * attach new pins to the board beside them.
 *
 * The file wins on load, unconditionally: comment records are document records, so IndexedDB
 * persisted them alongside the shapes, and without this a thread someone deleted in Git would
 * come back on every machine that had already seen it. Returns a disposer, like the other
 * installers in App.tsx.
 */
export function installCanvasComments(editor: Editor) {
  const pageIds = boardPages(editor);

  const wanted: TLCommentRecord[] = [];
  for (const [slug, file] of Object.entries(rawComments)) {
    const pageId = pageIds.get(slug);
    // A folder the canvas is not showing keeps its comments in its file, untouched, rather than
    // having them deleted by a canvas that cannot see them.
    if (!pageId) continue;
    for (const record of file.records ?? []) {
      wanted.push({ ...record, pageId } as unknown as TLCommentRecord);
    }
  }
  const wantedIds = new Set(wanted.map((record) => record.id));
  const managed = new Set(pageIds.values());
  const stale = allComments(editor)
    .filter((record) => !wantedIds.has(record.id) && managed.has(record.pageId))
    .map((record) => record.id);

  // As a remote change: this is not the user's own edit, it does not belong on their undo stack,
  // and the listener below ignores it — so loading the file does not write it straight back.
  editor.store.mergeRemoteChanges(() => {
    if (stale.length) editor.store.remove(stale as unknown as TLRecord["id"][]);
    if (wanted.length) editor.store.put(wanted as unknown as TLRecord[]);
  });

  const bodies = () => {
    const slugs = new Map<TLPageId, string>();
    // Every board gets an entry, empty ones included: a board whose last comment was deleted
    // still has to be written, or its file would keep the comments that were just removed.
    const out = new Map<string, TLCommentRecord[]>();
    for (const [slug, pageId] of pageIds) {
      slugs.set(pageId, slug);
      out.set(slug, []);
    }
    for (const record of allComments(editor)) {
      const slug = slugs.get(record.pageId);
      if (slug) out.get(slug)!.push(record);
    }
    return new Map(
      [...out].map(([slug, records]) => {
        const file = commentsFileFor(records);
        return [slug, file.records.length ? JSON.stringify(file) : ""];
      }),
    );
  };

  // What is on disk already, so the first real edit only writes the board it touched.
  const written = bodies();

  let pending: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    pending = undefined;
    for (const [slug, body] of bodies()) {
      if (written.get(slug) === body) continue;
      written.set(slug, body);
      void fetch("/__sp/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, file: body ? JSON.parse(body) : null }),
      });
    }
  };

  const dispose = editor.store.listen(
    ({ changes }) => {
      // Placed, not only created: a pin dragged onto a board arrives here as an update, and as a
      // bare point just like a new comment does — the comment tool's own hit-test looks straight
      // through the boards, which are locked shapes. Same rule for both, so the same call.
      const placed = [
        ...Object.values(changes.added),
        ...Object.values(changes.updated).map(([, next]) => next),
      ].filter(isComment);
      // In a microtask, not here: this runs inside the store's own change notification, and the
      // re-anchor is another write.
      if (placed.length) queueMicrotask(() => anchorToNearbyBoard(editor, placed));
      const touched = placed.length > 0 || Object.values(changes.removed).some(isComment);
      if (!touched) return;
      // Debounced: posting a comment is several records in one batch, and an edit is one write
      // per keystroke. Half a second is well under the time it takes to notice a change.
      clearTimeout(pending);
      pending = setTimeout(flush, 500);
    },
    { source: "user", scope: "document" },
  );

  // The same rule, over what the files already hold: a note written before its board existed —
  // or from a tab predating this — is linked on the next load rather than left pinned to a page
  // coordinate the next layout.json edit would strand it at. Threads already anchored to a shape,
  // and ones dropped out in open canvas, are left exactly as they are.
  anchorToNearbyBoard(editor, wanted);

  return () => {
    dispose();
    clearTimeout(pending);
  };
}
