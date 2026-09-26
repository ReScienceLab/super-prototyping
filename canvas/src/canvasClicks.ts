import type {
  Editor,
  StateNode,
  TLImageShape,
  TLShape,
  TLShapeId,
} from "tldraw";
import {
  CANVAS_FILE_SHAPE_TYPE,
  type CanvasFileShape,
} from "./CanvasFileShapeUtil";
import { canvasImageRef } from "./canvasLibrary";

/**
 * What the canvas answers for as a thing of the project's: a board, or a piece of brand material,
 * which the library lays out as an ordinary tldraw image shape rather than as a board (App.tsx,
 * layoutImageRow).
 */
export type CanvasTarget = CanvasFileShape | TLImageShape;

/**
 * The topmost shape under the pointer, whatever it is, locked ones included. It must *be* a board
 * or a brand image for the canvas to answer for it (asCanvasTarget below); a `filter` here instead
 * would search past anything drawn over one, a note or an arrow sitting on a board.
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
): CanvasTarget | undefined => {
  if (hit?.type === CANVAS_FILE_SHAPE_TYPE) return hit as CanvasFileShape;
  // An image the library placed, not one someone dropped on the canvas themselves: only the
  // first has an entry in layout.json behind it.
  return hit?.type === "image" && canvasImageRef(hit.id)
    ? (hit as TLImageShape)
    : undefined;
};

/** Distance from the viewport's edge to a shape zoomed to fill it, in screen px. */
const FILL_INSET = 16;

/** Selects a shape and puts the camera on it, as large as the viewport holds it. */
export function zoomToFill(editor: Editor, id: TLShapeId, animate = true) {
  const bounds = editor.getShapePageBounds(id);
  if (!bounds) return;
  editor.select(id);
  editor.zoomToBounds(bounds, {
    inset: FILL_INSET,
    animation: { duration: animate ? editor.options.animationMediumMs : 0 },
  });
}

/**
 * A double-click on a mockup, a picture, or anything else whose double-click tldraw would not
 * spend on editing its text zooms it to fill the canvas. tldraw's own double-click would crop a
 * picture or, over a locked shape such as a board, drop a new text box on the canvas, so this takes the gesture over in the select tool's
 * idle state, where tldraw handles it, rather than watching for it alongside. A note, a text or a
 * label still edits its text. Returns the uninstaller.
 */
export function installDoubleClickZoom(editor: Editor) {
  const idle = editor.getStateDescendant<StateNode>("select.idle")!;
  const own = idle.onDoubleClick!;
  idle.onDoubleClick = (info) => {
    const hit = info.phase === "down" && shapeUnderPointer(editor);
    if (
      hit &&
      (hit.type === CANVAS_FILE_SHAPE_TYPE ||
        hit.type === "image" ||
        hit.type === "video" ||
        !editor.canEditShape(hit))
    )
      return zoomToFill(editor, hit.id);
    own.call(idle, info);
  };
  return () => {
    idle.onDoubleClick = own;
  };
}
