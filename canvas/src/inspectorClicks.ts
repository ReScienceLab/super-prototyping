import type { Editor, TLEventInfo } from "tldraw";
import { CANVAS_FILE_SHAPE_TYPE, type CanvasFileShape } from "./CanvasFileShapeUtil";

/**
 * A locked board cannot be selected, so tldraw reports a click on one as a click on the canvas
 * and the shape util's own `onClick` never runs — the same problem the welcome page's cards have,
 * solved the same way (installLockedLinkClicks in CanvasLinkShapeUtil.tsx): watch the editor's
 * pointer events and call a press and a release over one board, with no drag between them, a
 * click. Returns the uninstaller.
 *
 * The board the inspector has open takes its hovers and picks from here too, rather than by
 * holding the pointer itself. A frame that took the pointer would be the one thing on the canvas
 * that could not be panned across or zoomed over — the wheel never reached tldraw, so a zoom
 * gesture over the mockup zoomed the browser page. The canvas keeps every gesture, and the
 * pointer goes into the board as a board coordinate for the agent to hit-test (`sp:at`).
 */
export function installInspectorClicks(
  editor: Editor,
  onPick: (shape: CanvasFileShape) => void,
  /** The board the inspector has open, by path: the one mockup that answers the pointer. */
  inspectingPath: string | null,
  /** That board's frame out on the canvas, filled in by CanvasFileShapeUtil. */
  frame: { current: HTMLIFrameElement | null },
) {
  /**
   * The topmost shape must *be* a board. A `filter` here instead would search past anything drawn
   * over one, so every click on an unlocked note or arrow sitting on a board would also open the
   * inspector and squeeze the canvas out from under the thing being edited.
   */
  const boardUnderPointer = () => {
    const hit = editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint(), {
      hitInside: true,
      hitLocked: true,
      renderingOnly: true,
    });
    return hit?.type === CANVAS_FILE_SHAPE_TYPE ? (hit as CanvasFileShape) : undefined;
  };

  /**
   * Hands the agent the pointer in the inspected board's own pixels. Anywhere else on the canvas
   * is (-1, -1): it hits nothing, which is how the highlight clears when the pointer leaves.
   */
  const sendPointer = (board: CanvasFileShape | undefined, click: boolean) => {
    const at =
      board?.props.path === inspectingPath
        ? editor.getPointInShapeSpace(board, editor.inputs.getCurrentPagePoint())
        : { x: -1, y: -1 };
    frame.current?.contentWindow?.postMessage({ type: "sp:at", x: at.x, y: at.y, click }, "*");
  };

  let pressed: CanvasFileShape | undefined;
  const onEvent = (info: TLEventInfo) => {
    if (info.type !== "pointer") {
      // Two fingers arriving, or a wheel, in the middle of a press: a zoom, not a click.
      if (info.type === "pinch" || info.type === "wheel") pressed = undefined;
      return;
    }
    if (info.name === "pointer_move") {
      // Hover follows the canvas pointer, as in Figma: the agent outlines what is under it and
      // names it back for the layers list. Under the select tool only — with the comment tool up
      // the board is something to drop a pin on, not something to read.
      if (inspectingPath) {
        sendPointer(editor.getCurrentToolId() === "select" ? boardUnderPointer() : undefined, false);
      }
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
    // A click on the board already open picks the element under it; a click on any other board
    // opens that one.
    if (target.props.path === inspectingPath) sendPointer(target, true);
    else onPick(target);
  };

  editor.on("event", onEvent);
  return () => {
    editor.off("event", onEvent);
  };
}
