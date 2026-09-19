// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { namedPictures, readDraft, slashWord } from "./chatDraft";

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
    expect(
      readDraft(box('<span data-ref="12"><img alt="x"><b>#12</b></span>')),
    ).toBe("#12");
  });

  it("reads the command badge as the word it draws", () => {
    expect(
      readDraft(
        box('<span class="sp-chat-cmd">/clone-prototype</span> the sheet'),
      ),
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

describe("namedPictures", () => {
  it("names every number the box points at, in the order it draws them", () => {
    // The panel compares one reading with the last to see what has been deleted, so a number that
    // is written twice has to come back twice: one of the two going is not the picture going.
    expect(
      namedPictures(
        box(
          'from <span data-ref="2"><img alt="">#2</span> and ' +
            '<span data-ref="1"><img alt="">#1</span>, like <span data-ref="2">#2</span>',
        ),
      ),
    ).toEqual([2, 1, 2]);
    expect(
      namedPictures(box('<span class="sp-chat-cmd">/clone</span> this')),
    ).toEqual([]);
  });

  it("counts a struck-through chip, which is what stops a number being handed out twice", () => {
    // Removing a picture strikes its chip through and takes the thumbnail out, but the chip still
    // reads as "#1": start the numbering over with that in the box and the sentence would end up
    // pointing at whatever came next. Only an empty box is clear.
    expect(
      namedPictures(
        box(
          '<span class="sp-chat-ref sp-chat-ref-gone" data-ref="1">#1</span>',
        ),
      ),
    ).toEqual([1]);
    expect(namedPictures(box(""))).toEqual([]);
  });
});

it("the palette's word is the slash word the draft ends in, wherever it starts", () => {
  expect(slashWord("/")).toBe("");
  expect(slashWord("/cl")).toBe("cl");
  expect(slashWord("fix the header /cl")).toBe("cl");
  expect(slashWord("fix the header\n/cl")).toBe("cl");
  expect(slashWord("/clone-prototype the app")).toBeUndefined();
  expect(slashWord("a/b")).toBeUndefined();
  expect(slashWord("")).toBeUndefined();
});
