import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "tldraw";
import { asCanvasTarget, type CanvasTarget } from "./canvasClicks";
import { CANVAS_FILE_SHAPE_TYPE } from "./CanvasFileShapeUtil";
import { useCanvasFileHtml } from "./canvasLibrary";

/** Screen px between a presented board and the window's edge. */
const INSET = 32;

/**
 * Space on a selected board or picture shows it alone over the whole window (`Present`), scaled
 * to fit it. Taken from tldraw on the key going down, so with one of them selected Space is this
 * and not the hand.
 */
export function CanvasPresent({ editor }: { editor: Editor | null }) {
  const [shown, setShown] = useState<CanvasTarget>();
  const top = window.top!;
  const [view, setView] = useState({ w: top.innerWidth, h: top.innerHeight });

  useEffect(() => {
    if (!editor || shown) return;
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      // Space on a focused control is that control's: typing, or pressing a button.
      const control =
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          e.target.closest(
            "input, textarea, select, button, a[href], [role=button], [role=menuitem], [role=tab]",
          ));
      if (control || editor.getEditingShapeId()) return;
      const selected = editor.getSelectedShapes();
      const target = selected.length === 1 && asCanvasTarget(selected[0]);
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      setShown(target);
    };
    addEventListener("keydown", onDown, true);
    return () => removeEventListener("keydown", onDown, true);
  }, [editor, shown]);

  useEffect(() => {
    const resized = () => setView({ w: top.innerWidth, h: top.innerHeight });
    top.addEventListener("resize", resized);
    return () => top.removeEventListener("resize", resized);
  }, [top]);

  if (!editor || !shown) return null;
  return (
    <Present
      close={() => {
        setShown(undefined);
        editor.focus();
      }}
    >
      <Presented editor={editor} shape={shown} view={view} />
    </Present>
  );
}

/**
 * Something shown alone over the whole window, the window dimmed round it: a board or picture
 * from the canvas, or a picture in the chat. Space, Esc or a click anywhere comes back to where
 * it was. Inside the window rather than the browser's full screen, which on a Mac moves the window
 * to a display of its own and back, slowly.
 *
 * In the window's document, not the canvas frame's, so it covers the tab bar and the chat as well
 * (the window loads the same stylesheet, shell.tsx). The keys are heard in both documents: the
 * focus can be in either.
 */
export function Present({
  close,
  children,
}: {
  close: () => void;
  children: ReactNode;
}) {
  const top = window.top!;
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) close();
    };
    const windows = top === window ? [window] : [window, top];
    for (const w of windows) w.addEventListener("keydown", onDown, true);
    return () => {
      for (const w of windows) w.removeEventListener("keydown", onDown, true);
    };
  }, [close, top]);
  return createPortal(
    <div
      className="sp-present"
      onClick={close}
    >
      {children}
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
