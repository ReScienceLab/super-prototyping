import { useEffect, useRef, useState } from "react";
import {
  useEditor,
  usePassThroughWheelEvents,
  useValue,
  type Editor,
  type TLEventInfo,
  type TLImageShape,
} from "tldraw";
import {
  CANVAS_FILE_SHAPE_TYPE,
  type CanvasFileShape,
} from "./CanvasFileShapeUtil";
import { CANVAS_ATTACH, type CanvasAttachDetail } from "./ChatPanel";
import { canvasBoardRef } from "./canvasLibrary";
import { Plus } from "./geistIcons";
import {
  asCanvasTarget,
  shapeUnderPointer,
  type InspectorTarget,
} from "./inspectorClicks";

/** To the agent's panel, which is the window's, outside the canvas's frame (AppShell.tsx). */
const dispatchAttach = (detail: CanvasAttachDetail) =>
  window.parent.dispatchEvent(new CustomEvent(CANVAS_ATTACH, { detail }));

/**
 * A board or a picture, handed to the chat. A board is a page in an `<iframe>`, so the server
 * draws it first (`/__sp/shoot`, server/sp.ts) and it goes over under its own
 * `<slug>/<file>.html`. The panel asks for that drawing itself, from the window, so a canvas that
 * reloads or changes tab while it is being drawn does not take the answer with it; all this frame
 * says is which board, at what size. A picture already on the canvas is read back out of the
 * asset its shape points at.
 */
async function attach(editor: Editor, target: InspectorTarget) {
  try {
    if (target.type === CANVAS_FILE_SHAPE_TYPE) {
      const { w, h, path } = (target as CanvasFileShape).props;
      const ref = canvasBoardRef(path);
      if (!ref) throw new Error("that board has no file behind it");
      const name = `${ref.slug}/${ref.file}`;
      const src = new URL(
        `${import.meta.env.BASE_URL}__sp/shoot?path=${encodeURIComponent(name)}` +
          `&w=${Math.round(w)}&h=${Math.round(h)}`,
        window.location.href,
      ).href;
      return dispatchAttach({ kind: "board", name, src });
    }
    const shape = target as TLImageShape;
    const asset = shape.props.assetId
      ? editor.getAsset(shape.props.assetId)
      : undefined;
    if (asset?.type !== "image" || !asset.props.src) {
      throw new Error("that picture has no file behind it");
    }
    const bytes = await (await fetch(asset.props.src)).blob();
    dispatchAttach({
      kind: "image",
      file: new File([bytes], asset.props.name || "image.png", {
        type: bytes.type,
      }),
    });
  } catch (error) {
    dispatchAttach({ kind: "error", message: String(error) });
  }
}

/**
 * The boards and pictures a selection's button or pasted links named (spCanvas.attach, App.tsx),
 * handed to the chat the way their **+** would hand them, one after another so the chips come in
 * the selection's order. A board is only announced here, so this is over in moments however many
 * there are; the panel draws them side by side (the server takes a few at a time).
 */
// oxlint-disable-next-line react/only-export-components
export async function attachToChat(editor: Editor, targets: InspectorTarget[]) {
  for (const target of targets) await attach(editor, target);
}

/**
 * **+** in a shape's top-right corner while the pointer is over it, which adds that shape to the
 * chat. A picture goes over as itself; a board is a page in an `<iframe>`, so the server draws it
 * first (`/__sp/shoot`, vite.config.ts) and it goes over under its own `<slug>/<file>.html` —
 * the name the panel captions it with and the agent is handed, and the file it can go and open.
 *
 * Screen space, not page space: this renders in `InFrontOfTheCanvas`, so the button is the same
 * size at every zoom, like every other control. It sits inside the shape's corner rather than
 * over its edge, which is what keeps the pointer on the shape while it reaches for it — a
 * button that moved out from under the pointer as it arrived would flicker away.
 */
