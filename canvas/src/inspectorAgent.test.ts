import { describe, expect, it } from "vitest";
import { AGENT, injectAgent } from "./inspectorAgent";

describe("AGENT", () => {
  it("is one script tag", () => {
    expect(AGENT.startsWith("<script>")).toBe(true);
    expect(AGENT.endsWith("</script>")).toBe(true);
    expect(AGENT.indexOf("</script>")).toBe(AGENT.length - "</script>".length);
  });

  it("stays template-literal safe: no backtick, no dollar-brace inside the source", () => {
    const body = AGENT.slice("<script>".length, -"</script>".length);
    expect(body).not.toContain("`");
    expect(body).not.toContain("${");
  });

  it("carries a regex backslash through untouched", () => {
    // `String.raw` is what keeps the resolver's regexes readable; a plain template would need
    // every backslash doubled and would silently turn `\s` into `s`.
    expect(AGENT).toContain("replace(/^\\s+|\\s+$/g,'')");
  });

  it("inlines a same-document <use> and passes over a sprite host's own definitions", () => {
    // Issue #73: a <use href="#id"> cloned alone dangles, and a <defs> of <symbol>s draws nothing.
    expect(AGENT).toContain("document.getElementById(h.slice(1))");
    expect(AGENT).toContain(":not(defs *,symbol *)");
  });
});

describe("injectAgent", () => {
  it("splices before </body> when there is one", () => {
    const out = injectAgent("<html><body><p>x</p></body></html>");
    expect(out).toBe(`<html><body><p>x</p>${AGENT}</body></html>`);
  });

  it("appends when there is none — the apple-* generators emit no </body>", () => {
    const html = "<html><body><p>x</p>";
    expect(injectAgent(html)).toBe(html + AGENT);
  });

  it("matches the closing tag case-insensitively and only once", () => {
    const out = injectAgent("<BODY></BODY>");
    expect(out).toBe(`<BODY>${AGENT}</BODY>`);
  });
});
