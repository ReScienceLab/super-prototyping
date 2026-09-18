// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readDraft } from "./chatDraft";

const box = (html: string) => {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el;
};

describe("readDraft", () => {
  it("reads a reference as the number the sentence means by it", () => {
    const draft = box(
      'keep the grabber from <span class="sp-chat-ref" data-ref="1"><img alt="">#1</span> here',
    );
    expect(readDraft(draft)).toBe("keep the grabber from #1 here");
  });

  // The chip draws "#12" itself, so walking into it would send the number twice.
  it("counts a reference once, whatever it is drawn from", () => {
    expect(readDraft(box('<span data-ref="12"><img alt="x"><b>#12</b></span>'))).toBe(
      "#12",
    );
  });

  it("reads the command badge as the word it draws", () => {
    expect(
      readDraft(box('<span class="sp-chat-cmd">/clone-prototype</span> the sheet')),
    ).toBe("/clone-prototype the sheet");
  });

  // Shift+Enter makes a break; paste makes a block. Both are one newline.
  it("reads a break and a pasted block alike", () => {
    expect(readDraft(box("one<br>two"))).toBe("one\ntwo");
    expect(readDraft(box("one<div>two</div>"))).toBe("one\ntwo");
    expect(readDraft(box("<div>one</div><div>two</div>"))).toBe("one\ntwo");
  });

  it("reads an empty box as nothing to send", () => {
    expect(readDraft(box(""))).toBe("");
  });
});
