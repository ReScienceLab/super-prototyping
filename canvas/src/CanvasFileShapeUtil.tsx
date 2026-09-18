import { useContext, useMemo, type CSSProperties } from "react";
import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type RecordProps,
  type TLShape,
  useIsEditing,
} from "tldraw";
import { CanvasChromeContext } from "./canvasChrome";
import {
  CANVAS_FILE_DEFAULT_SIZE,
  hasCanvasFile,
  useCanvasFileHtml,
} from "./canvasLibrary";
import { injectAgent } from "./inspectorAgent";

export const CANVAS_FILE_SHAPE_TYPE = "canvas-file" as const;

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    [CANVAS_FILE_SHAPE_TYPE]: {
      w: number;
      h: number;
      name: string;
      path: string;
    };
  }
}

export type CanvasFileShape = TLShape<typeof CANVAS_FILE_SHAPE_TYPE>;

// oxlint-disable-next-line react/only-export-components
function CanvasFile({ shape }: { shape: CanvasFileShape }) {
  const isEditing = useIsEditing(shape.id);
  const { inspectingPath, setInspectorFrame } = useContext(CanvasChromeContext);
  const html = useCanvasFileHtml(shape.props.path);

  /**
   * The board the inspector has open runs the agent (inspectorAgent.ts), so a click on the mockup
   * out here picks the element under it. The panel used to load a second copy of the board to do
   * that, which meant reading one mockup and clicking another.
   *
   * The frame still never takes the pointer: inspectorClicks.ts hands the agent the canvas's own
   * pointer as a board coordinate, so panning, zooming and the comment tool go on working over
   * the board being read.
   */
  const inspected = inspectingPath === shape.props.path;
  const agentDoc = useMemo(
    () => (html && inspected ? injectAgent(html) : null),
    [html, inspected],
  );

  // Behind the container, which is transparent, so the frames show through it. Safari routes a
  // wheel to an iframe's own scrolling area whatever pointer-events says, so a two-finger pan
  // over a board did nothing there, and a horizontal one chained out to the browser's back
  // gesture. Behind the container neither frame is a scroll target, and the pan reaches tldraw
  // wherever the cursor is. tldraw's own embed shape carries this same line:
  // <https://stackoverflow.com/a/49150908>.
  const frame: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    border: 0,
    display: "block",
    pointerEvents: isEditing ? "auto" : "none",
    /**
     * A frame paints an opaque base background under the document it loads whenever the frame
     * element's colour scheme and the document's differ (CSS Color Adjust calls it a colour
     * scheme mismatch). The canvas is dark (tokens.css) and the element inherits that; a board
     * declares no scheme and is light. That mismatch was the white card under every board.
     * Saying `light` here matches the board, and the canvas shows through wherever the board
     * paints nothing, whatever colour the canvas is. Measured in Chrome 153: `light` and
     * `normal` on the element composite transparent, `dark` and no rule paint #FFFFFF. On the
     * element and not in the document, so nothing is written into a board's markup and its own
     * text and control colours stand (docs/2026-09-17-canvas-geist.md).
     */
    colorScheme: "light",
  };

  return (
    <HTMLContainer
      style={{
        width: shape.props.w,
        height: shape.props.h,
        overflow: "hidden",
        // Transparent, so a board that declares no background of its own shows the canvas
        // through rather than a colour picked here. Boards that want a ground paint one.
        background: "transparent",
      }}
    >
      {html ? (
        <>
          <iframe
            title={shape.props.name}
            srcDoc={html}
            sandbox=""
            style={{ ...frame, zIndex: isEditing ? undefined : -2 }}
          />
          {/* The scripted board is a second document: srcdoc cannot be swapped on the frame above
              (Chrome drops the second navigation while the first is still pending and leaves the
              frame blank), and remounting it reloaded the mockup under the very click that opened
              it, which is the flash. It loads over the board instead, pixel for pixel the same
              one, so the swap is invisible — and the board underneath stays loaded, so closing
              the inspector shows nothing either. */}
          {agentDoc ? (
            <iframe
              ref={(el) => {
                setInspectorFrame(el);
                return () => setInspectorFrame(null);
              }}
              title={shape.props.name}
              srcDoc={agentDoc}
              // `allow-scripts` and deliberately not `allow-same-origin`, which together would let
              // the frame reach back out into the canvas.
              sandbox="allow-scripts"
              // The agent answers with its report; the frame's own load event may have fired
              // before the panel was listening.
              onLoad={(e) =>
                e.currentTarget.contentWindow?.postMessage(
                  { type: "sp:hello" },
                  "*",
                )
              }
              style={{ ...frame, zIndex: isEditing ? undefined : -1 }}
            />
          ) : null}
        </>
      ) : hasCanvasFile(shape.props.path) ? null : (
        // A board that exists but is not in yet renders nothing, so the frame fills in when its
        // chunk arrives rather than flashing an error first.
        <div
          style={{
            padding: 16,
            font: "13px var(--sp-sans)",
            color: "var(--ds-red-900)",
          }}
        >
          Missing source: {shape.props.path}
        </div>
      )}
    </HTMLContainer>
  );
}

export class CanvasFileShapeUtil extends BaseBoxShapeUtil<CanvasFileShape> {
  static override type = CANVAS_FILE_SHAPE_TYPE;
  static override props: RecordProps<CanvasFileShape> = {
    w: T.number,
    h: T.number,
    name: T.string,
    path: T.string,
  };

  override getDefaultProps(): CanvasFileShape["props"] {
    return { ...CANVAS_FILE_DEFAULT_SIZE, name: "Untitled", path: "" };
  }

  override canEdit() {
    return true;
  }

  override canResize() {
    return true;
  }

  override component(shape: CanvasFileShape) {
    return <CanvasFile shape={shape} />;
  }

  override getIndicatorPath(shape: CanvasFileShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }

  override getText(shape: CanvasFileShape) {
    return shape.props.name;
  }
}
