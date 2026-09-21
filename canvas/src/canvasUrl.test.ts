import { describe, expect, it } from "vitest";
import {
  canvasPageUrl,
  sheetPageUrl,
  WELCOME_PAGE_SLUG,
  tabFromUrl,
  targetFromUrl,
  slugFromUrl,
  urlForSlug,
  urlForTab,
} from "./canvasUrl";

// The address is what people paste to each other, so both directions have to agree: the URL a
// page writes must open that page, the URL a board writes must open that board, and the welcome
// page must write the bare URL back.
describe("canvas URLs", () => {
  const root = "https://prototyping.rescience.com/";

  it("reads a page slug and falls back to the welcome page", () => {
    expect(slugFromUrl(root + "?canvas=luma-ios")).toBe("luma-ios");
    expect(slugFromUrl(root)).toBe(WELCOME_PAGE_SLUG);
    expect(slugFromUrl(root + "?other=1")).toBe(WELCOME_PAGE_SLUG);
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

  it("writes a page as ?canvas= and the welcome page as the bare URL", () => {
    expect(urlForSlug(root, "luma-ios")).toBe(root + "?canvas=luma-ios");
    expect(urlForSlug(root + "?canvas=luma-ios", "notion-ios")).toBe(
      root + "?canvas=notion-ios",
    );
    expect(urlForSlug(root + "?canvas=luma-ios", WELCOME_PAGE_SLUG)).toBe(root);
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
    expect(urlForSlug(root, WELCOME_PAGE_SLUG, "00-welcome")).toBe(
      root + "#00-welcome",
    );
  });

  it("links between the canvas and the sheet by swapping the file", () => {
    expect(canvasPageUrl("luma-ios")).toBe("/?canvas=luma-ios");
    // The welcome page is the bare address on the canvas, and a page like any other on the sheet.
    expect(canvasPageUrl(WELCOME_PAGE_SLUG)).toBe("/");
    expect(sheetPageUrl("luma-ios")).toBe("/sheet.html?canvas=luma-ios");
    expect(slugFromUrl(root + sheetPageUrl("luma-ios").slice(1))).toBe(
      "luma-ios",
    );
  });

  it("reads the tab in front, which is a canvas unless a kit says otherwise", () => {
    expect(tabFromUrl(root)).toEqual({
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
    // The kit takes the canvas parameter with it, and the board too: a kit has no board.
    expect(urlForTab(root + "?canvas=luma-ios#03-event", kit)).toBe(
      root + "?brand=grok-ios",
    );
    expect(urlForTab(root + "?brand=grok-ios", canvas)).toBe(
      root + "?canvas=luma-ios",
    );
    expect(urlForTab(root + "?brand=grok-ios", { kind: "brand", slug: "" })).toBe(
      root + "?brand=",
    );
    // Start here is the bare address on a canvas tab, the way it is without tabs at all.
    expect(
      urlForTab(root + "?brand=grok-ios", {
        kind: "canvas",
        slug: WELCOME_PAGE_SLUG,
      }),
    ).toBe(root);
  });

  it("round-trips every tab it can write", () => {
    for (const tab of [
      { kind: "canvas", slug: "luma-ios" },
      { kind: "canvas", slug: WELCOME_PAGE_SLUG },
      { kind: "brand", slug: "grok-ios" },
      { kind: "brand", slug: "" },
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
    expect(new URL(urlForSlug(href, WELCOME_PAGE_SLUG)).search).toBe(
      "?other=1",
    );
  });
});
