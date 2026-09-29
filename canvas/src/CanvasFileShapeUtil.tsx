import { useContext, type CSSProperties } from "react";
import {
  BaseBoxShapeUtil,
  FileHelpers,
  HTMLContainer,
  T,
  type RecordProps,
  type TLShape,
  useEditor,
  useIsEditing,
  useValue,
} from "tldraw";
import { CanvasChromeContext } from "./canvasChrome";
import { local } from "./canvasIndex";
import {
  CANVAS_FILE_DEFAULT_SIZE,
  canvasBoardRef,
  hasCanvasFile,
  useCanvasFileHtml,
} from "./canvasLibrary";
import { injectAgent } from "./inspectorAgent";

export const CANVAS_FILE_SHAPE_TYPE = "canvas-file" as const;

/**
 * Outlines the element under the canvas's pointer, which installBoardHover (canvasClicks.ts)
 * posts in board px as `sp:at`; a point off the board is (-1, -1) and clears it. A path is its
 * icon's, so an svg outlines whole. ES5, since it runs in whatever the board is.
 */
const HOVER =
  "<script>(function(){var d=document.createElement('div');" +
  "d.style.cssText='position:fixed;pointer-events:none;z-index:2147483647;display:none;box-sizing:border-box;box-shadow:0 0 0 1px #006EFE';" +
  "document.documentElement.appendChild(d);" +
  "addEventListener('message',function(e){var m=e.data;if(!m||m.type!=='sp:at')return;" +
  "var el=document.elementFromPoint(m.x,m.y);if(el&&el.closest&&el.closest('svg'))el=el.closest('svg');" +
  "if(!el||el===document.body||el===document.documentElement){d.style.display='none';return;}" +
  "var r=el.getBoundingClientRect(),s=d.style;s.display='block';s.left=r.left+'px';s.top=r.top+'px';s.width=r.width+'px';s.height=r.height+'px';});" +
  "})();</" +
  "script>";

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
  const html = useCanvasFileHtml(shape.props.path);
  const { inspectorOn, setInspectorFrame } = useContext(CanvasChromeContext);
  const editor = useEditor();
  const selected = useValue(
    "board selected",
    () => editor.getOnlySelectedShapeId() === shape.id,
    [editor, shape.id],
  );

  // Behind the container, which is transparent, so the frame shows through it. Safari routes a
  // wheel to an iframe's own scrolling area whatever pointer-events says, so a two-finger pan
  // over a board did nothing there, and a horizontal one chained out to the browser's back
  // gesture. Behind the container the frame is no scroll target, and the pan reaches tldraw
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
    // The board's own scheme, so the frame composites transparent rather than painting the
    // white backdrop a frame gets under a document whose scheme differs from its element's.
    // On the element, so nothing is written into the board. Measured in
    // docs/2026-09-17-canvas-geist.md.
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
          {/* The selected board outlines the element under the pointer: with the inspector on it
              runs the inspect agent (inspectorAgent.ts), which also picks the element clicked and
              reports the board to the panel, and otherwise only HOVER. It loads over the board
              rather than into its frame: Chrome drops a second srcdoc navigation while the first
              is pending and leaves the frame blank, and a remount reloads the mockup under the
              click that selected it. Pixel for pixel the same board, so the swap is invisible.
              `allow-scripts` and deliberately not `allow-same-origin`, which together would let
              the board reach back out into the canvas. */}
          {selected && inspectorOn ? (
            <iframe
              ref={(el) => {
                setInspectorFrame(el);
                return () => setInspectorFrame(null);
              }}
              title={shape.props.name}
              srcDoc={injectAgent(html)}
              sandbox="allow-scripts"
              data-sp-hover={shape.id}
              // The agent answers with its report; the frame's own load event may have fired
              // before the panel was listening.
              onLoad={(e) =>
                e.currentTarget.contentWindow?.postMessage({ type: "sp:hello" }, "*")
              }
              style={{ ...frame, zIndex: isEditing ? undefined : -1 }}
            />
          ) : selected ? (
            <iframe
              title={shape.props.name}
              srcDoc={
                /<\/body>/i.test(html)
                  ? html.replace(/<\/body>/i, (tag) => HOVER + tag)
                  : html + HOVER
              }
              sandbox="allow-scripts"
              data-sp-hover={shape.id}
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

  // An export leaves an iframe blank, so the server draws the board (canvasAttach.tsx does the
  // same), for `sp canvas shot` and the person's own export alike, a community project's in the app
  // included. The hosted build has no server.
  // One that cannot be drawn is left out rather than thrown: tldraw waits on every shape's toSvg
  // together, so a throw would blank the whole export (App.tsx has its wait).
  override async toSvg(shape: CanvasFileShape) {
    const ref = canvasBoardRef(shape.props.path);
    if (!ref || !local()) return null;
    const { w, h } = shape.props;
    // The server draws at most 4000 a side; a board resized past that is drawn smaller, evenly.
    // ponytail: smaller is a narrower viewport, so a board that lays out by width may reflow.
    const scale = Math.min(1, 4000 / Math.max(w, h));
    const res = await fetch(
      `${import.meta.env.BASE_URL}__sp/shoot?path=${encodeURIComponent(`${ref.slug}/${ref.file}`)}` +
        `&w=${Math.max(1, Math.round(w * scale))}&h=${Math.max(1, Math.round(h * scale))}`,
    );
    if (!res.ok) {
      console.warn(`${ref.slug}/${ref.file} could not be drawn: ${await res.text()}`);
      return null;
    }
    const href = await FileHelpers.blobToDataUrl(await res.blob());
    return <image href={href} width={w} height={h} />;
  }
}
