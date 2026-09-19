// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { rasterSize } from "./svgRaster";

/** What the browser reports for a vector it could not measure, which is the interesting case. */
const unmeasured = { w: 0, h: 0 };

describe("rasterSize", () => {
  it("scales a stated size so its long edge is the raster edge", () => {
    const svg =
      '<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg"/>';
    expect(rasterSize(svg, unmeasured)).toEqual({ w: 1024, h: 512 });
  });

  it("keeps a viewBox-only icon square rather than taking the browser's 300x150", () => {
    const svg = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"/>';
    expect(rasterSize(svg, { w: 300, h: 150 })).toEqual({ w: 1024, h: 1024 });
  });

  it("ignores a relative width and falls through to the viewBox", () => {
    const svg = '<svg width="100%" height="100%" viewBox="0 0 40 10"/>';
    expect(rasterSize(svg, unmeasured)).toEqual({ w: 1024, h: 256 });
  });

  it("reads the root's own size, not a child's", () => {
    const svg = '<svg viewBox="0 0 10 20"><rect width="999" height="1"/></svg>';
    expect(rasterSize(svg, unmeasured)).toEqual({ w: 512, h: 1024 });
  });

  it("falls back to what the browser measured when the markup states nothing", () => {
    expect(rasterSize("<svg/>", { w: 64, h: 32 })).toEqual({ w: 1024, h: 512 });
  });

  it("gives an unparseable file a square rather than a zero-sized canvas", () => {
    expect(rasterSize("<svg", unmeasured)).toEqual({ w: 1024, h: 1024 });
  });

  it("keeps a pixel of a sliver too thin to round to one", () => {
    // 5000:1 scales to 0.2 of a pixel. Rounded it is nothing, and a canvas with a zero side
    // hands toBlob back no blob at all, which rasterizeSvg then reports as a failed drawing.
    const svg =
      '<svg viewBox="0 0 5000 1" xmlns="http://www.w3.org/2000/svg"/>';
    expect(rasterSize(svg, unmeasured)).toEqual({ w: 1024, h: 1 });
  });
});
