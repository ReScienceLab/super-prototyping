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

/** A board, and the `<slug>/<file>.html` the server and the agent know it as. */
interface Board {
  shape: CanvasFileShape;
  path: string;
}

/** To the agent's panel, which is the window's, outside the canvas's frame (AppShell.tsx). */
const dispatchAttach = (detail: CanvasAttachDetail) =>
  window.parent.dispatchEvent(new CustomEvent(CANVAS_ATTACH, { detail }));

/**
 * A board or a picture, turned into the file the chat attaches. A board is a page in an
 * `<iframe>`, so the server draws it first (`/__sp/shoot`, vite.config.ts) and it goes over under
 * its own `<slug>/<file>.html`; a picture already on the canvas is read back out of the asset its
 * shape points at.
 */
async function attachDetail(
  editor: Editor,
  target: InspectorTarget,
  name: string | undefined,
): Promise<CanvasAttachDetail> {
  if (target.type === CANVAS_FILE_SHAPE_TYPE) {
    const shape = target as CanvasFileShape;
    if (!name) throw new Error("that board has no file behind it");
    const shot = await fetch(
      `${import.meta.env.BASE_URL}__sp/shoot?path=${encodeURIComponent(name)}` +
        `&w=${Math.round(shape.props.w)}&h=${Math.round(shape.props.h)}`,
    );
    if (!shot.ok) throw new Error(await shot.text());
    const png = await shot.blob();
    return { kind: "image", file: new File([png], name, { type: png.type }) };
  }
  const shape = target as TLImageShape;
  const asset = shape.props.assetId
    ? editor.getAsset(shape.props.assetId)
    : undefined;
  if (asset?.type !== "image" || !asset.props.src) {
    throw new Error("that picture has no file behind it");
  }
  const bytes = await (await fetch(asset.props.src)).blob();
  return {
    kind: "image",
    file: new File([bytes], asset.props.name || "image.png", {
      type: bytes.type,
    }),
  };
}

/**
 * A board or a picture, handed to the chat. A board says it is coming before the seconds its
 * drawing takes, synchronously, so its tile and its number are up at once and in the order it
 * was asked for. Shared by the single-shape button below and `attachToChat`.
 */
function attach(editor: Editor, target: InspectorTarget) {
  const ref =
    target.type === CANVAS_FILE_SHAPE_TYPE
      ? canvasBoardRef(target.props.path)
      : undefined;
  const name = ref && `${ref.slug}/${ref.file}`;
  if (name) dispatchAttach({ kind: "pending", name });
  return attachDetail(editor, target, name).then(dispatchAttach, (error) =>
    dispatchAttach({ kind: "error", message: String(error), name }),
  );
}

/**
 * The boards and pictures a selection's button or pasted links named (spCanvas.attach, App.tsx),
 * handed to the chat the way their **+** would hand them. Every board is drawn at once (the
 * server takes a few at a time); a picture is read in moments and waited for, so each chip still
 * lands where its shape was in the selection.
 */
// oxlint-disable-next-line react/only-export-components
export async function attachToChat(editor: Editor, targets: InspectorTarget[]) {
  const boards: Promise<unknown>[] = [];
  for (const target of targets) {
    const job = attach(editor, target);
    if (target.type === CANVAS_FILE_SHAPE_TYPE) boards.push(job);
    else await job;
  }
  await Promise.all(boards);
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
  const [shooting, setShooting] = useState(false);
  // Drawing a board takes seconds, and the pointer moves on: the hover is pinned while it does,
  // so the button is still there to finish and to say if it failed.
  const pinned = useRef(false);

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
      if (pinned.current) return;
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
    const leave = () => {
      if (!pinned.current) setTarget(null);
    };
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
  const board: Board | null = ref
    ? { shape: target as CanvasFileShape, path: `${ref.slug}/${ref.file}` }
    : null;

  // A board takes seconds to shoot, so the hover is pinned and the button spins while it does; a
  // picture already on the canvas is read back out of its asset, fast enough to need neither.
  const add = async () => {
    if (board) pinned.current = true;
    if (board) setShooting(true);
    try {
      await attach(editor, target);
    } finally {
      pinned.current = false;
      setShooting(false);
    }
  };

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
          board
            ? `Add ${board.path} to the chat`
            : "Attach this picture to the chat"
        }
        disabled={shooting}
        onClick={() => void add()}
      >
        {shooting ? <span className="sp-chat-spin" /> : <Plus />}
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
  const [shooting, setShooting] = useState(false);

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

  const addSelection = async () => {
    const targets = editor
      .getSelectedShapes()
      .map(asCanvasTarget)
      .filter((t): t is InspectorTarget => t !== undefined);
    setShooting(true);
    try {
      await attachToChat(editor, targets);
    } finally {
      setShooting(false);
    }
  };

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
        disabled={shooting}
        onClick={() => void addSelection()}
      >
        {shooting ? <span className="sp-chat-spin" /> : <Plus />}
      </button>
    </div>
  );
}
