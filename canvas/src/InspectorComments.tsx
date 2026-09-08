import { useContext, useMemo, useState } from "react";
import {
  createComment,
  createCommentThread,
  toRichText,
  type Editor,
  type TLComment,
  type TLCommentThread,
  type TLCommentThreadId,
  type TLShapeId,
} from "tldraw";
import {
  deleteComment,
  deleteThread,
  editComment,
  formatRelativeTime,
  putCommentRecords,
  reopenThread,
  resolveThread,
  richTextToPlaintext,
  useCommentThreads,
  useThreadComments,
} from "@tldraw/commenting";
import { ASK_COMMENT_USER, CanvasChromeContext } from "./canvasChrome";
import { resolveAuthor } from "./canvasComments";
import { boardPin, type BoardPin } from "./inspectorModel";

/**
 * The board's comments, in the inspector: the same threads the canvas pins, listed under the
 * preview and drawn on it at the spot they mark. They are the same records either way — one board
 * folder's `comments.json` — so a note written here appears on the canvas and goes into Git with
 * the board, and one written out on the canvas is here when the board is opened.
 *
 * The panel renders outside `<Tldraw>`, so none of this can reach `useEditor` or the toolkit's
 * comment components (they want the UI context for tooltips and translations). The editor arrives
 * through `CanvasChromeContext` instead, and the rest is the panel's own chrome — which is what
 * it should look like anyway, next to the layers list rather than out on the canvas.
 */

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/** A thread on this board, and where it points at it. */
export interface BoardThread {
  thread: TLCommentThread;
  pin: BoardPin;
}

function useBoardThreads(editor: Editor, shapeId: TLShapeId): BoardThread[] {
  const threads = useCommentThreads(editor);
  return useMemo(() => {
    const rows: BoardThread[] = [];
    for (const thread of threads) {
      const pin = boardPin(thread.anchor, shapeId);
      if (pin) rows.push({ thread, pin });
    }
    return rows.sort((a, b) => a.thread.createdAt - b.thread.createdAt);
  }, [threads, shapeId]);
}

/** The author of a thread's first comment, which is who the list calls the thread's. */
const openedBy = (thread: TLCommentThread) => resolveAuthor(thread.createdBy);

const when = (at: number) => formatRelativeTime(new Date(at).toISOString());

/**
 * The pins, over the preview. Positioned in the artboard's own coordinates — the anchor is a
 * fraction of the board, and the board is drawn at its own size — then counter-scaled, so a pin
 * is the same size whether the preview is at 100% or fitted to a third of that.
 */
export function BoardPins({
  editor,
  shapeId,
  scale,
  open,
  onOpen,
}: {
  editor: Editor;
  shapeId: TLShapeId;
  scale: number;
  open: TLCommentThreadId | null;
  onOpen: (id: TLCommentThreadId | null) => void;
}) {
  const rows = useBoardThreads(editor, shapeId);
  return (
    <>
      {rows.map(({ thread, pin }, i) =>
        // A thread anchored beside the board rather than on it is in the list but has no spot on
        // the preview to point at, so it gets no pin.
        pin.inside ? (
          <div
            key={thread.id}
            className="sp-pin-at"
            style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
          >
            <button
              type="button"
              className={cx(
                "sp-pin",
                thread.resolved && "sp-pin--done",
                open === thread.id && "on",
              )}
              style={{ transform: `scale(${1 / scale})` }}
              title={`${openedBy(thread).name}: comment ${i + 1}`}
              onClick={() => onOpen(open === thread.id ? null : thread.id)}
            >
              {i + 1}
            </button>
          </div>
        ) : null,
      )}
    </>
  );
}

