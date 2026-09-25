import {
  SelectionForegroundOverlayUtil,
  ShapeIndicatorOverlayUtil,
  type Editor,
  type TLSelectionForegroundOverlay,
  type TLShapeId,
  type TLShapeIndicatorOverlay,
} from "tldraw";
import { isLibraryShapeId } from "./canvasLibrary";

/*
 * What layout.json placed is locked, and shows orange when selected rather than tldraw's blue, so
 * the colour alone says whether a shape can be moved. tldraw takes its selection colour from the
 * theme, one for every shape, so the two overlays that draw a selection are subclassed here. They
 * lean on how tldraw draws them (docs/2026-09-24-agent-free-layout.md): check both on an upgrade.
 */

// ponytail: resolved once, since the canvas is always dark (App.tsx); key it by
// `editor.getColorMode()` if a light canvas ever arrives.
let orange: string | undefined;

/** `--ds-amber-900`, resolved: the token is a `light-dark()`, which a canvas cannot parse. Not
 *  read on every draw, which is every frame of a pan. */
function lockedStroke(editor: Editor) {
  if (orange) return orange;
  const probe = document.createElement("span");
  probe.style.color = "var(--ds-amber-900)";
  editor.getContainer().append(probe);
  orange = getComputedStyle(probe).color;
  probe.remove();
  return orange;
}

/** A shape of the layout's, and still locked: "Unlock all" lets the person nudge one. */
function isLockedLayout(editor: Editor, id: TLShapeId) {
  return isLibraryShapeId(id) && !!editor.getShape(id)?.isLocked;
}

/**
 * tldraw draws no outline for a locked shape. This draws one, orange, for a selected shape of the
 * layout's; not for a hovered one, since boards cover most of the canvas.
 */
class LockedShapeIndicators extends ShapeIndicatorOverlayUtil {
  override render(ctx: CanvasRenderingContext2D, overlays: TLShapeIndicatorOverlay[]) {
    super.render(ctx, overlays);
    const editor = this.editor;
    const selected = new Set(editor.getSelectedShapeIds());
    const ids = (overlays[0]?.props.idsToDisplay ?? []).filter(
      (id) => selected.has(id) && isLockedLayout(editor, id),
    );
    if (!ids.length) return;
    const path = new Path2D();
    for (const id of ids) {
      const shape = editor.getShape(id)!;
      const indicator = editor.getShapeUtil(shape).getIndicatorPath(shape);
      if (!indicator) continue;
      path.addPath(
        indicator instanceof Path2D ? indicator : indicator.path,
        editor.getShapePageTransform(shape),
      );
    }
    ctx.strokeStyle = lockedStroke(editor);
    ctx.lineWidth = this.options.lineWidth / editor.getZoomLevel();
    ctx.stroke(path);
  }
}

/** tldraw's selection box, handles and all, orange when the whole selection is the layout's. */
class LockedSelectionForeground extends SelectionForegroundOverlayUtil {
  override render(ctx: CanvasRenderingContext2D, overlays: TLSelectionForegroundOverlay[]) {
    const editor = this.editor;
    const ids = editor.getSelectedShapeIds();
    if (!ids.length || !ids.every((id) => isLockedLayout(editor, id))) {
      super.render(ctx, overlays);
      return;
    }
    const stroke = lockedStroke(editor);
    // Every stroke colour it sets comes out orange. A method or property of the context needs the
    // context itself as `this`, not the proxy, or the browser throws "Illegal invocation".
    super.render(
      new Proxy(ctx, {
        get: (target, key) => {
          const value = Reflect.get(target, key);
          return typeof value === "function" ? value.bind(target) : value;
        },
        set: (target, key, value) =>
          Reflect.set(target, key, key === "strokeStyle" ? stroke : value),
      }),
      overlays,
    );
  }
}

/** For `<Tldraw overlayUtils>`: each replaces tldraw's own, by its `type`. */
export const lockedOverlayUtils = [LockedShapeIndicators, LockedSelectionForeground];
