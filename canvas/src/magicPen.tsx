import { useEffect, useRef, useState } from "react";
import { useEditor, usePassThroughWheelEvents, useValue } from "tldraw";
import {
  CANVAS_FILE_SHAPE_TYPE,
  type CanvasFileShape,
} from "./CanvasFileShapeUtil";
import { boardShot, dispatchAttach } from "./canvasAttach";
import { loadCanvasFileHtml } from "./canvasLibrary";

/** A region of a board, in the board's own pixels. */
interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A pen with a spark, its point at the lower left, black on white so it reads on any board. */
const PEN = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
    '<g stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M3 21l2.5-6.5L16 4a2.1 2.1 0 013 3L8.5 17.5z" fill="#fff" stroke="#fff" stroke-width="4"/>' +
    '<path d="M3 21l2.5-6.5L16 4a2.1 2.1 0 013 3L8.5 17.5z" fill="#fff" stroke="#000" stroke-width="1.5"/>' +
    '<path d="M20 12.5v3M18.5 14h3M13 18.5v2M12 19.5h2" stroke="#fff" stroke-width="4"/>' +
    '<path d="M20 12.5v3M18.5 14h3M13 18.5v2M12 19.5h2" stroke="#000" stroke-width="1.5"/></g></svg>',
)}") 3 21, crosshair`;

/**
 * What is in a region of a board, for the agent to find it by: the outermost elements wholly
 * inside it, or else the innermost one that holds all of it. Laid out in a frame of this page's
 * own at the board's size, since the board's frame on the canvas is sandboxed and cannot be read.
 * Scripts stay off there as they do on the canvas, so the layout is the one the person drew over.
 */
async function describeRegion(html: string, w: number, h: number, r: Region) {
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-same-origin");
  frame.style.cssText =
    `position:fixed;left:${-w - 100}px;top:0;width:${w}px;height:${h}px;` +
    "border:0;visibility:hidden";
  const loaded = new Promise((done) => (frame.onload = done));
  frame.srcdoc = html;
  document.body.append(frame);
  try {
    await loaded;
    const doc = frame.contentDocument!;
    const box = (el: Element) => el.getBoundingClientRect();
    const inside = new Set(
      [...doc.body.querySelectorAll("*")].filter((el) => {
        const b = box(el);
        return (
          b.width > 0 &&
          b.height > 0 &&
          b.left >= r.x - 2 &&
          b.top >= r.y - 2 &&
          b.right <= r.x + r.w + 2 &&
          b.bottom <= r.y + r.h + 2
        );
      }),
    );
    let picked = [...inside].filter((el) => !inside.has(el.parentElement!));
    if (!picked.length) {
      let el = doc.elementFromPoint(r.x + r.w / 2, r.y + r.h / 2);
      while (el && el !== doc.body) {
        const b = box(el);
        if (
          b.left <= r.x &&
          b.top <= r.y &&
          b.right >= r.x + r.w &&
          b.bottom >= r.y + r.h
        )
          break;
        el = el.parentElement;
      }
      picked = el ? [el] : [];
    }
    return picked.map((el) => {
      const tag = el.tagName.toLowerCase();
      const words =
        tag === "img"
          ? (el as HTMLImageElement).alt
          : (el.textContent ?? "").replace(/\s+/g, " ").trim();
      return words ? `${tag} "${words.slice(0, 24)}"` : tag;
    });
  } finally {
    frame.remove();
  }
}

/**
 * The magic pen. While Option is held the pointer over the canvas is a pen, and a drag across a
 * board marks a region of it, which goes to the chat as a quote: that part of the board as a
 * picture, captioned with the board, where on it, and the elements there.
 *
 * A layer over the whole canvas while the key is down, so tldraw never sees the drag, which under
 * Option would copy the board. The key is heard in both windows, since the focus may be in the
 * chat, and a window losing focus lets go of it.
 */
