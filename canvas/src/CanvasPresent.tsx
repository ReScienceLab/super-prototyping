import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "tldraw";
import { asCanvasTarget, type CanvasTarget } from "./canvasClicks";
import { CANVAS_FILE_SHAPE_TYPE } from "./CanvasFileShapeUtil";
import { useCanvasFileHtml } from "./canvasLibrary";

/** Screen px between a presented board and the window's edge. */
const INSET = 32;

/**
 * Space on a selected board or picture shows it alone over the whole window, as Quick Look does:
 * black round the board, which is scaled to fit it. Space again, or Esc, comes back to the canvas
 * as it was. Inside the window rather than the browser's full screen, which on a Mac moves the
 * window to a display of its own and back, slowly.
 *
 * In the window's document, not the canvas frame's, so it covers the tab bar and the chat as well
 * (the window loads the same stylesheet, shell.tsx). Taken from tldraw on the key going down, so
 * with one of them selected Space is this and not the hand. Heard in both documents: clicking the
 * shown board moves the focus out of the frame.
 */
export function CanvasPresent({ editor }: { editor: Editor | null }) {
  const [shown, setShown] = useState<CanvasTarget>();
  const top = window.top!;
  const [view, setView] = useState({ w: top.innerWidth, h: top.innerHeight });

  useEffect(() => {
    if (!editor) return;
    const onDown = (e: KeyboardEvent) => {
      if (shown) {
        if (e.code !== "Space" && e.key !== "Escape") return;
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return;
        setShown(undefined);
        editor.focus();
        return;
      }
      if (e.code !== "Space" || e.repeat) return;
      const typing =
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA");
      if (typing || editor.getEditingShapeId()) return;
      const selected = editor.getSelectedShapes();
      const target = selected.length === 1 && asCanvasTarget(selected[0]);
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      setShown(target);
    };
    const resized = () => setView({ w: top.innerWidth, h: top.innerHeight });
    const windows = top === window ? [window] : [window, top];
    for (const w of windows) w.addEventListener("keydown", onDown, true);
    top.addEventListener("resize", resized);
    return () => {
      for (const w of windows) w.removeEventListener("keydown", onDown, true);
      top.removeEventListener("resize", resized);
    };
  }, [editor, shown, top]);

  if (!editor || !shown) return null;
  return createPortal(
    <div className="sp-present">
      <Presented editor={editor} shape={shown} view={view} />
    </div>,
    top.document.body,
  );
}

function Presented({
  editor,
  shape,
  view,
}: {
  editor: Editor;
  shape: CanvasTarget;
  view: { w: number; h: number };
}) {
  const board = shape.type === CANVAS_FILE_SHAPE_TYPE ? shape : undefined;
  const html = useCanvasFileHtml(board?.props.path ?? "");
  const { w, h } = shape.props;
  if (board)
    return (
      <iframe
        title={board.props.name}
        srcDoc={html}
        sandbox=""
        style={{
          width: w,
          height: h,
          scale: String(
            Math.min((view.w - 2 * INSET) / w, (view.h - 2 * INSET) / h),
          ),
        }}
      />
    );
  const src =
    shape.type === "image" && shape.props.assetId
      ? editor.getAsset(shape.props.assetId)?.props.src
      : undefined;
  return src ? <img alt="" src={src} /> : null;
}
