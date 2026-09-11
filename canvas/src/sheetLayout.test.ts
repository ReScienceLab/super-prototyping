import { describe, expect, it } from "vitest";
import { sheetRows } from "./sheetLayout";
import { WELCOME_PAGE_SLUG } from "./canvasUrl";

const captions = (slug: string) => sheetRows(slug).flatMap((row) => row.boards.map((b) => b.caption));

describe("sheetRows", () => {
  it("lays the boards out in layout.json order, with the canvas's own captions", () => {
    const rows = sheetRows("notion-ios");
    // Foundations is the token sheet, which is not a screen and so is not on the sheet.
    expect(rows.map((row) => row.title)).toEqual([
      "Notion iOS replica screens",
      "Flow: adding a new data source",
      "Flow: adding an account",
      "Flow: the purchase sheet",
    ]);
    // A `numbered` row counts from 1 within that row; a plain one is the file's own title.
    expect(captions("notion-ios").slice(0, 2)).toEqual(["1 · Splash", "2 · Search / Ask AI"]);
    expect(captions("notion-ios")).not.toContain("Design tokens");

    // Every board is at the artboard size, pointed at that board as a page of its own.
    const boards = rows.flatMap((row) => row.boards);
    expect(boards.every((b) => b.w === 478 && b.h === 980)).toBe(true);
    expect(boards[0].src).toBe("/board/notion-ios/01-splash.html");
    expect(new Set(boards.map((b) => b.src)).size).toBe(boards.length);
  });

  it("gives a board the size its entry declares", () => {
    // The welcome strip is the one board in the repo that is not phone-shaped.
    const [row, ...rest] = sheetRows(WELCOME_PAGE_SLUG);
    expect(rest).toEqual([]);
    expect(row.title).toBe("super-prototyping");
    expect(row.boards).toEqual([
      {
        src: `/board/${WELCOME_PAGE_SLUG}/00-welcome.html`,
        caption: "What this is",
        w: 2153,
        h: 819,
      },
    ]);
  });

  it("has nothing to draw for a page with no boards", () => {
    expect(sheetRows("not-a-folder")).toEqual([]);
  });
});
