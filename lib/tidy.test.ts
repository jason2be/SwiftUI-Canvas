import { describe, expect, it } from "vitest";
import { newDoc } from "./tokens";
import { tidyScreen } from "./tidy";

describe("tidyScreen", () => {
  it("pins bars to the edges and stacks the rest", () => {
    const doc = newDoc("en");
    const home = doc.screens[0].id;
    doc.parts.push(
      { id: "t1", screen: home, kind: "text", x: 80, y: 300, label: "Hello", variant: "body" },
      { id: "b1", screen: home, kind: "button", x: 40, y: 380, label: "Go", variant: "bordered" }
    );
    const next = tidyScreen(doc, home)!;
    expect(next).not.toBeNull();
    const nav = next.find((p) => p.id !== "t1" && p.id !== "b1") ?? next[0];
    const bar = next.find((p) => p.kind === "navBar");
    const tab = next.find((p) => p.kind === "tabBar");
    expect(bar?.x).toBe(0);
    expect(bar?.y).toBe(0);
    expect(tab?.y).toBeGreaterThan(700);
    const text = next.find((p) => p.id === "t1")!;
    const button = next.find((p) => p.id === "b1")!;
    expect(text.x).toBe(16);
    expect(button.x).toBe(16);
    expect(button.y).toBeGreaterThanOrEqual(text.y);
  });

  it("returns null when nothing moves", () => {
    const doc = newDoc("en");
    const home = doc.screens[0].id;
    // strip to a single tidy nav bar at the exact tidy position
    doc.parts = doc.parts.filter((p) => p.kind === "navBar");
    doc.parts[0].x = 0;
    doc.parts[0].y = 0;
    expect(tidyScreen(doc, home)).toBeNull();
  });
});
