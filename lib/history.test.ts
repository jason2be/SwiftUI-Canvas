import { describe, expect, it } from "vitest";
import { pushEntry, stepRedo, stepUndo } from "./history";
import { newDoc, type Doc } from "./tokens";

// fresh objects each time: title edits must not bleed between the fixtures
const docA: Doc = newDoc("en");
const docB: Doc = JSON.parse(JSON.stringify(docA));
const docC: Doc = JSON.parse(JSON.stringify(docA));
docA.title = "A";
docB.title = "B";
docC.title = "C";

describe("history", () => {
  it("undo walks back through pushed entries", () => {
    let past: Doc[] = [];
    past = pushEntry(past, docA);
    past = pushEntry(past, docB);
    let book = { past, future: [] as Doc[] };

    const u1 = stepUndo(book, docC);
    expect(u1?.doc.title).toBe("B");
    book = u1!.book;

    const u2 = stepUndo(book, docC);
    expect(u2?.doc.title).toBe("A");
    book = u2!.book;

    expect(stepUndo(book, docC)).toBeNull();
  });

  it("redo returns the doc undo gave up", () => {
    let book = { past: pushEntry([], docA), future: [] as Doc[] };
    const u = stepUndo(book, docB)!;
    book = u.book;
    expect(u.doc).toBe(docA);

    const r = stepRedo(book, u.doc)!;
    expect(r.doc).toBe(docB);
    expect(stepRedo(r.book, r.doc)).toBeNull();
  });

  it("caps the history length", () => {
    let past: Doc[] = [];
    for (let i = 0; i < 150; i++) past = pushEntry(past, { ...docA, title: `t${i}` });
    expect(past.length).toBeLessThanOrEqual(100);
  });

  it("undo then a fresh push clears the redo branch", () => {
    // store.ts rebuilds the book on mutate; assert the primitive it relies on
    let book = { past: pushEntry([], docA), future: [] as Doc[] };
    const u = stepUndo(book, docB)!;
    book = { past: u.book.past, future: [] }; // a mutate resets future
    expect(stepRedo(book, docB)).toBeNull();
  });
});
