import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type RecordProps,
  type TLShape,
  useIsEditing,
} from "tldraw";
import {
  CANVAS_FILE_DEFAULT_SIZE,
  hasCanvasFile,
  useCanvasFileHtml,
} from "./canvasLibrary";

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
  const html = useCanvasFileHtml(shape.props.path);

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
        <iframe
          title={shape.props.name}
          srcDoc={html}
          sandbox=""
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            display: "block",
            pointerEvents: isEditing ? "auto" : "none",
            // Safari routes a wheel to an iframe's own scrolling area whatever pointer-events
            // says, so a two-finger pan over a board did nothing there, and a horizontal one
            // chained out to the browser's back gesture. Behind its container it is not a scroll
            // target, and the pan reaches tldraw wherever the cursor is. tldraw's own embed shape
            // carries this same line: <https://stackoverflow.com/a/49150908>.
            zIndex: isEditing ? undefined : -1,
          }}
        />
      ) : hasCanvasFile(shape.props.path) ? null : (
        // A board that exists but is not in yet renders nothing, so the frame fills in when its
        // chunk arrives rather than flashing an error first.
        <div style={{ padding: 16, font: "13px sans-serif", color: "#a33" }}>
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
