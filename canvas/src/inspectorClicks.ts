import type { Editor, TLEventInfo } from "tldraw";
import { CANVAS_FILE_SHAPE_TYPE, type CanvasFileShape } from "./CanvasFileShapeUtil";

/**
 * A locked board cannot be selected, so tldraw reports a click on one as a click on the canvas
 * and the shape util's own `onClick` never runs — the same problem the welcome page's cards have,
 * solved the same way (installLockedLinkClicks in CanvasLinkShapeUtil.tsx): watch the editor's
 * pointer events and call a press and a release over one board, with no drag between them, a
 * click. Returns the uninstaller.
 */
export function installInspectorClicks(
  editor: Editor,
  onPick: (shape: CanvasFileShape) => void,
) {
  const boardUnderPointer = () =>
    editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint(), {
      hitInside: true,
      hitLocked: true,
      renderingOnly: true,
      filter: (shape) => shape.type === CANVAS_FILE_SHAPE_TYPE,
    }) as CanvasFileShape | undefined;

  let pressed: CanvasFileShape | undefined;
  const onEvent = (info: TLEventInfo) => {
    if (info.type !== "pointer") {
      // Two fingers arriving, or a wheel, in the middle of a press: a zoom, not a click.
      if (info.type === "pinch" || info.type === "wheel") pressed = undefined;
      return;
    }
    if (info.name === "pointer_down") {
      // Only the select tool opens the inspector; a click with the pen or the eraser over a
      // board is a stroke or an erase.
      pressed =
        info.button === 0 &&
        editor.getCurrentToolId() === "select" &&
        !editor.menus.hasAnyOpenMenus()
          ? boardUnderPointer()
          : undefined;
      return;
    }
    if (info.name !== "pointer_up") return;
    const target = pressed;
    pressed = undefined;
    if (!target || editor.inputs.getIsDragging()) return;
    if (boardUnderPointer()?.id !== target.id) return;
    onPick(target);
  };

  editor.on("event", onEvent);
  return () => {
    editor.off("event", onEvent);
  };
}
