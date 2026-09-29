/**
 * Covers: the board or image that stands in for a canvas or a project. Nothing in here reads
 * the index, so the server (canvas/server/sp.ts) resolves a project's cover with the same rules
 * the page draws it by.
 */

type Box = [number, number, number, number];

/**
 * What a cover reads of a folder's layout.json: CanvasLayoutConfig in canvasLibrary.ts, spelled
 * out here because that module is the page's, and the server imports this one.
 */
type CoverLayout = {
  cover?: string;
  coverBox?: Box;
  order?: number;
  rows?: {
    files?: (string | { file: string; w?: number; h?: number })[];
    images?: { file: string; w: number; h: number }[];
  }[];
};

/**
 * The artboard a board is drawn at unless its layout entry says otherwise. Matches the v1.14+
 * phone mockups' own canvas: .phone{430x932} + body{padding:24px}. Here rather than with the
 * shape that draws it, because the sheet page needs the size too and must not import tldraw to
 * read one pair of numbers.
 */
export const CANVAS_FILE_DEFAULT_SIZE = { w: 478, h: 980 } as const;

/**
 * The phone frame in a 478 x 980 artboard, `[x, y, w, h]`, which every folder here draws at the
 * same place; a folder whose cover is not a phone overrides it with `coverBox` in its layout.json.
 * A card crops to this rather than showing the whole board, so what it shows is the mockup and
 * not the artboard margin around it.
 */
export const DEFAULT_COVER_BOX: Box = [46, 24, 393, 852];

/**
 * Places a board behind the shell's screen so the `[x, y, w, h]` box fills it and sits centred:
 * scaled by whichever axis binds, so the crop can lose a little of the box but never leave a gap.
 */
export function fitCover([x, y, bw, bh]: Box, w: number, h: number) {
  const scale = Math.max(w / bw, h / bh);
  return {
    scale,
    left: w / 2 - (x + bw / 2) * scale,
    top: h / 2 - (y + bh / 2) * scale,
  };
}

/**
 * The board that stands in for a folder: the one its layout.json names, else its first screen
 * rather than its 00- board, which is a token sheet on every example and would make the covers
 * look alike. `names` are the folder's board files without `.html`, sorted.
 */
export function coverBoard(names: string[], layout?: CoverLayout) {
  return (
    names.find((n) => n === layout?.cover) ??
    names.find((n) => !n.startsWith("00")) ??
    names[0]
  );
}

/**
 * Folders in the order the canvas strip shows them: by slug with numbers read as numbers, so
 * 02- comes before 10- and v1.9 before v1.13, then by `order`. The second sort is stable, so it
 * only moves the folders that ask to be moved.
 */
export function inStripOrder<T>(
  list: T[],
  slug: (item: T) => string,
  rank: (item: T) => number,
) {
  return list
    .toSorted((a, b) =>
      slug(a).localeCompare(slug(b), undefined, { numeric: true }),
    )
    .sort((a, b) => rank(a) - rank(b));
}

/** What a project's `project.json` says about its cover: a file under `canvases/`, and a crop. */
export interface ChosenCover {
  /** `<slug>/<board>.html`, or `<slug>/assets/brand/<image>` as the layout's image rows list it. */
  path: string;
  /** The part to keep in view, `[x, y, w, h]` in the file's own px: an element on the board. */
  box?: Box;
}

/** A cover as a card draws it: the file, its size, and the part of it to keep in view. */
export interface Cover {
  path: string;
  w: number;
  h: number;
  box: Box;
  /** Chosen in project.json, rather than the default, which is what a reset goes back to. */
  chosen?: true;
}

/** A canvas as the index lists it, whose layout the server has only as parsed JSON. */
type CoverCanvas = {
  slug: string;
  html: string[];
  brand: string[];
  layout?: unknown;
};
const layoutOf = (c: CoverCanvas) => c.layout as CoverLayout | undefined;

/**
 * A project's cover. The one its project.json chose, when that file is still one of its canvases'
 * boards or listed images; otherwise the first canvas's own cover board, whole, which is also what a
 * project with no project.json has. Undefined for a project with no canvas yet.
 */
export function projectCover(
  canvases: CoverCanvas[],
  chosen?: ChosenCover,
): Cover | undefined {
  // A hand-edited project.json can hold anything, so a path that is not a string is no choice.
  const [slug, ...rest] =
    typeof chosen?.path === "string" ? chosen.path.split("/") : [];
  const file = rest.join("/");
  const canvas = canvases.find((c) => c.slug === slug);
  if (canvas && chosen) {
    const box = validBox(chosen.box);
    if (canvas.html.includes(file))
      return {
        ...boardCover(canvas, file.replace(/\.html$/, ""), box),
        chosen: true,
      };
    // Listed in a row and still on disk: a row outlives the file it names.
    for (const row of layoutOf(canvas)?.rows ?? [])
      for (const image of row.images ?? [])
        if (image.file === file && canvas.brand.includes(file))
          return {
            path: chosen.path,
            w: image.w,
            h: image.h,
            box: box ?? [0, 0, image.w, image.h],
            chosen: true,
          };
  }
  const first = inStripOrder(
    canvases.filter((c) => c.html.length),
    (c) => c.slug,
    (c) => layoutOf(c)?.order ?? 0,
  )[0];
  if (!first) return undefined;
  const names = first.html.map((f) => f.replace(/\.html$/, ""));
  return boardCover(first, coverBoard(names, layoutOf(first)));
}

function boardCover(canvas: CoverCanvas, name: string, box?: Box): Cover {
  const layout = layoutOf(canvas);
  let size: { w: number; h: number } = CANVAS_FILE_DEFAULT_SIZE;
  for (const row of layout?.rows ?? [])
    for (const entry of row.files ?? [])
      if (
        typeof entry !== "string" &&
        entry.file === name &&
        entry.w &&
        entry.h
      )
        size = { w: entry.w, h: entry.h };
  return {
    path: `${canvas.slug}/${name}.html`,
    ...size,
    box: box ?? [0, 0, size.w, size.h],
  };
}

/** A crop from a request or a hand-edited file: four numbers with an area, or none. */
export function validBox(box: unknown): Box | undefined {
  return Array.isArray(box) &&
    box.length === 4 &&
    box.every((n) => Number.isFinite(n)) &&
    box[2] > 0 &&
    box[3] > 0
    ? (box as Box)
    : undefined;
}

/**
 * The element on the board the inspector has open that is under the pointer, else the one picked,
 * as a crop of that board. InspectorPanel keeps it; the canvas's right button reads it, so "Set as
 * cover" over an element keeps that element in view (canvasChrome.tsx).
 */
export const pointedElement: { current: { path: string; box: Box } | null } = {
  current: null,
};