export function CanvasAttachButtons() {
  const editor = useEditor();
  const [target, setTarget] = useState<InspectorTarget | null>(null);

  // Two fingers on the trackpad over these buttons is still a pan. This layer is a sibling of
  // .tl-canvas rather than a child of it, and the wheel is listened for on the canvas itself, so a
  // wheel that starts here reaches no handler at all and the board sits dead under the pointer.
  // Handing it back is what every control tldraw draws over the canvas does — the toolbar, the
  // minimap, a comment pin — and it steps aside for anything in here that really does scroll.
  const bar = useRef<HTMLDivElement>(null);
  usePassThroughWheelEvents(bar);

  // A selection already has its own "+" for the whole group, at the selection's own corner
  // (CanvasSelectionAttachButton below) — including a selection of one. Hovering the rightmost
  // shape in a multi-selection would otherwise show this one too, at that shape's own corner,
  // a second button beside the group's.
  const hasSelection = useValue(
    "attach buttons selection gate",
    () => editor.getSelectedShapeIds().length > 0,
    [editor],
  );

  useEffect(() => {
    const follow = (info: TLEventInfo) => {
      if (info.type !== "pointer" || info.name !== "pointer_move") return;
      // Reaching for the buttons is not a move to another shape. They are small and a board drawn
      // small is smaller: zoomed out, the bar hangs over the board next door, and following the
      // pointer onto it would carry the bar to that board and out from under the finger pressing
      // it — which lands the press on the canvas instead, and opens the board underneath.
      const view = editor.getViewportScreenBounds();
      const at = editor.inputs.getCurrentScreenPoint();
      if (
        document
          .elementFromPoint(at.x + view.x, at.y + view.y)
          ?.closest(".sp-attach")
      ) {
        return;
      }
      // Under the select tool only, as with the inspector: with the comment tool up a board is
      // something to drop a pin on. Nothing while dragging either, since that is a pan.
      setTarget(
        editor.getCurrentToolId() === "select" &&
          !editor.inputs.getIsDragging() &&
          !editor.menus.hasAnyOpenMenus()
          ? (asCanvasTarget(shapeUnderPointer(editor)) ?? null)
          : null,
      );
    };
    // No pointer_move says the pointer left for the chat panel or the top bar, and buttons left
    // standing on a mockup out here would read as part of it.
    const leave = () => setTarget(null);
    const container = editor.getContainer();
    editor.on("event", follow);
    container.addEventListener("pointerleave", leave);
    return () => {
      editor.off("event", follow);
      container.removeEventListener("pointerleave", leave);
    };
  }, [editor]);

  // The shape's own top-right corner, recomputed by the camera and the shape's bounds themselves:
  // a pan, a zoom or a relayout moves the buttons with the thing they are on. Viewport pixels and
  // not screen pixels, because this is positioned inside the editor's container and the chat panel
  // takes the window's left edge — pageToScreen would count that offset a second time.
  const corner = useValue(
    "attach corner",
    () => {
      const bounds = target && editor.getShapePageBounds(target.id);
      return bounds
        ? editor.pageToViewport({ x: bounds.maxX, y: bounds.minY })
        : null;
    },
    [editor, target],
  );

  if (!target || !corner || hasSelection) return null;
  // The path a board's shape carries is the module path the generated index keys it by; the
  // server, the layout and the agent all know it as <slug>/<file>.html (canvasLibrary.ts).
  const ref =
    target.type === CANVAS_FILE_SHAPE_TYPE
      ? canvasBoardRef(target.props.path)
      : undefined;
  const board = ref && `${ref.slug}/${ref.file}`;

  return (
    <div
      ref={bar}
      className="sp-attach"
      style={{ left: corner.x, top: corner.y }}
    >
      <button
        type="button"
        className="sp-attach-btn"
        aria-label={
          board
            ? "Add this board to the chat"
            : "Attach this picture to the chat"
        }
        title={
          board ? `Add ${board} to the chat` : "Attach this picture to the chat"
        }
        onClick={() => void attach(editor, target)}
      >
        <Plus />
      </button>
    </div>
  );
}

/**
 * **+** in the top-right corner of the current selection's bounding box, once dragging a box
 * around the canvas has settled on one or more boards and pictures — adds every one of them to
 * the chat in a single click, in the order tldraw reports the selection.
 *
 * This is the same button as `CanvasAttachButtons`, anchored to the selection instead of to
 * whatever is under the pointer, because drawing tools are gone from this canvas (canvasChrome.tsx)
 * and a drag on empty canvas is always tldraw's own marquee select.
 */
export function CanvasSelectionAttachButton() {
  const editor = useEditor();

  const bar = useRef<HTMLDivElement>(null);
  usePassThroughWheelEvents(bar);

  const corner = useValue(
    "selection attach corner",
    () => {
      if (
        editor.getCurrentToolId() !== "select" ||
        // Not while the marquee itself is still growing: the button would otherwise chase the
        // drag around the screen, and "once an area is selected" means once it has settled.
        editor.isIn("select.brushing") ||
        editor.menus.hasAnyOpenMenus()
      ) {
        return null;
      }
      const targets = editor
        .getSelectedShapes()
        .map(asCanvasTarget)
        .filter((t): t is InspectorTarget => t !== undefined);
      if (targets.length === 0) return null;
      const bounds = editor.getSelectionPageBounds();
      return bounds
        ? editor.pageToViewport({ x: bounds.maxX, y: bounds.minY })
        : null;
    },
    [editor],
  );

  if (!corner) return null;

  return (
    <div
      ref={bar}
      className="sp-attach"
      style={{ left: corner.x, top: corner.y }}
    >
      <button
        type="button"
        className="sp-attach-btn"
        aria-label="Add the selection to the chat"
        title="Add the selected boards and pictures to the chat"
        onClick={() =>
          void attachToChat(
            editor,
            editor
              .getSelectedShapes()
              .map(asCanvasTarget)
              .filter((t): t is InspectorTarget => t !== undefined),
          )
        }
      >
        <Plus />
      </button>
    </div>
  );
}