/** The strip under the preview: every thread on this board, and the field for a new one. */
export function BoardComments({
  editor,
  shapeId,
  open,
  onOpen,
  pinAt,
}: {
  editor: Editor;
  shapeId: TLShapeId;
  open: TLCommentThreadId | null;
  onOpen: (id: TLCommentThreadId | null) => void;
  /** Where a comment written here is pinned: the selected layer's middle, or the board's. */
  pinAt: { x: number; y: number };
}) {
  const me = useContext(CanvasChromeContext).commentUser;
  const rows = useBoardThreads(editor, shapeId);

  const post = (body: string) => {
    // Not the current page: the panel outlives a page change, and a thread on the wrong page
    // would be written into the wrong folder's file.
    const pageId = editor.getAncestorPageId(shapeId);
    if (!me || !pageId) return;
    const thread = createCommentThread({
      pageId,
      anchor: { type: "shape", shapeId, x: pinAt.x, y: pinAt.y, isPrecise: true },
      createdBy: me.id,
    });
    putCommentRecords(editor, [
      thread,
      createComment({ threadId: thread.id, pageId, authorId: me.id, body: toRichText(body) }),
    ]);
    onOpen(thread.id);
  };

  return (
    <section className="sp-notes">
      <div className="sp-sh sp-sh--pad">
        <span className="sp-sh-t">Comments</span>
        <span className="sp-sh-s">{rows.length || ""}</span>
      </div>
      <div className="sp-notes-list">
        {rows.length ? (
          rows.map((row, i) => (
            <Thread
              key={row.thread.id}
              editor={editor}
              row={row}
              n={i + 1}
              open={open === row.thread.id}
              onOpen={onOpen}
            />
          ))
        ) : (
          <div className="sp-empty">No comments on this board.</div>
        )}
      </div>
      <Composer
        placeholder={pinAt.x === 0.5 && pinAt.y === 0.5 ? "Comment on this board…" : "Comment on the selected layer…"}
        onPost={post}
      />
    </section>
  );
}

function Thread({
  editor,
  row: { thread, pin },
  n,
  open,
  onOpen,
}: {
  editor: Editor;
  row: BoardThread;
  n: number;
  open: boolean;
  onOpen: (id: TLCommentThreadId | null) => void;
}) {
  const me = useContext(CanvasChromeContext).commentUser;
  const comments = useThreadComments(editor, thread.id);
  const [first, ...replies] = comments;
  const author = openedBy(thread);

  // The last comment takes its thread with it: what would be left is a pin with nothing behind
  // it. Any other one is just a message leaving the conversation.
  const remove = (comment: TLComment) => {
    if (comments.length > 1) return deleteComment(editor, comment);
    onOpen(null);
    deleteThread(editor, thread);
  };

  const reply = (body: string) => {
    if (!me) return;
    putCommentRecords(editor, [
      createComment({
        threadId: thread.id,
        pageId: thread.pageId,
        authorId: me.id,
        body: toRichText(body),
      }),
    ]);
  };

  return (
    <article className={cx("sp-note", open && "on", thread.resolved && "sp-note--done")}>
      <button
        type="button"
        className="sp-note-head"
        aria-expanded={open}
        onClick={() => onOpen(open ? null : thread.id)}
      >
        <span className={cx("sp-note-n", !pin.inside && "sp-note-n--off")}>{n}</span>
        <img className="sp-note-av" src={author.image} alt="" />
        <span className="sp-note-who">{author.name}</span>
        <span className="sp-note-when">{when(thread.createdAt)}</span>
        {replies.length ? <span className="sp-note-count">{replies.length}</span> : null}
      </button>
      {first ? (
        <Comment
          editor={editor}
          comment={first}
          clamp={!open}
          actions={open}
          onDelete={() => remove(first)}
        />
      ) : null}
      {open ? (
        <>
          {replies.map((comment) => (
            <div key={comment.id} className="sp-note-reply">
              <span className="sp-note-who">{resolveAuthor(comment.authorId).name}</span>
              <span className="sp-note-when">{when(comment.createdAt)}</span>
              <Comment
                editor={editor}
                comment={comment}
                clamp={false}
                actions
                onDelete={() => remove(comment)}
              />
            </div>
          ))}
          <div className="sp-note-actions">
            <button
              type="button"
              onClick={() =>
                me && (thread.resolved ? reopenThread(editor, thread) : resolveThread(editor, thread, me.id))
              }
              disabled={!me}
            >
              {thread.resolved ? "Reopen" : "Resolve"}
            </button>
            {/* Deleting is the one thing that takes someone else's words out of Git. */}
            {me?.id === thread.createdBy ? (
              <button
                type="button"
                onClick={() => {
                  onOpen(null);
                  deleteThread(editor, thread);
                }}
              >
                Delete thread
              </button>
            ) : null}
          </div>
          <Composer placeholder="Reply…" onPost={reply} />
        </>
      ) : null}
    </article>
  );
}

