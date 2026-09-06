import { describe, expect, it } from "vitest";
import { alignParts, bodyRect, type AlignKind } from "./align";
import type { Part } from "./tokens";

const base = { screen: "s", variant: "plain" } as const;

const part = (id: string, kind: Part["kind"], x: number, y: number, extra: Partial<Part> = {}): Part =>
  ({ id, kind, x, y, label: "", ...base, ...extra }) as Part;

const doc = (parts: Part[]) => ({ parts });

describe("bodyRect", () => {
  it("sits between the bars inside the margins", () => {
    const d = doc([
      part("nav", "navBar", 0, 0, { h: 96, w: 393 }),
      part("tab", "tabBar", 0, 769, { h: 83, w: 393 }),
    ]);
    const r = bodyRect(d, "s");
    expect(r).toEqual({ l: 16, t: 112, r: 377, b: 753 });
  });

  it("ignores a bar being moved", () => {
    const d = doc([part("nav", "navBar", 0, 0, { h: 96, w: 393 })]);
    const r = bodyRect(d, "s", new Set(["nav"]));
    expect(r.t).toBe(16);
  });
});

describe("alignParts", () => {
  it("centers one part on the body", () => {
    const d = doc([part("a", "button", 200, 300, { w: 160, h: 50 })]);
    const out = alignParts(d, ["a"], "centerH");
    expect(out).toEqual([{ id: "a", x: 117, y: 300 }]); // (393-160)/2 = 116.5 -> 117
  });

  it("aligns several parts to each other", () => {
    const d = doc([
      part("a", "button", 16, 100, { w: 160, h: 50 }),
      part("b", "button", 60, 200, { w: 160, h: 50 }),
      part("c", "button", 90, 300, { w: 160, h: 50 }),
    ]);
    const out = alignParts(d, ["a", "b", "c"], "left");
    expect(out!.find((m) => m.id === "b")!.x).toBe(16);
    expect(out!.find((m) => m.id === "c")!.x).toBe(16);
  });

  it("distributes horizontally keeping the outers", () => {
    const d = doc([
      part("a", "button", 16, 100, { w: 50, h: 50 }),
      part("b", "button", 100, 130, { w: 50, h: 50 }),
      part("c", "button", 210, 160, { w: 50, h: 50 }),
    ]);
    const out = alignParts(d, ["a", "b", "c"], "distributeH");
    expect(out![0]).toEqual({ id: "a", x: 16, y: 100 }); // outer stays
    expect(out![2]).toEqual({ id: "c", x: 210, y: 160 }); // outer stays
    expect(out![1].x).toBeGreaterThan(100); // middle moves right
  });

  it("refuses to distribute two parts", () => {
    const d = doc([
      part("a", "button", 16, 100, { w: 50, h: 50 }),
      part("b", "button", 100, 100, { w: 50, h: 50 }),
    ]);
    expect(alignParts(d, ["a", "b"], "distributeH")).toBeNull();
  });

  it("steps a moved part aside instead of landing on another part", () => {
    const blocker = part("blocker", "card", 16, 112, { w: 361, h: 140 });
    const d = doc([blocker, part("a", "button", 200, 500, { w: 160, h: 50 })]);
    const out = alignParts(d, ["a"], "top");
    const m = out!.find((x) => x.id === "a")!;
    expect(m.y).not.toBe(112); // not on the blocker
    expect(m.x).toBe(200); // x untouched
    // it must be clear of the blocker
    const blockerRect = { l: 16, t: 112, r: 377, b: 252 };
    expect(m.y + 50 <= blockerRect.t || m.y >= blockerRect.b).toBe(true);
  });

  it("returns null when nothing would move", () => {
    const d = doc([part("a", "button", 16, 112, { w: 160, h: 50 })]);
    expect(alignParts(d, ["a"], "left")).toBeNull();
  });

  it("never mixes screens", () => {
    const a = { ...part("a", "button", 16, 100, { w: 160, h: 50 }), screen: "s1" };
    const b = { ...part("b", "button", 16, 100, { w: 160, h: 50 }), screen: "s2" };
    expect(alignParts(doc([a, b]), ["a", "b"], "left")).toBeNull();
  });

  it("covers all eight kinds without throwing", () => {
    const d = doc([
      part("a", "button", 16, 100, { w: 160, h: 50 }),
      part("b", "button", 100, 200, { w: 160, h: 50 }),
      part("c", "button", 200, 300, { w: 160, h: 50 }),
    ]);
    for (const k of ["left", "centerH", "right", "distributeH", "top", "centerV", "bottom", "distributeV"] as AlignKind[]) {
      alignParts(d, ["a"], k);
      alignParts(d, ["a", "b"], k);
      alignParts(d, ["a", "b", "c"], k);
    }
  });
});
