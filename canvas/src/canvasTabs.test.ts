// @vitest-environment jsdom
import type { MouseEvent as ReactMouseEvent } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { canvasIndex } from "./canvasIndex";
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
  tabExists,
  tabFor,
  tabKey,
  tabLabel,
  tabOfProject,
  withTab,
  writeOpenTabs,
  type ProjectTab,
} from "./canvasTabs";
import { WELCOME_PAGE_SLUG, type CanvasTab } from "./canvasUrl";

// This checkout's own boards, through the index the page fetches: the tabs are named after
// folders, so the test asks the library which folders there are rather than naming any.
const slugs = readCanvasLibrary().map((files) => files[0].pageSlug);
const canvas = slugs.find((slug) => slug !== WELCOME_PAGE_SLUG)!;
const kit = brandMaterialSlugs()[0];
const noKit = slugs.find((slug) => !hasBrandMaterial(slug))!;

const project = (url: string, view: CanvasTab = HOME_TAB): ProjectTab => ({
  kind: "project",
  url,
  name: url,
  icon: null,
  view,
});

/** One of this checkout's folders, flagged the way the desktop app's server flags an example. */
function asExample(slug: string) {
  const board = canvasIndex().boards.find((b) => b.slug === slug)!;
  board.example = true;
  return () => delete board.example;
}

describe("a tab is a project", () => {
  let unflag = () => false;
  afterEach(() => unflag());

  it("identifies a project by its address and an example by its folder, not by the view", () => {
    expect(tabKey(project("/p/a/"))).toBe("project:/p/a/");
    expect(tabKey(project("/p/a/", { kind: "brand", slug: kit }))).toBe(
      "project:/p/a/",
    );
    expect(tabKey({ kind: "example", slug: "a", view: HOME_TAB })).toBe(
      "example:a",
    );
  });

  it("puts every view of this project's under its one tab, and an example's under its own", () => {
    expect(tabFor({ kind: "canvas", slug: canvas })).toMatchObject({
      kind: "project",
      url: "/",
      view: { kind: "canvas", slug: canvas },
    });
    expect(tabFor(HOME_TAB)).toMatchObject({ kind: "project", url: "/" });
    unflag = asExample(canvas);
    const brand: CanvasTab = { kind: "brand", slug: canvas };
    expect(tabFor(brand)).toEqual({
      kind: "example",
      slug: canvas,
      view: brand,
    });
  });

  it("keeps a tab's place on the bar and takes the view it now has in front", () => {
    const a = project("/p/a/");
    const b = project("/p/b/");
    const moved = project("/p/a/", { kind: "canvas", slug: canvas });
    expect(withTab([a, b], moved)).toEqual([moved, b]);
    expect(withTab([a], b)).toEqual([a, b]);
  });

  it("opens a project on its latest canvas, with the latest icon, or where it was left", () => {
    const p = {
      name: "Shop",
      url: "../shop/",
      canvases: [
        { slug: "old", updated: 1, icon: true },
        { slug: "new", updated: 3, icon: false },
        { slug: "mid", updated: 2, icon: true },
      ],
    };
    expect(tabOfProject(p, [])).toEqual({
      kind: "project",
      url: "/shop/",
      name: "Shop",
      icon: "/shop/board/mid/icon.png",
      view: { kind: "canvas", slug: "new" },
    });
    const left = project("/shop/", { kind: "brand", slug: "mid" });
    expect(tabOfProject(p, [left])).toBe(left);
    expect(tabOfProject({ ...p, canvases: [] }, [])).toMatchObject({
      icon: null,
      view: HOME_TAB,
    });
  });

  it("labels a canvas by its page's short name, and says which kind of tab it is", () => {
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

  // Written through `writeOpenTabs` rather than under a key spelled out here, so the test covers
  // the pair and not the spelling. The key itself is per boards directory, like the document.
  const storageKey = () => {
    writeOpenTabs([]);
    return Object.keys(localStorage)[0];
  };

  it("comes back in the order it was left", () => {
    const unflag = asExample(canvas);
    const open: ProjectTab[] = [
      project("/p/b/", { kind: "brand", slug: kit }),
      { kind: "example", slug: canvas, view: { kind: "canvas", slug: canvas } },
      project("/p/a/"),
    ];
    writeOpenTabs(open);
    expect(readOpenTabs()).toEqual(open);
    unflag();
  });

  it("drops an example this server no longer has, and keeps another project's tab", () => {
    writeOpenTabs([
      { kind: "example", slug: canvas, view: HOME_TAB },
      project("/p/elsewhere/"),
    ]);
    expect(readOpenTabs()).toEqual([project("/p/elsewhere/")]);
  });

  it("opens one tab per project, however often it was written", () => {
    writeOpenTabs([
      project("/p/a/"),
      project("/p/a/", { kind: "canvas", slug: canvas }),
    ]);
    expect(readOpenTabs()).toEqual([project("/p/a/")]);
  });

  it("starts empty rather than throwing on anything it did not write", () => {
    const key = storageKey();
    for (const junk of [
      "",
      "{}",
      "[1,2]",
      '["canvas"]',
      '[{"kind":"canvas","slug":"a"}]',
      "not json",
    ]) {
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
