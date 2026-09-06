import { describe, expect, it } from "vitest";
import { tidyScreen } from "./tidy";
import type { Doc, Part } from "./tokens";

const part = (id: string, kind: Part["kind"], x: number, y: number, extra: Partial<Part> = {}): Part =>
  ({ id, screen: "s1", kind, x, y, label: "", ...extra } as Part);

const doc = (...parts: Part[]): Doc => ({
  title: "T",
  lang: "en",
  platform: "ios",
  theme: { accent: "systemBlue", scheme: "light", shape: "default", font: "system" },
  screens: [{ id: "s1", name: "A", x: 0, y: 0 }],
  parts,
});

const pos = (parts: Part[] | null, id: string) => {
  const p = parts!.find((q) => q.id === id)!;
  return { x: p.x, y: p.y };
};

describe("tidyScreen", () => {
  it("anchors bars to their edges", () => {
    const d = tidyScreen(doc(part("n", "navBar", 12, 40), part("t", "tabBar", 5, 600)), "s1")!;
    expect(pos(d, "n")).toEqual({ x: 0, y: 0 });
    expect(pos(d, "t").y).toBe(852 - 83);
    expect(pos(d, "t").x).toBe(0);
  });

  it("starts bars and body below the status bar when chrome is on", () => {
    const d2: Doc = { ...doc(part("n", "navBar", 12, 40), part("a", "text", 20, 300, { label: "a" })), screens: [{ id: "s1", name: "A", x: 0, y: 0, chrome: true }] };
    const r = tidyScreen(d2, "s1")!;
    expect(pos(r, "n").y).toBe(59); // below the system status bar
    const a = pos(r, "a");
    expect(a.y).toBeGreaterThanOrEqual(59 + 44); // body clears navBar under the status bar
  });

  it("stacks lone parts on the left margin from the top with 16pt gaps", () => {
    const d = tidyScreen(
      doc(
        part("a", "text", 20, 300, { label: "a" }),
        part("b", "text", 20, 470, { label: "b" }),
        part("c", "button", 10, 650, { label: "c" }),
      ),
      "s1",
    )!;
    const a = pos(d, "a");
    const b = pos(d, "b");
    const c = pos(d, "c");
    expect(a.x).toBe(16);
    expect(b.x).toBe(16);
    expect(c.x).toBe(16);
    expect(b.y - a.y).toBe(21 + 16); // default text height + one row gap
  });

  it("keeps rows: overlapping parts share a row with 8pt gaps, order preserved", () => {
    const d = tidyScreen(
      doc(
        part("label", "text", 16, 200, { label: "name" }),
        part("btn", "button", 250, 202, { label: "go" }),
      ),
      "s1",
    )!;
    const l = pos(d, "label");
    const b = pos(d, "btn");
    expect(l.x).toBe(16);
    expect(b.x).toBe(16 + 300 + 8); // text is 300 wide, packed with an 8pt gap
    const dy = Math.abs(b.y - l.y);
    expect(dy).toBeGreaterThanOrEqual(14); // the text is vertically centred in the 50pt row
    expect(dy).toBeLessThanOrEqual(15);
  });

  it("keeps a row's side: a right-aligned row stays right", () => {
    const d = tidyScreen(
      doc(part("b", "iconButton", 270, 210, { icon: "plus" }), part("b2", "iconButton", 329, 212, { icon: "minus" })),
      "s1",
    )!;
    const b = pos(d, "b");
    const b2 = pos(d, "b2");
    expect(b2.x + 44).toBe(393 - 16); // flush to the right margin
    expect(b2.x - (b.x + 44)).toBe(8);
  });

  it("keeps a centred row centred", () => {
    const d = tidyScreen(doc(part("b", "button", 136, 210, { label: "go" })), "s1")!;
    const b = pos(d, "b");
    expect(b.x).toBe(Math.round((393 - 160) / 2));
  });

  it("returns null when nothing would move", () => {
    const d = doc(part("n", "navBar", 0, 0), part("t", "text", 16, 100, { label: "a" }));
    expect(tidyScreen(d, "s1")).toBeNull();
  });

  it("leaves canvas-level parts alone", () => {
    const d = doc(part("c", "text", 500, 900, { label: "scratch", screen: null as unknown as string }));
    expect(tidyScreen(d, "s1")).toBeNull();
  });
});
