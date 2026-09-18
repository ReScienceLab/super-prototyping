import { useContext, useEffect, useRef, useState } from "react";
import {
  useEditor,
  usePassThroughWheelEvents,
  useValue,
  type TLEventInfo,
  type TLImageShape,
} from "tldraw";
import { CanvasChromeContext } from "./canvasChrome";
import {
  CANVAS_FILE_SHAPE_TYPE,
  type CanvasFileShape,
} from "./CanvasFileShapeUtil";
import { canvasBoardRef } from "./canvasLibrary";
import { Plus } from "./geistIcons";
import {
  asCanvasTarget,
  shapeUnderPointer,
  type InspectorTarget,
} from "./inspectorClicks";

/**
 * What the canvas hands the chat panel when the button is pressed: a picture to attach to the
 * message, or the reason none was. A board comes over as a picture too — the file's own name is
 * what says which board it is, and the panel shows it under the tile.
 *
 * On `window`, because the panel is a sibling of `<Tldraw>` and this renders inside it — the same
 * arrangement, and the same answer, as ASK_COMMENT_USER (canvasChrome.tsx).
 */
export const CANVAS_ATTACH = "sp:canvas-attach";

export type CanvasAttachDetail =
  { kind: "image"; file: File } | { kind: "error"; message: string };

/** A board, and the `<slug>/<file>.html` the server and the agent know it as. */
interface Board {
  shape: CanvasFileShape;
  path: string;
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
  const chrome = useContext(CanvasChromeContext);
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

  if (!target || !corner) return null;
  // The path a board's shape carries is the module path the generated index keys it by; the
  // server, the layout and the agent all know it as <slug>/<file>.html (canvasLibrary.ts).
  const ref =
    target.type === CANVAS_FILE_SHAPE_TYPE
      ? canvasBoardRef(target.props.path)
      : undefined;
  const board: Board | null = ref
    ? { shape: target as CanvasFileShape, path: `${ref.slug}/${ref.file}` }
    : null;

  const hand = (detail: CanvasAttachDetail) => {
    // A message cannot be written into a panel that is shut.
    if (chrome.chatCollapsed) chrome.toggleChat();
    window.dispatchEvent(new CustomEvent(CANVAS_ATTACH, { detail }));
  };

  const failed = (error: unknown) =>
    hand({ kind: "error", message: String(error) });

  /**
   * A board as a picture. It is a page in an `<iframe>`, so the server is what can draw it.
   *
   * The picture keeps the board's own path for a name: the panel shows that under the tile and
   * hands it to the agent beside the picture's number, so naming it for the board is how the
   * message says which mockup this is without a word being typed.
   */
  const shoot = async ({ shape, path }: Board) => {
    pinned.current = true;
    setShooting(true);
    try {
      const shot = await fetch(
        `/__sp/shoot?path=${encodeURIComponent(path)}` +
          `&w=${Math.round(shape.props.w)}&h=${Math.round(shape.props.h)}`,
      );
      if (!shot.ok) throw new Error(await shot.text());
      const png = await shot.blob();
      hand({ kind: "image", file: new File([png], path, { type: png.type }) });
    } catch (error) {
      failed(error);
    } finally {
      pinned.current = false;
      setShooting(false);
    }
  };

  /** A picture already on the canvas, read back out of the asset the shape points at. */
  const attachImage = async (shape: TLImageShape) => {
    const asset = shape.props.assetId
      ? editor.getAsset(shape.props.assetId)
      : undefined;
    if (asset?.type !== "image" || !asset.props.src) {
      return failed("that picture has no file behind it");
    }
    try {
      const bytes = await (await fetch(asset.props.src)).blob();
      hand({
        kind: "image",
        file: new File([bytes], asset.props.name || "image.png", {
          type: bytes.type,
        }),
      });
    } catch (error) {
      failed(error);
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
        onClick={() =>
          board ? void shoot(board) : void attachImage(target as TLImageShape)
        }
      >
        {shooting ? <span className="sp-chat-spin" /> : <Plus />}
      </button>
    </div>
  );
}
