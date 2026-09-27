import { useEffect, useRef, useState } from "react";
import type { Editor } from "tldraw";
import { asCanvasTarget, type CanvasTarget } from "./canvasClicks";
import { CANVAS_FILE_SHAPE_TYPE } from "./CanvasFileShapeUtil";
import { useCanvasFileHtml } from "./canvasLibrary";

/** Screen px between a presented board and the display's edge. */
const INSET = 32;

/**
 * Space on a selected board or picture shows it alone, full screen, as Quick Look does: the
 * window leaves for the whole display, black round the board, which is scaled to fit it. Space
 * again, or Esc, comes back to the canvas as it was.
 *
 * On the key going down, and taken from tldraw, so with one of them selected Space is this and not
 * the hand. It has to be then: going full screen needs the key's user activation, and by the
 * time the key comes up the canvas has spent it. For the same reason the element that goes full
 * screen is always here, and shows only while it is (index.css): one rendered after the key would
 * be too late.
 */
export function CanvasPresent({ editor }: { editor: Editor | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<CanvasTarget>();
  const [view, setView] = useState({ w: innerWidth, h: innerHeight });

  useEffect(() => {
    if (!editor) return;
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const typing =
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA");
      if (typing || editor.getEditingShapeId()) return;
      const selected = editor.getSelectedShapes();
      const target =
        !document.fullscreenElement &&
        selected.length === 1 &&
        asCanvasTarget(selected[0]);
      if (!document.fullscreenElement && !target) return;
      e.preventDefault();
      e.stopPropagation();
      if (!target) return void document.exitFullscreen();
      setShown(target);
      void box.current!.requestFullscreen();
    };
    const resized = () => setView({ w: innerWidth, h: innerHeight });
    const left = () => !document.fullscreenElement && setShown(undefined);
    addEventListener("keydown", onDown, true);
    addEventListener("resize", resized);
    document.addEventListener("fullscreenchange", left);
    return () => {
      removeEventListener("keydown", onDown, true);
      removeEventListener("resize", resized);
      document.removeEventListener("fullscreenchange", left);
    };
  }, [editor]);

  return (
    <div ref={box} className="sp-present">
      {editor && shown && (
        <Presented editor={editor} shape={shown} view={view} />
      )}
    </div>
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
