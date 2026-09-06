import { describe, expect, it } from "vitest";
import { SNAP_RANGE, computeSnap, guidesBetween, snapTargetsFor, type SnapTargets } from "./snapping";
import { MARGIN, SCREEN_H, SCREEN_W, type Kind } from "./tokens";

const widthOf = (p: { kind: string; w?: number }) => p.w ?? 160;
const heightOf = (p: { kind: string; h?: number }) => p.h ?? 50;

describe("snapTargetsFor", () => {
  it("always includes screen edges, center and margins", () => {
    const t = snapTargetsFor({ screen: { id: "s" }, doc: { screens: [{ id: "s" }], parts: [] }, width: widthOf, height: heightOf });
    expect(t.xs).toContain(0);
    expect(t.xs).toContain(SCREEN_W);
    expect(t.xs).toContain(SCREEN_W / 2);
    expect(t.ys).toContain(0);
    expect(t.ys).toContain(SCREEN_H);
    expect(t.ys).toContain(SCREEN_H / 2);
    expect(t.xs).toContain(MARGIN);
    expect(t.ys).toContain(MARGIN);
  });

  it("collects peer edges and centers, but not bars", () => {
    const doc = {
      screens: [{ id: "s" }],
      parts: [
        { id: "nav", screen: "s", kind: "navBar" as Kind, x: 0, y: 0, w: SCREEN_W, h: 96 },
        { id: "tab", screen: "s", kind: "tabBar" as Kind, x: 0, y: 769, w: SCREEN_W, h: 83 },
        { id: "btn", screen: "s", kind: "button" as Kind, x: 16, y: 200, w: 160, h: 50 },
      ],
    };
    const t = snapTargetsFor({ screen: { id: "s" }, doc, width: widthOf, height: heightOf });
    expect(t.ys).toContain(96); // content top under the nav bar
    expect(t.ys).toContain(769); // content bottom above the tab bar
    expect(t.xs).toContain(16);
    expect(t.xs).toContain(176); // button right edge
    expect(t.xs).toContain(96); // button center
    expect(t.peers.map((p) => p.id)).toEqual(["btn"]); // bars excluded
  });
});

describe("computeSnap", () => {
  const targets: SnapTargets = {
    xs: [0, 100, 200],
    ys: [0, 500, 1000],
    peers: [],
  };

  it("pulls x to the closest target within range", () => {
    const r = computeSnap({ x: 97, y: 10, w: 100, h: 40 }, targets);
    // left edge 97→100 and right edge 197→200 tie; the first candidate wins
    expect(r.dx).toBe(3);
    expect(r.guide).toEqual({ axis: "x", at: 100 });
    expect(r.pull).toBeGreaterThan(0);
  });

  it("does not snap beyond the range", () => {
    const r = computeSnap({ x: 30, y: 10, w: 100, h: 40 }, targets);
    expect(r.dx).toBe(0);
    expect(r.dy).toBe(0);
    expect(r.guide).toBeUndefined();
  });

  it("prefers the closer target when two compete", () => {
    const t2: SnapTargets = { xs: [0, 4], ys: [0], peers: [] };
    const r = computeSnap({ x: 2.6, y: 10, w: 100, h: 40 }, t2);
    expect(r.guide?.at).toBe(4);
  });

  it("centers vertically on the peer's center", () => {
    const tp: SnapTargets = {
      xs: [],
      ys: [0, 240], // 240 = peer center (200 + 80/2), as snapTargetsFor would collect
      peers: [{ x: 100, y: 200, w: 100, h: 80 }],
    };
    const r = computeSnap({ x: 210, y: 218, w: 60, h: 44 }, tp);
    expect(r.guide?.axis).toBe("y");
    expect(r.guide?.at).toBe(240);
  });

  it("reports equal spacing on the cross axis", () => {
    const tp: SnapTargets = {
      xs: [],
      ys: [],
      peers: [
        { x: 40, y: 100, w: 80, h: 40 }, // right edge 120
        { x: 200, y: 100, w: 60, h: 40 }, // left edge 200
      ],
    };
    // rect between them: gap 20 left (120→140), gap 20 right (180→200)
    const r = computeSnap({ x: 140, y: 100, w: 40, h: 40 }, tp);
    expect(r.equal?.axis).toBe("x");
  });
});

describe("guidesBetween", () => {
  it("spans a vertical guide from the nearest peer sharing that edge", () => {
    const rect = { x: 100, y: 100, w: 80, h: 40 };
    const peers = [
      { x: 100, y: 300, w: 80, h: 40 },
      { x: 250, y: 20, w: 30, h: 30 },
    ];
    const lines = guidesBetween(rect, { axis: "x", at: 100 }, peers, { x: 0, y: 0 });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ axis: "x", at: 100, from: 100, to: 340 });
  });

  it("falls back to screen bounds when no peer shares the edge", () => {
    const rect = { x: 16, y: 16, w: 80, h: 40 };
    const lines = guidesBetween(rect, { axis: "x", at: 16 }, [], { x: 0, y: 0 });
    expect(lines).toHaveLength(1);
    expect(lines[0].from).toBe(0);
    expect(lines[0].to).toBe(SCREEN_H);
  });
});
