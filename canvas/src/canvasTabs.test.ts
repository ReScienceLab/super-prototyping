// @vitest-environment jsdom
import type { MouseEvent as ReactMouseEvent } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  brandMaterialSlugs,
  hasBrandMaterial,
  readCanvasLibrary,
  shortName,
} from "./canvasLibrary";
import {
  HOME_TAB,
  openInTab,
  readOpenTabs,
  resolveTab,
  sameTab,
  tabExists,
  tabKey,
  tabLabel,
  writeOpenTabs,
} from "./canvasTabs";
import { WELCOME_PAGE_SLUG, type CanvasTab } from "./canvasUrl";

// This checkout's own boards, through the index the page fetches: the tabs are named after
// folders, so the test asks the library which folders there are rather than naming any.
const slugs = readCanvasLibrary().map((files) => files[0].pageSlug);
const canvas = slugs.find((slug) => slug !== WELCOME_PAGE_SLUG)!;
const kit = brandMaterialSlugs()[0];
const noKit = slugs.find((slug) => !hasBrandMaterial(slug))!;

describe("a tab's name and identity", () => {
  it("identifies a tab by its kind and its folder", () => {
    expect(tabKey({ kind: "canvas", slug: "luma-ios" })).toBe(
      "canvas:luma-ios",
    );
    // The two kinds of the same folder are two tabs, which is the whole reason for the kind.
    expect(tabKey({ kind: "brand", slug: "luma-ios" })).toBe("brand:luma-ios");
    expect(
      sameTab({ kind: "canvas", slug: "a" }, { kind: "brand", slug: "a" }),
    ).toBe(false);
    expect(
      sameTab({ kind: "canvas", slug: "a" }, { kind: "canvas", slug: "a" }),
    ).toBe(true);
  });

  it("wears the page's short name, and says which kind of tab it is", () => {
    expect(tabLabel({ kind: "canvas", slug: canvas })).toBe(shortName(canvas));
    expect(tabLabel({ kind: "brand", slug: kit })).toBe(
      `${shortName(kit)} brand`,
    );
    expect(tabLabel({ kind: "brand", slug: "" })).toBe("Brand kits");
  });
});

describe("what is behind a tab", () => {
  it("knows a folder the library has from one it does not", () => {
    expect(tabExists({ kind: "canvas", slug: canvas })).toBe(true);
    expect(tabExists(HOME_TAB)).toBe(true);
    expect(tabExists({ kind: "canvas", slug: "no-such-folder" })).toBe(false);
  });

  it("knows a kit from a folder that collected no material", () => {
    expect(tabExists({ kind: "brand", slug: kit })).toBe(true);
    expect(tabExists({ kind: "brand", slug: noKit })).toBe(false);
    // The index of every kit is always there, and is what a bare brand.html opens.
    expect(tabExists({ kind: "brand", slug: "" })).toBe(true);
  });

  it("sends a kit nobody collected to the index of every kit", () => {
    expect(resolveTab({ kind: "brand", slug: noKit })).toEqual({
      kind: "brand",
      slug: "",
    });
    expect(resolveTab({ kind: "brand", slug: kit })).toEqual({
      kind: "brand",
      slug: kit,
    });
  });

  it("sends a canvas that has gone to Start here", () => {
    expect(resolveTab({ kind: "canvas", slug: "no-such-folder" })).toEqual(
      HOME_TAB,
    );
    expect(resolveTab({ kind: "canvas", slug: canvas })).toEqual({
      kind: "canvas",
      slug: canvas,
    });
  });
});

describe("the tabs a browser left open", () => {
  beforeEach(() => localStorage.clear());

  // Written through `writeOpenTabs` rather than under a key spelled out here, so the pair is
  // tested and not the spelling. The key itself is per boards directory, like the document.
  const storageKey = () => {
    writeOpenTabs([]);
    return Object.keys(localStorage)[0];
  };

  it("comes back in the order it was left, Start here excluded", () => {
    const open: CanvasTab[] = [
      { kind: "canvas", slug: canvas },
      { kind: "brand", slug: kit },
    ];
    writeOpenTabs([HOME_TAB, ...open]);
    expect(readOpenTabs()).toEqual(open);
  });

  it("drops a folder that has gone since the last visit", () => {
    writeOpenTabs([
      { kind: "canvas", slug: "no-such-folder" },
      { kind: "brand", slug: noKit },
      { kind: "canvas", slug: canvas },
    ]);
    expect(readOpenTabs()).toEqual([{ kind: "canvas", slug: canvas }]);
  });

  it("opens one tab per thing, however often it was written", () => {
    const tab: CanvasTab = { kind: "canvas", slug: canvas };
    writeOpenTabs([tab, tab]);
    expect(readOpenTabs()).toEqual([tab]);
  });

  it("starts empty rather than throwing on anything it did not write", () => {
    const key = storageKey();
    for (const junk of ["", "{}", "[1,2]", '["canvas"]', "not json"]) {
      localStorage.setItem(key, junk);
      expect(readOpenTabs()).toEqual([]);
    }
  });
});

describe("a link that is also a tab", () => {
  const click = (mods: MouseEventInit = {}) =>
    new MouseEvent("click", { cancelable: true, ...mods });

  const open = (event: MouseEvent, tab: CanvasTab) => {
    const opened: CanvasTab[] = [];
    openInTab((tab) => opened.push(tab), tab)(
      event as unknown as ReactMouseEvent<HTMLAnchorElement>,
    );
    return opened;
  };

  it("takes the plain click and opens the tab instead of the page", () => {
    const tab: CanvasTab = { kind: "brand", slug: kit };
    const event = click();
    expect(open(event, tab)).toEqual([tab]);
    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves a modified click to the browser, so the page is still a page", () => {
    for (const mod of ["metaKey", "ctrlKey", "shiftKey", "altKey"] as const) {
      const event = click({ [mod]: true });
      expect(open(event, { kind: "brand", slug: kit })).toEqual([]);
      expect(event.defaultPrevented).toBe(false);
    }
  });
});
