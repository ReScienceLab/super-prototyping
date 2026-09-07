import { describe, expect, it } from "vitest";
import type { SpAsset, SpNode, SpToken } from "./inspectorAgent";
import {
  assetRows,
  formatBytes,
  isColorValue,
  layerKind,
  layerName,
  layerSelector,
  tokenGroups,
  tokenVia,
} from "./inspectorModel";

const asset = (over: Partial<SpAsset>): SpAsset => ({
  key: "100:abc",
  uri: "data:image/png;base64,AAAA",
  via: "img",
  mime: "image/png",
  chars: 100,
  w: 160,
  h: 160,
  alt: "",
  uses: [3],
  ...over,
});

describe("assetRows", () => {
  it("names an image from the folder index by content key", () => {
    const [row] = assetRows([asset({})], { "100:abc": { name: "assets/hero.png", bytes: 75 } });
    expect(row.name).toBe("assets/hero.png");
    expect(row.source).toBe("file");
    expect(row.bytes).toBe(75);
  });

  it("falls back to alt for a re-encoded image, marked as such", () => {
    const [row] = assetRows([asset({ alt: "Find My" })], {});
    expect(row.name).toBe("Find My");
    expect(row.source).toBe("alt");
  });

  it("falls back to format and size when there is neither, with decoded bytes", () => {
    const [row] = assetRows([asset({ chars: 400 })], undefined);
    expect(row.name).toBe("png 160×160");
    expect(row.source).toBe("none");
    expect(row.bytes).toBe(300);
  });
});

describe("formatBytes", () => {
  it("picks the unit", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(204800)).toBe("200 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});

const node = (over: Partial<SpNode>): SpNode => ({
  i: 5,
  tag: "div",
  cls: "",
  text: "",
  alt: "",
  depth: 1,
  parent: 0,
  img: false,
  box: null,
  ...over,
});

describe("layers", () => {
  it("names by text, then asset, then class, then tag", () => {
    expect(layerName(node({ text: "Confirm" }))).toBe("Confirm");
    expect(layerName(node({ tag: "img", img: true }), "assets/a.png")).toBe("assets/a.png");
    expect(layerName(node({ cls: "card on" }))).toBe("card");
    expect(layerName(node({}))).toBe("div");
    expect(layerName(node({ i: 0, cls: "phone dark" }))).toBe("phone");
  });

  it("classifies the row's icon", () => {
    expect(layerKind(node({ i: 0 }))).toBe("frame");
    expect(layerKind(node({ img: true, text: "x" }))).toBe("image");
    expect(layerKind(node({ text: "x" }))).toBe("text");
    expect(layerKind(node({}))).toBe("box");
  });

  it("spells the selector", () => {
    expect(layerSelector(node({ tag: "span", cls: "t  big" }))).toBe("span.t.big");
    expect(layerSelector(node({}))).toBe("div");
  });
});

const token = (over: Partial<SpToken>): SpToken => ({
  name: "--x",
  decl: "#fff",
  group: null,
  note: "",
  value: "#fff",
  kind: "color",
  canon: "rgb(255, 255, 255)",
  refs: [],
  usedBy: [],
  overrides: [],
  ...over,
});

describe("tokenGroups", () => {
  it("keeps the author's headings and order, leading tokens first, scoped last", () => {
    const tokens = [
      token({ name: "--font", kind: "family" }),
      token({ name: "--bg", group: "Surface" }),
      token({ name: "--ink", group: "Ink" }),
      token({ name: "--only-dark", scoped: true, kind: "unset" }),
    ];
    const groups = [
      { name: "Surface", tokens: ["--bg"] },
      { name: "Ink", tokens: ["--ink"] },
      { name: "Empty", tokens: [] },
    ];
    expect(tokenGroups(tokens, groups).map((g) => [g.name, g.tokens.map((t) => t.name)])).toEqual([
      ["", ["--font"]],
      ["Surface", ["--bg"]],
      ["Ink", ["--ink"]],
      ["Scoped only", ["--only-dark"]],
    ]);
  });

  it("groups by kind when the board wrote no headings", () => {
    const tokens = [
      token({ name: "--a" }),
      token({ name: "--w", kind: "length", value: "12px" }),
      token({ name: "--b" }),
    ];
    expect(tokenGroups(tokens, []).map((g) => [g.name, g.tokens.map((t) => t.name)])).toEqual([
      ["Colours", ["--a", "--b"]],
      ["Lengths", ["--w"]],
    ]);
  });
});

describe("tokenVia", () => {
  it("names the used tokens that carry an unused one", () => {
    const font = token({ name: "--sa-font", kind: "family" });
    const time = token({ name: "--sa-t-time", kind: "font", refs: ["--sa-font"], usedBy: [1] });
    const idle = token({ name: "--sa-t-idle", kind: "font", refs: ["--sa-font"] });
    expect(tokenVia(font, [font, time, idle])).toEqual(["--sa-t-time"]);
    expect(tokenVia(time, [font, time, idle])).toEqual([]);
  });
});

describe("isColorValue", () => {
  it("trusts a kind when it has one, and the shape of the string otherwise", () => {
    expect(isColorValue("12px", "color")).toBe(true);
    expect(isColorValue("#F0A468")).toBe(true);
    expect(isColorValue("rgba(0,0,0,.5)")).toBe(true);
    expect(isColorValue("590 18px/18px -apple-system")).toBe(false);
  });
});
