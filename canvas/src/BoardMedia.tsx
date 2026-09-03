// oxlint-disable react/only-export-components -- the rule, its hook and the component that draws
// the answer are one thing; splitting them across files would only hide that.
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { type TLShapeId, useEditor, useIsEditing, useValue } from "tldraw";
import { THUMB_SCALE, useCanvasFileHtml } from "./canvasLibrary";

/**
 * Whether a board is drawn as its live document or as its thumbnail. This is tldraw's own
 * level-of-detail rule for images (a smaller copy while the shape is small on screen) applied
 * to a board, and it is what keeps opening a page from parsing thirty documents at once:
 * zoomToFit puts every board in view, so viewport culling alone cannot help there.
 *
 * - No thumbnail, or the board is being edited: live. Editing needs the real document.
 * - Camera moving: whatever it was. Documents mount and unmount when the gesture ends, never
 *   during it, and a live board panned across the screen does not flash to its thumbnail.
 * - Culled (off screen): thumbnail. tldraw hides a culled shape but keeps it mounted, so this
 *   is what keeps a board that scrolled away from holding a document.
 * - Otherwise live once the board is drawn larger than its thumbnail, `zoom` (screen px per
 *   board px) at THUMB_SCALE. Below that the thumbnail is downsampled and the document adds
 *   nothing the eye can see.
 */
export function boardIsLive(s: {
  hasThumb: boolean;
  isEditing: boolean;
  moving: boolean;
  culled: boolean;
  zoom: number;
  wasLive: boolean;
}) {
  if (!s.hasThumb || s.isEditing) return true;
  if (s.moving) return s.wasLive;
  return !s.culled && s.zoom >= THUMB_SCALE;
}

/**
 * boardIsLive on the editor's signals, so the shape re-renders only when the answer changes.
 * `scale` is what the board is drawn at inside the shape: 1 for a board, the cover's fit for a
 * welcome card.
 */
export function useBoardLive(shapeId: TLShapeId, scale: number, hasThumb: boolean) {
  const editor = useEditor();
  const isEditing = useIsEditing(shapeId);
  const wasLive = useRef(false);
  return useValue(
    "board live",
    () => {
      const live = boardIsLive({
        hasThumb,
        isEditing,
        moving: editor.getCameraState() === "moving",
        culled: editor.getCulledShapes().has(shapeId),
        zoom: editor.getEfficientZoomLevel() * scale,
        wasLive: wasLive.current,
      });
      wasLive.current = live;
      return live;
    },
    [editor, shapeId, scale, hasThumb, isEditing],
  );
}

/**
 * A board as a shape draws it: the thumbnail, then the document once `live`. The thumbnail stays
 * under the iframe until the document has loaded, so the swap never shows the frame empty.
 * `style` is the box both are drawn in, so they land on the same pixels.
 */
export function BoardMedia({
  path,
  thumb,
  title,
  live,
  style,
}: {
  path: string;
  thumb: string | undefined;
  title: string;
  live: boolean;
  style: CSSProperties;
}) {
  const html = useCanvasFileHtml(live ? path : undefined);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!live) setLoaded(false);
  }, [live]);
  return (
    <>
      {thumb && !(live && loaded) ? (
        <img src={thumb} alt="" draggable={false} style={style} />
      ) : null}
      {live && html ? (
        <iframe
          title={title}
          srcDoc={html}
          sandbox=""
          onLoad={() => setLoaded(true)}
          style={style}
        />
      ) : null}
    </>
  );
}