/** One comment: its words, and — for whoever wrote them — the two things they can do to them. */
function Comment({
  editor,
  comment,
  clamp,
  actions,
  onDelete,
}: {
  editor: Editor;
  comment: TLComment;
  clamp: boolean;
  /** Only while the thread is open: a collapsed row is a preview, not somewhere to edit. */
  actions: boolean;
  onDelete: () => void;
}) {
  const me = useContext(CanvasChromeContext).commentUser;
  const [editing, setEditing] = useState(false);
  // Plain text in and out, like the composer below: a comment edited here reads the same on the
  // canvas, and one written there flattens to what this panel can show of it.
  const text = richTextToPlaintext(comment.body, (id) => resolveAuthor(id).name);

  if (editing) {
    return (
      <Composer
        placeholder="Edit…"
        initial={text}
        onPost={(body) => {
          setEditing(false);
          editComment(editor, comment, toRichText(body));
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <>
      <p className={cx("sp-note-body", clamp && "sp-note-body--clamp")}>{text}</p>
      {/* Someone else's words are theirs to change, here as on the canvas. */}
      {actions && me?.id === comment.authorId ? (
        <div className="sp-note-actions">
          <button type="button" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button type="button" onClick={onDelete}>
            Delete
          </button>
        </div>
      ) : null}
    </>
  );
}

/**
 * The field. Plain text, because that is what the whole panel is — the canvas composer is a rich
 * text editor, and a note typed here reads the same in both.
 */
function Composer({
  placeholder,
  initial,
  onPost,
  onCancel,
}: {
  placeholder: string;
  /** The text an edit starts from. A new comment has none: it starts empty and clears on post. */
  initial?: string;
  onPost: (body: string) => void;
  onCancel?: () => void;
}) {
  const me = useContext(CanvasChromeContext).commentUser;
  const [text, setText] = useState(initial ?? "");

  const post = () => {
    const body = text.trim();
    if (!body) return;
    if (initial === undefined) setText("");
    onPost(body);
  };

  return (
    <div
      className="sp-note-new"
      // The identity dialog is a tldraw dialog, and those can only be opened from inside
      // <Tldraw>. Asking for one is the first thing a click here does, when there is no name yet.
      onPointerDown={me ? undefined : () => window.dispatchEvent(new Event(ASK_COMMENT_USER))}
    >
      {me ? <img className="sp-note-av" src={me.image} alt="" /> : null}
      <textarea
        rows={1}
        autoFocus={initial !== undefined}
        value={text}
        disabled={!me}
        placeholder={me ? placeholder : "Add your GitHub username to comment"}
        onChange={(event) => setText(event.currentTarget.value)}
        // An edit continues from the end of what is there, rather than in front of it. A click
        // into the field still puts the caret where it was clicked.
        onFocus={(event) => {
          const end = event.currentTarget.value.length;
          event.currentTarget.setSelectionRange(end, end);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            post();
          }
          // Out of the field, rather than through to the panel's own Escape, which would close it.
          if (event.key === "Escape") {
            event.preventDefault();
            if (onCancel) onCancel();
            else event.currentTarget.blur();
          }
        }}
      />
      {text.trim() ? (
        <button type="button" className="sp-note-send" onClick={post}>
          {initial === undefined ? "Post" : "Save"}
        </button>
      ) : null}
    </div>
  );
}
