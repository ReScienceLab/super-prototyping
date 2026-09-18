import type { Editor, TLEventInfo, TLImageShape, TLShape } from "tldraw";
import {
  CANVAS_FILE_SHAPE_TYPE,
  type CanvasFileShape,
} from "./CanvasFileShapeUtil";
import { canvasImageRef } from "./canvasLibrary";

/**
 * What a click on the canvas can open: a board, or a piece of brand material, which the library
 * lays out as an ordinary tldraw image shape rather than as a board (App.tsx, layoutImageRow).
 */
export type InspectorTarget = CanvasFileShape | TLImageShape;

/**
 * The topmost shape under the pointer, whatever it is. It must *be* a board or a brand image for
 * the canvas to answer for it (asCanvasTarget below); a `filter` here instead would search past
 * anything drawn over one, so every click on an unlocked note or arrow sitting on a board would
 * also open the inspector and squeeze the canvas out from under the thing being edited.
 */
export const shapeUnderPointer = (editor: Editor) =>
  editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint(), {
    hitInside: true,
    hitLocked: true,
    renderingOnly: true,
  });

/** That shape when it is one the canvas answers for, and nothing when it is not. */
export const asCanvasTarget = (
  hit: TLShape | undefined,
): InspectorTarget | undefined => {
  if (hit?.type === CANVAS_FILE_SHAPE_TYPE) return hit as CanvasFileShape;
  // An image the library placed, not one someone dropped on the canvas themselves: only the
  // first has an entry in layout.json behind it for the panel to read.
  return hit?.type === "image" && canvasImageRef(hit.id)
    ? (hit as TLImageShape)
    : undefined;
};

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
  onPick: (shape: InspectorTarget) => void,
  /** A click on the canvas itself, which closes the inspector the way it clears a selection. */
  onDismiss: () => void,
  /** The board the inspector has open, by path: the one mockup that answers the pointer. */
  inspectingPath: string | null,
  /** That board's frame out on the canvas, filled in by CanvasFileShapeUtil. */
  frame: { current: HTMLIFrameElement | null },
) {
  /**
   * Hands the agent the pointer in the inspected board's own pixels. Anywhere else on the canvas
   * is (-1, -1): it hits nothing, which is how the highlight clears when the pointer leaves.
   */
  const sendPointer = (target: InspectorTarget | undefined, click: boolean) => {
    const board =
      target?.type === CANVAS_FILE_SHAPE_TYPE &&
      target.props.path === inspectingPath
        ? target
        : undefined;
    const at = board
      ? editor.getPointInShapeSpace(board, editor.inputs.getCurrentPagePoint())
      : { x: -1, y: -1 };
    frame.current?.contentWindow?.postMessage(
      { type: "sp:at", x: at.x, y: at.y, click },
      "*",
    );
  };

  // Wrapped, because "pressed on nothing" and "did not press" are different endings: the first
  // is the click that closes the inspector, the second is a press this handler has no part in.
  let pressed: { hit: TLShape | undefined } | undefined;
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
        sendPointer(
          editor.getCurrentToolId() === "select"
            ? asCanvasTarget(shapeUnderPointer(editor))
            : undefined,
          false,
        );
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
          ? { hit: shapeUnderPointer(editor) }
          : undefined;
      return;
    }
    if (info.name !== "pointer_up") return;
    const press = pressed;
    pressed = undefined;
    if (!press || editor.inputs.getIsDragging()) return;
    const hit = shapeUnderPointer(editor);
    if (hit?.id !== press.hit?.id) return;
    // Nothing under the pointer: a click on the canvas itself, which closes the inspector the
    // same way it clears a selection. Anything else that is not a board or a picture — a note,
    // an arrow, a comment pin — is a thing, so the panel stays where it is.
    if (!hit) return onDismiss();
    const target = asCanvasTarget(hit);
    if (!target) return;
    // A click on the board already open picks the element under it; a click on any other board,
    // or on a brand image, opens that one.
    if (
      target.type === CANVAS_FILE_SHAPE_TYPE &&
      target.props.path === inspectingPath
    ) {
      sendPointer(target, true);
    } else onPick(target);
  };

  editor.on("event", onEvent);
  return () => {
    editor.off("event", onEvent);
  };
}
