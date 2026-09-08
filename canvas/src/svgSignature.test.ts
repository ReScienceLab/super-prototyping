import { describe, expect, it } from "vitest";
import { AGENT } from "./inspectorAgent";
import { svgSignature } from "./svgSignature";

// The committed file, and the same glyph as apple-photos' icon() writes it into a board: root
// attributes injected, then the agent's own data-sp marks, then the colour written in.
const FILE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="39.397 7.021 28.705 23.719" fill="currentColor">
  <path id="&#244;&#128;" d="M53.6489 21.5869C54.2853 21.5869
    54.8319 21.3548 55.2886 20.8906Z" fill="currentColor"/>
</svg>`;
const BOARD =
  '<svg preserveAspectRatio="none" class="" style="width:28.705px;height:23.719px" xmlns="http://www.w3.org/2000/svg" viewBox="39.397 7.021 28.705 23.719" fill="rgb(10, 132, 255)" data-sp="41">' +
  '<path id="ô" d="M53.6489 21.5869C54.2853 21.5869 54.8319 21.3548 55.2886 20.8906Z" fill="rgb(10, 132, 255)" data-sp="42"></path></svg>';

describe("svgSignature", () => {
  it("signs the file and the board's rewrite of it alike", () => {
    expect(svgSignature(BOARD)).toBe(svgSignature(FILE));
  });

  it("is the geometry: a moved point changes it, a colour does not", () => {
    expect(svgSignature(FILE.replace("55.2886", "55.3"))).not.toBe(svgSignature(FILE));
    expect(svgSignature(FILE.replace('fill="currentColor"/>', 'fill="#f00"/>'))).toBe(svgSignature(FILE));
    expect(svgSignature(FILE.replace('viewBox="39.397', 'viewBox="0'))).not.toBe(svgSignature(FILE));
  });

  it("reads every shape element, in order, with its own attributes", () => {
    const a = '<svg viewBox="0 0 4 4"><rect x="1" y="1" width="2" height="2"/><circle cx="2" cy="2" r="1"/></svg>';
    const b = '<svg viewBox="0 0 4 4"><circle cx="2" cy="2" r="1"/><rect x="1" y="1" width="2" height="2"/></svg>';
    expect(svgSignature(a)).toBe("0 0 4 4 rect||1|1|2|2|||||||||| circle||||||1|||2|2|||||");
    expect(svgSignature(a)).not.toBe(svgSignature(b));
  });

  it("rides in the agent as its own source, so the frame keys a vector as the index does", () => {
    expect(AGENT).toContain("<script>var svgSignature=function");
    expect(AGENT).toContain("svg:'+fnv(svgSignature(");
  });
});
