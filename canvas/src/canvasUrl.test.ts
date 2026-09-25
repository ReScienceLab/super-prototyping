import { describe, expect, it } from "vitest";
import {
  canvasPageUrl,
  frameUrl,
  sheetPageUrl,
  WELCOME_PAGE_SLUG,
  tabFromUrl,
  targetFromUrl,
  slugFromUrl,
  urlForSlug,
  urlForTab,
  windowUrl,
} from "./canvasUrl";

// The address is what people paste to each other, so both directions have to agree: the URL a
// page writes must open that page, the URL a board writes must open that board, and a view
// naming no page must write the bare URL back.
describe("canvas URLs", () => {
  // The hosted canvas sits under a path, not at the root: the landing page took the
  // domain. Every address below is built on it, so the tests fail if anything here
  // ever writes an address from the root instead.
  const root = "https://superproto.dev/demo/";

  it("reads a page slug, and none from the bare address", () => {
    expect(slugFromUrl(root + "?canvas=luma-ios")).toBe("luma-ios");
    // Start here's page is named like any other; the bare address is a project's own view of
    // it, with no canvas in front (HOME_TAB, canvasTabs.ts).
    expect(slugFromUrl(root + "?canvas=00-welcome")).toBe(WELCOME_PAGE_SLUG);
    expect(slugFromUrl(root)).toBe("");
    expect(slugFromUrl(root + "?other=1")).toBe("");
  });

  it("reads a board from the hash, and none from an address without one", () => {
    expect(targetFromUrl(root + "?canvas=luma-ios#03-event")).toBe("03-event");
    expect(targetFromUrl(root + "#00-welcome")).toBe("00-welcome");
    expect(targetFromUrl(root + "?canvas=luma-ios")).toBeUndefined();
    expect(targetFromUrl(root + "?canvas=luma-ios#")).toBeUndefined();
    expect(targetFromUrl(root + "?canvas=luma-ios#%")).toBeUndefined();
    expect(targetFromUrl(root + "?canvas=luma-ios#%E0%A4%A")).toBeUndefined();
  });

  it("addresses a picture by its path in the folder, separators and all", () => {
    const file = "assets/brand/social/x-banner.jpg";
    const href = urlForSlug(root, "grok-ios", file);
    expect(href).toBe(root + "?canvas=grok-ios#" + file);
    expect(targetFromUrl(href)).toBe(file);
  });

  it("round-trips a file name the hash would otherwise mangle", () => {
    for (const name of ["03 event", "100%-width", "a#b?c"]) {
      expect(targetFromUrl(urlForSlug(root, "luma-ios", name))).toBe(name);
    }
  });

  it("writes a page as ?canvas=, Start here's included, and no page as the bare URL", () => {
    expect(urlForSlug(root, "luma-ios")).toBe(root + "?canvas=luma-ios");
    expect(urlForSlug(root + "?canvas=luma-ios", "notion-ios")).toBe(
      root + "?canvas=notion-ios",
    );
    expect(urlForSlug(root + "?canvas=luma-ios", WELCOME_PAGE_SLUG)).toBe(
      root + "?canvas=00-welcome",
    );
    expect(urlForSlug(root + "?canvas=luma-ios", "")).toBe(root);
  });

  it("writes a board as the hash, and drops it when none is open", () => {
    expect(urlForSlug(root, "luma-ios", "03-event")).toBe(
      root + "?canvas=luma-ios#03-event",
    );
    expect(urlForSlug(root + "?canvas=luma-ios#03-event", "luma-ios")).toBe(
      root + "?canvas=luma-ios",
    );
    expect(urlForSlug(root + "?canvas=luma-ios#03-event", "notion-ios")).toBe(
      root + "?canvas=notion-ios",
    );
    // A board of Start here's is one of that page's, so its address names the page, and the
    // bare address with a hash is the same board seen from the project's own view.
    expect(urlForSlug(root, WELCOME_PAGE_SLUG, "00-welcome")).toBe(
      root + "?canvas=00-welcome#00-welcome",
    );
    expect(urlForSlug(root, "", "00-welcome")).toBe(root + "#00-welcome");
  });

  it("links between the canvas and the sheet by swapping the file", () => {
    expect(canvasPageUrl("luma-ios")).toBe("/?canvas=luma-ios");
    expect(canvasPageUrl(WELCOME_PAGE_SLUG)).toBe("/?canvas=00-welcome");
    expect(sheetPageUrl("luma-ios")).toBe("/sheet.html?canvas=luma-ios");
    expect(slugFromUrl(root + sheetPageUrl("luma-ios").slice(1))).toBe(
      "luma-ios",
    );
  });

  it("puts the canvas in the window's frame by swapping the file, and back", () => {
    const at = "http://127.0.0.1:5173/p/Speak%20For%20You/";
    expect(frameUrl(at + "?canvas=luma-ios#03-event")).toBe(
      at + "canvas.html?canvas=luma-ios#03-event",
    );
    expect(frameUrl(at + "home.html")).toBe(at + "canvas.html");
    expect(windowUrl(at + "canvas.html?canvas=luma-ios#03-event")).toBe(
      at + "?canvas=luma-ios#03-event",
    );
  });

  it("reads the tab in front, which is a canvas unless a kit says otherwise", () => {
    // The bare address is the project's own view with no canvas in front (HOME_TAB), which is
    // not Start here's own tab, so the two must read as different views.
    expect(tabFromUrl(root)).toEqual({ kind: "canvas", slug: "" });
    expect(tabFromUrl(root + "?canvas=00-welcome")).toEqual({
      kind: "canvas",
      slug: WELCOME_PAGE_SLUG,
    });
    expect(tabFromUrl(root + "?canvas=luma-ios")).toEqual({
      kind: "canvas",
      slug: "luma-ios",
    });
    expect(tabFromUrl(root + "?brand=luma-ios")).toEqual({
      kind: "brand",
      slug: "luma-ios",
    });
    // A `brand` with nothing after it is the index of every kit, not a missing one.
    expect(tabFromUrl(root + "?brand=")).toEqual({ kind: "brand", slug: "" });
  });

  it("writes one tab at a time, so the address never names two", () => {
    const canvas = { kind: "canvas", slug: "luma-ios" } as const;
    const kit = { kind: "brand", slug: "grok-ios" } as const;
    expect(urlForTab(root, canvas, "03-event")).toBe(
      root + "?canvas=luma-ios#03-event",
    );
    // The kit takes the canvas parameter with it, and the board too, since a kit has no board.
    expect(urlForTab(root + "?canvas=luma-ios#03-event", kit)).toBe(
      root + "?brand=grok-ios",
    );
    expect(urlForTab(root + "?brand=grok-ios", canvas)).toBe(
      root + "?canvas=luma-ios",
    );
    expect(
      urlForTab(root + "?brand=grok-ios", { kind: "brand", slug: "" }),
    ).toBe(root + "?brand=");
    // The project's own view with no canvas in front is the bare address, the way it is without
    // tabs at all.
    expect(
      urlForTab(root + "?brand=grok-ios", { kind: "canvas", slug: "" }),
    ).toBe(root);
    // A document is the project's, so it takes the canvas, the kit and the board with it.
    const doc = { kind: "doc", slug: "PRD.md" } as const;
    expect(urlForTab(root + "?canvas=luma-ios#03-event", doc)).toBe(
      root + "?doc=PRD.md",
    );
    expect(urlForTab(root + "?doc=PRD.md", kit)).toBe(root + "?brand=grok-ios");
    expect(urlForTab(root + "?doc=PRD.md", canvas)).toBe(
      root + "?canvas=luma-ios",
    );
  });

  it("round-trips every tab it can write", () => {
    for (const tab of [
      { kind: "canvas", slug: "luma-ios" },
      { kind: "canvas", slug: WELCOME_PAGE_SLUG },
      { kind: "canvas", slug: "" },
      { kind: "brand", slug: "grok-ios" },
      { kind: "brand", slug: "" },
      { kind: "doc", slug: "PRD.md" },
      { kind: "doc", slug: "Research notes.md" },
    ] as const) {
      expect(tabFromUrl(urlForTab(root + "?brand=notion-ios", tab))).toEqual(
        tab,
      );
    }
  });

  it("round-trips and keeps unrelated parameters", () => {
    const href = urlForSlug(root + "?other=1", "raycast-ios", "02-home");
    expect(slugFromUrl(href)).toBe("raycast-ios");
    expect(targetFromUrl(href)).toBe("02-home");
    expect(new URL(href).searchParams.get("other")).toBe("1");
    expect(new URL(urlForSlug(href, "")).search).toBe("?other=1");
  });
});
