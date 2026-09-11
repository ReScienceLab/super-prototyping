import { CANVAS_FILE_DEFAULT_SIZE } from "./CanvasFileShapeUtil";
import {
  type CanvasLibraryFile,
  boardPageUrl,
  loadCanvasFileHtml,
  pageNameFor,
  readCanvasLayout,
  readCanvasLibrary,
} from "./canvasLibrary";

/**
 * A page's boards as one scrolling web page, for the button in the top bar.
 *
 * The canvas is the place to read a flow; this is the place to read a screen. Every board is an
 * iframe at its own size, so type is at the size it will ship at and anything the board does on
 * a tap still does it — which a canvas at 25% cannot show and the inspector can only show one
 * board at a time.
 */

/** A board on the sheet: where its page is, what to call it, and how big it is. */
interface SheetBoard {
  src: string;
  caption: string;
  w: number;
  h: number;
}

interface SheetRow {
  title: string;
  boards: SheetBoard[];
}

/** For text going into the document below, which is built as a string. */
const esc = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The page's boards in the order the canvas lays them out: layout.json's rows, with their titles
 * and captions, then whatever no row claimed, the way the canvas puts the leftovers in a grid
 * below rather than dropping them. Read from layout.json rather than off the shapes on screen,
 * because a caption out there is a text shape and its rich text is a worse source for a string
 * than the file the string was made from.
 */
function sheetRows(slug: string, files: CanvasLibraryFile[], src: Map<string, string>): SheetRow[] {
  const rows: SheetRow[] = [];
  const placed = new Set<string>();

  for (const row of readCanvasLayout(slug)?.rows ?? []) {
    const boards: SheetBoard[] = [];
    for (const entry of row.files) {
      // An entry is the file name alone, or that name with the overrides beside it.
      const declared = typeof entry === "string" ? { file: entry } : entry;
      const file = files.find((c) => c.fileName === declared.file && !placed.has(c.path));
      const url = file && src.get(file.path);
      if (!file || !url) continue;
      placed.add(file.path);
      const caption = declared.label ?? file.title;
      boards.push({
        src: url,
        caption: row.numbered ? `${boards.length + 1} · ${caption}` : caption,
        // Both or neither, the way the canvas reads a size override.
        ...(declared.w && declared.h ? { w: declared.w, h: declared.h } : CANVAS_FILE_DEFAULT_SIZE),
      });
    }
    if (boards.length) rows.push({ title: row.title, boards });
  }

  const leftover = files.filter((file) => !placed.has(file.path) && src.has(file.path));
  if (leftover.length) {
    rows.push({
      title: rows.length ? "Everything else" : "",
      boards: leftover.map((file) => ({
        src: src.get(file.path)!,
        caption: file.title,
        ...CANVAS_FILE_DEFAULT_SIZE,
      })),
    });
  }
  return rows;
}

/* The sheet's own chrome. Grey ground and grey captions, like the inspector's stage, so that the
   only thing on the page with any colour in it is the mockups. */
const SHEET_CSS = `
  :root { color-scheme: light }
  * { box-sizing: border-box }
  body {
    margin: 0;
    padding: 32px 40px 72px;
    background: #f5f5f5;
    color: #171717;
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  h1 { margin: 0; font-size: 22px; letter-spacing: -0.01em }
  .sub { margin: 4px 0 0; color: #767676 }
  h2 { margin: 40px 0 16px; font-size: 15px; font-weight: 600 }
  .row { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 28px 24px }
  figure { margin: 0; display: flex; flex-direction: column; gap: 8px }
  iframe { display: block; border: 0; border-radius: 12px; background: #ffffff; box-shadow: 0 1px 3px #00000014 }
  figcaption { color: #767676; font-size: 13px }
`;

/** Every board on a canvas page, as one HTML document. */
export async function boardsPageDoc(slug: string) {
  const name = pageNameFor(slug);
  const files = readCanvasLibrary().find((page) => page[0].pageSlug === slug) ?? [];
  const loaded = await Promise.all(
    files.map(async (file) => [file.path, await loadCanvasFileHtml(file.path)] as const),
  );
  const src = new Map(
    // A board whose chunk never arrived is left off the sheet; it is blank on the canvas too.
    loaded.flatMap(([path, html]) => (html ? [[path, boardPageUrl(path, html)] as const] : [])),
  );
  const rows = sheetRows(slug, files, src);
  const count = rows.reduce((n, row) => n + row.boards.length, 0);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)}</title>
<style>${SHEET_CSS}</style>
</head>
<body>
<h1>${esc(name)}</h1>
<p class="sub">${count} board${count === 1 ? "" : "s"} at full size</p>
${rows
  .map(
    (row) => `<section>
${row.title ? `<h2>${esc(row.title)}</h2>` : ""}
<div class="row">
${row.boards
  .map(
    (board) => `<figure>
<iframe src="${board.src}" width="${board.w}" height="${board.h}" loading="lazy" title="${esc(board.caption)}"></iframe>
<figcaption>${esc(board.caption)}</figcaption>
</figure>`,
  )
  .join("\n")}
</div>
</section>`,
  )
  .join("\n")}
</body>
</html>`;
}

/**
 * Opens that document in a tab of its own.
 *
 * The tab is opened before the boards are fetched and pointed at the page afterwards: a
 * `window.open` on the far side of an await is a popup the browser blocks, because the click that
 * allowed it is over by then. Most of the time there is nothing to wait for anyway — every shape
 * on a page mounts, so a page's boards are in the library's cache before anyone can click.
 */
export async function openBoardsPage(slug: string) {
  const tab = window.open("", "_blank");
  // Blocked by the browser, and there is no window left to say so in.
  if (!tab) return;
  tab.document.title = pageNameFor(slug);
  const doc = await boardsPageDoc(slug);
  tab.location.replace(URL.createObjectURL(new Blob([doc], { type: "text/html" })));
}
