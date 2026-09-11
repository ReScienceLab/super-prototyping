import {
  CANVAS_FILE_DEFAULT_SIZE,
  type CanvasLibraryFile,
  boardPageUrl,
  readCanvasLayout,
  readCanvasLibrary,
} from "./canvasLibrary";

/**
 * One canvas page's boards as one scrolling web page, for the button in the top bar. The page
 * itself is `sheet.tsx`; this is what goes on it.
 *
 * The canvas is the place to read a flow; the sheet is the place to read a screen. Every board
 * is on it at its own size, in a frame of its own pointed at that board's own address, so type
 * is the size it will ship at and anything the board does on a tap still does it — which a
 * canvas at 25% cannot show and the inspector can only show one board at a time.
 */

/** A board on the sheet: where its page is, what to call it, and how big it is. */
export interface SheetBoard {
  src: string;
  caption: string;
  w: number;
  h: number;
}

export interface SheetRow {
  title: string;
  boards: SheetBoard[];
}

/**
 * The page's boards in the order the canvas lays them out: layout.json's rows, with their titles
 * and captions, then whatever no row claimed, the way the canvas puts the leftovers in a grid
 * below rather than dropping them. Read from layout.json rather than off the shapes on screen,
 * because a caption out there is a text shape and its rich text is a worse source for a string
 * than the file the string was made from.
 */
export function sheetRows(slug: string): SheetRow[] {
  const files: CanvasLibraryFile[] =
    readCanvasLibrary().find((page) => page[0].pageSlug === slug) ?? [];
  const rows: SheetRow[] = [];
  const placed = new Set<string>();

  for (const row of readCanvasLayout(slug)?.rows ?? []) {
    const boards: SheetBoard[] = [];
    for (const entry of row.files) {
      // An entry is the file name alone, or that name with the overrides beside it.
      const declared = typeof entry === "string" ? { file: entry } : entry;
      const file = files.find((c) => c.fileName === declared.file && !placed.has(c.path));
      const src = file && boardPageUrl(file.path);
      if (!file || !src) continue;
      placed.add(file.path);
      const caption = declared.label ?? file.title;
      boards.push({
        src,
        caption: row.numbered ? `${boards.length + 1} · ${caption}` : caption,
        // Both or neither, the way the canvas reads a size override.
        ...(declared.w && declared.h ? { w: declared.w, h: declared.h } : CANVAS_FILE_DEFAULT_SIZE),
      });
    }
    if (boards.length) rows.push({ title: row.title, boards });
  }

  const leftover = files.filter((file) => !placed.has(file.path));
  if (leftover.length) {
    rows.push({
      title: rows.length ? "Everything else" : "",
      boards: leftover.flatMap((file) => {
        const src = boardPageUrl(file.path);
        return src ? [{ src, caption: file.title, ...CANVAS_FILE_DEFAULT_SIZE }] : [];
      }),
    });
  }
  return rows;
}