export function MagicPen() {
  const editor = useEditor();
  const [held, setHeld] = useState(false);
  const [drag, setDrag] = useState<{
    board: CanvasFileShape;
    from: { x: number; y: number };
    to: { x: number; y: number };
  }>();
  const layer = useRef<HTMLDivElement>(null);
  usePassThroughWheelEvents(layer);

  useEffect(() => {
    const down = (e: KeyboardEvent) => e.key === "Alt" && setHeld(true);
    const up = (e: KeyboardEvent) => e.key === "Alt" && setHeld(false);
    const away = () => setHeld(false);
    const top = window.top!;
    const windows = top === window ? [window] : [window, top];
    for (const w of windows) {
      w.addEventListener("keydown", down, true);
      w.addEventListener("keyup", up, true);
      w.addEventListener("blur", away);
    }
    return () => {
      for (const w of windows) {
        w.removeEventListener("keydown", down, true);
        w.removeEventListener("keyup", up, true);
        w.removeEventListener("blur", away);
      }
    };
  }, []);

  // In page points, so the region stays on the board if the camera moves during the drag.
  const pageAt = (e: React.PointerEvent) =>
    editor.screenToPage({ x: e.clientX, y: e.clientY });

  const finish = async (d: NonNullable<typeof drag>) => {
    const b = editor.getShapePageBounds(d.board.id)!;
    // The board's pixels per page unit, 1 unless it was resized on the canvas.
    const [sx, sy] = [d.board.props.w / b.w, d.board.props.h / b.h];
    const r: Region = {
      x: Math.round((Math.min(d.from.x, d.to.x) - b.minX) * sx),
      y: Math.round((Math.min(d.from.y, d.to.y) - b.minY) * sy),
      w: Math.round(Math.abs(d.to.x - d.from.x) * sx),
      h: Math.round(Math.abs(d.to.y - d.from.y) * sy),
    };
    // A click, or a slip of the hand, marks nothing.
    if (r.w < 4 || r.h < 4) return;
    try {
      const { name, src } = boardShot(d.board);
      // The board, where on it, and what is there: the agent's only word on the picture.
      const html = await loadCanvasFileHtml(d.board.props.path);
      const what = html
        ? await describeRegion(html, d.board.props.w, d.board.props.h, r)
        : [];
      const caption =
        `${name} at ${r.x},${r.y} ${r.w}x${r.h}` +
        (what.length ? `: ${what.join(", ")}` : "");
      dispatchAttach({
        kind: "board",
        // The server takes a caption of 200 characters at most (agent.ts).
        name: caption.length > 200 ? `${caption.slice(0, 199)}…` : caption,
        src,
        crop: {
          x: r.x / d.board.props.w,
          y: r.y / d.board.props.h,
          w: r.w / d.board.props.w,
          h: r.h / d.board.props.h,
        },
      });
    } catch (error) {
      dispatchAttach({ kind: "error", message: String(error) });
    }
  };

  const rect = useValue(
    "pen region",
    () => {
      if (!drag) return null;
      const a = editor.pageToViewport(drag.from);
      const b = editor.pageToViewport(drag.to);
      return {
        left: Math.min(a.x, b.x),
        top: Math.min(a.y, b.y),
        width: Math.abs(b.x - a.x),
        height: Math.abs(b.y - a.y),
      };
    },
    [editor, drag],
  );

  if (!held && !drag) return null;
  return (
    <div
      ref={layer}
      className="sp-pen"
      style={{ cursor: PEN }}
      onPointerDown={(e) => {
        const at = pageAt(e);
        const hit = editor.getShapeAtPoint(at, {
          hitInside: true,
          hitLocked: true,
          renderingOnly: true,
        });
        if (hit?.type !== CANVAS_FILE_SHAPE_TYPE) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag({ board: hit as CanvasFileShape, from: at, to: at });
      }}
      onPointerMove={(e) => {
        if (!drag) return;
        // Held to the board it started on.
        const b = editor.getShapePageBounds(drag.board.id)!;
        const p = pageAt(e);
        setDrag({
          ...drag,
          to: {
            x: Math.min(Math.max(p.x, b.minX), b.maxX),
            y: Math.min(Math.max(p.y, b.minY), b.maxY),
          },
        });
      }}
      onPointerUp={() => {
        if (!drag) return;
        setDrag(undefined);
        void finish(drag);
      }}
    >
      {rect && <div className="sp-pen-region" style={rect} />}
    </div>
  );
}
