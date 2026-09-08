import { describe, expect, it } from "vitest";
import type { TLCommentAnchor, TLShapeId } from "tldraw";
import type { SpAsset, SpNode, SpToken } from "./inspectorAgent";
import type { AssetRow } from "./inspectorModel";
import {
  assetForNode,
  assetRows,
  boardPin,
  newBoardPin,
  fitScale,
  initialLayersH,
  layersBounds,
  nextLayersH,
  nextPanelW,
  nextRailW,
  panelBounds,
  railBounds,
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

  const vector = (over: Partial<SpAsset>) =>
    asset({
      key: "svg:k1:c1",
      via: "svg",
      mime: "image/svg+xml",
      uri: "data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E",
      svg: "<svg/>",
      chars: 6,
      w: 28.705,
      h: 23.719,
      ...over,
    });

  it("names a vector from the folder's icon by geometry key, and carries its markup", () => {
    const names = { "svg:k1": { name: "assets/icons/tab-photos.svg", bytes: 2100 } };
    const [row, other] = assetRows([vector({}), vector({ key: "svg:k1:c2", svg: "<svg fill='red'/>" })], names);
    expect(other.name).toBe("assets/icons/tab-photos.svg");
    expect(other.svg).toBe("<svg fill='red'/>");
    expect(row.name).toBe("assets/icons/tab-photos.svg");
    expect(row.source).toBe("file");
    expect(row.svg).toBe("<svg/>");
  });

  it("names a fileless vector from the label the agent guessed, marked as a guess", () => {
    const [row] = assetRows([vector({ alt: "All Photos" })], {});
    expect(row.name).toBe("All Photos");
    expect(row.source).toBe("label");
    expect(row.bytes).toBe(6);
  });

  it("falls back to svg and its viewBox size", () => {
    const [row] = assetRows([vector({})], undefined);
    expect(row.name).toBe("svg 28.705×23.719");
    expect(row.source).toBe("none");
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
    expect(layerKind(node({ tag: "svg", img: true }))).toBe("vector");
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

describe("panel geometry", () => {
  it("widens the panel when its left edge is dragged left", () => {
    expect(nextPanelW(736, -100, 1600)).toBe(836);
    expect(nextPanelW(736, 100, 1600)).toBe(636);
  });

  it("keeps the canvas and the preview from being dragged away entirely", () => {
    expect(nextPanelW(736, -9999, 1600)).toBe(1320); // viewport - 280
    expect(nextPanelW(736, 9999, 1600)).toBe(360);
    expect(nextRailW(280, -9999, 736)).toBe(496); // panel - 240
    expect(nextRailW(280, 9999, 736)).toBe(200);
  });

  it("prefers the minimum when a small viewport crosses the two bounds", () => {
    // 300 - 280 = 20, below the 360 minimum: a pinned-open panel beats a negative one.
    expect(nextPanelW(736, 0, 300)).toBe(360);
  });

  it("opens the layers list on a share of the window, held off both ends", () => {
    expect(initialLayersH(1127)).toBe(507); // the 24-layer board, ~20 rows visible
    expect(initialLayersH(700)).toBe(315);
    expect(initialLayersH(360)).toBe(200); // floor: properties keep their room
    expect(initialLayersH(2000)).toBe(560); // ceiling: past this you scroll either way
  });

  it("grows the layers list downward, which is the drag the fixed 240px needed", () => {
    expect(nextLayersH(240, 160, 1000)).toBe(400);
    expect(nextLayersH(240, -9999, 1000)).toBe(72);
    expect(nextLayersH(240, 9999, 1000)).toBe(800); // viewport - 200
  });

  it("re-clamps a value whose bound has since moved, which is what render does", () => {
    // A rail dragged wide, then the panel dragged to its minimum: the stage keeps a strip.
    const panel = nextPanelW(736, 9999, 1600);
    expect(nextRailW(496, 0, panel)).toBe(200);
    expect(panel - nextRailW(496, 0, panel)).toBe(160);
    // A panel dragged wide, then the window shrunk under it.
    expect(nextPanelW(1320, 0, 900)).toBe(620);
    // A layers list dragged tall, then the window shrunk: the grip stays inside the rail.
    expect(nextLayersH(880, 0, 900)).toBe(700);
    expect(nextLayersH(880, 0, 900)).toBeLessThan(900);
  });

  it("reports the same bounds it clamps to, which is what the grips announce", () => {
    expect(panelBounds(1600)).toEqual([360, 1320]);
    expect(railBounds(736)).toEqual([200, 496]);
    expect(layersBounds(1000)).toEqual([72, 800]);
    // Crossed bounds collapse onto the minimum rather than inverting.
    expect(panelBounds(300)).toEqual([360, 360]);
    expect(railBounds(360)).toEqual([200, 200]);
  });

  it("contains the board in the stage and never enlarges past 1:1", () => {
    // A phone board in a roomy stage: capped, not blown up.
    expect(fitScale({ w: 900, h: 1200 }, { w: 393, h: 852 })).toBe(1);
    // Height-bound: (852 - 32) / 852.
    expect(fitScale({ w: 900, h: 852 }, { w: 393, h: 852 })).toBeCloseTo(820 / 852, 6);
    // A landscape evidence board fits by width.
    expect(fitScale({ w: 432, h: 900 }, { w: 1200, h: 400 })).toBeCloseTo(400 / 1200, 6);
  });
});

describe("assetForNode", () => {
  const rows = [
    { key: "a", uses: [3, 4] },
    { key: "b", uses: [9] },
  ] as unknown as AssetRow[];

  it("finds the image a selected layer draws", () => {
    expect(assetForNode(rows, 4)?.key).toBe("a");
    expect(assetForNode(rows, 9)?.key).toBe("b");
  });

  it("is null for no selection and for a layer that draws nothing", () => {
    expect(assetForNode(rows, null)).toBeNull();
    expect(assetForNode(rows, 7)).toBeNull();
  });

  it("takes the first row when one layer draws two images, as the layer name does", () => {
    const both = [{ key: "bg", uses: [2] }, { key: "fg", uses: [2] }] as unknown as AssetRow[];
    expect(assetForNode(both, 2)?.key).toBe("bg");
  });
});

describe("boardPin", () => {
  const shapeId = "shape:board" as TLShapeId;
  const at = (x: number, y: number, id = shapeId): TLCommentAnchor => ({
    type: "shape",
    shapeId: id,
    x,
    y,
    isPrecise: true,
  });

  it("is null for a thread anchored to another board, or to no board at all", () => {
    expect(boardPin(at(0.5, 0.5, "shape:other" as TLShapeId), shapeId)).toBeNull();
    expect(boardPin({ type: "point", x: 10, y: 20 }, shapeId)).toBeNull();
  });

  it("keeps a thread dropped beside the board, and says it is not on it", () => {
    expect(boardPin(at(0.25, 0.75), shapeId)).toEqual({ x: 0.25, y: 0.75, inside: true });
    expect(boardPin(at(-0.1, 0.5), shapeId)).toEqual({ x: -0.1, y: 0.5, inside: false });
    expect(boardPin(at(0.5, 1.4), shapeId)).toEqual({ x: 0.5, y: 1.4, inside: false });
  });
});

describe("newBoardPin", () => {
  const board = { w: 400, h: 1000 };

  it("pins to the middle of the board when nothing is selected", () => {
    expect(newBoardPin(null, board)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("pins to the middle of the selected layer", () => {
    expect(newBoardPin({ x: 100, y: 200, w: 200, h: 100 }, board)).toEqual({ x: 0.5, y: 0.25 });
  });
});
