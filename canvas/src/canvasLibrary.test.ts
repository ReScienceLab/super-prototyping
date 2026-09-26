import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  brandMaterialSlugs,
  canvasBoardRef,
  canvasFileHtml,
  canvasImageKey,
  canvasImageRef,
  canvasImageUrl,
  loadCanvasFileHtml,
  readCanvasLayout,
  readCanvasLibrary,
} from "./canvasLibrary";

describe("readCanvasLibrary", () => {
  it("puts folders in `order`, then slug order", () => {
    const slugs = readCanvasLibrary().map((c) => c.slug);
    // Three folders declare an order: snapaction-ios at -1 ahead of the alphabet,
    // apple-icons at 1 and templates at 2 behind it. Sorting the rest by the same
    // rule rather than naming them keeps this passing when a fourth one does.
    const rest = slugs;
    const order = (slug: string) => readCanvasLayout(slug)?.order ?? 0;
    expect(rest).toEqual(
      [...rest].sort(
        (a, b) =>
          order(a) - order(b) ||
          a.localeCompare(b, undefined, { numeric: true }),
      ),
    );
    expect(rest.slice(-2)).toEqual(["apple-icons", "templates"]);
  });
});

describe("loadCanvasFileHtml", () => {
  // Where a loaded board is announced to the shapes showing it.
  beforeAll(() => vi.stubGlobal("window", new EventTarget()));

  it("fills the cache useCanvasFileHtml reads from, and leaves non-boards out of it", async () => {
    const path = readCanvasLibrary()[0].files[0].path;
    expect(canvasFileHtml.has(path)).toBe(false);
    const html = await loadCanvasFileHtml(path);
    expect(html).toContain("<");
    expect(canvasFileHtml.get(path)).toBe(html);
    // A second load resolves from the cache with the same string.
    expect(await loadCanvasFileHtml(path)).toBe(html);

    const missing = "/mockups/canvases/nope/00-nope.html";
    expect(await loadCanvasFileHtml(missing)).toBeUndefined();
    expect(canvasFileHtml.has(missing)).toBe(false);
  });

  it("ends every board with the tag that stops the browser back gesture", async () => {
    // A wheel inside an iframe never reaches tldraw, so a board that does not stop overscroll
    // in its own document turns a two-finger pan over it into a back navigation.
    const path = readCanvasLibrary()[1].files[0].path;
    const html = await loadCanvasFileHtml(path);
    expect(html).toMatch(/<style>html\{overscroll-behavior:none\}<\/style>$/);
  });
});

describe("images rows", () => {
  it("name only committed files, with the pixel size they are drawn at", () => {
    // Both the canvas and the brand kit drop an image they cannot resolve or size, so a
    // mistyped path or a missing w/h leaves a gap in the published evidence and says nothing
    // about it. This is where that gets said: the two conditions, checked in one place.
    const slugs = [...new Set(readCanvasLibrary().map((c) => c.slug))];
    const broken = slugs.flatMap((slug) =>
      (readCanvasLayout(slug)?.rows ?? []).flatMap((row) =>
        (row.images ?? []).flatMap((image) =>
          canvasImageUrl(slug, image.file) && image.w && image.h
            ? []
            : [`${slug}: ${image.file}`],
        ),
      ),
    );
    expect(broken).toEqual([]);
  });
});

describe("canvasImageRef", () => {
  it("finds the layout entry behind a brand image, and nothing behind any other shape", () => {
    // The whole click path, in one go: the canvas builds a shape id out of the folder and the
    // file (App.tsx, imageShapeId), and a click on the canvas hands that id back for the panel
    // to read the picture's row, label and source from.
    const slug = brandMaterialSlugs()[0];
    const row = (readCanvasLayout(slug)?.rows ?? []).find(
      (r) => r.images?.length,
    );
    const image = row?.images?.[0];
    if (!row || !image) throw new Error("no brand material to check");

    expect(canvasImageRef(`shape:${canvasImageKey(slug, image.file)}`)).toEqual(
      {
        slug,
        file: image.file,
      },
    );

    // A brand file is `assets/brand/...`, so the slug is what is before the *first* slash.
    expect(image.file).toContain("/");
    expect(
      canvasImageRef("shape:canvas-file:/mockups/canvases/x/01-a.html"),
    ).toBeUndefined();
    expect(
      canvasImageRef("shape:canvas-image:slug-with-no-file"),
    ).toBeUndefined();
  });
});

describe("canvasBoardRef", () => {
  it("names a board the way the server and the agent know it", () => {
    // A board's shape carries the module path the generated index keys it by, which is neither
    // what /__sp/shoot takes nor what a sentence in the chat panel should say.
    const board = readCanvasLibrary()[1].files[0];
    expect(board.path).not.toBe(`${board.pageSlug}/${board.fileName}.html`);
    expect(canvasBoardRef(board.path)).toEqual({
      slug: board.pageSlug,
      file: `${board.fileName}.html`,
    });
    expect(canvasBoardRef("assets/brand/identity/logo.png")).toBeUndefined();
  });
});
