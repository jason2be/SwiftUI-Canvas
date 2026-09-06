import { describe, expect, it } from "vitest";
import { buildPrompt } from "./prompt";
import { newDoc, type Doc } from "./tokens";

const doc: Doc = newDoc("en");
doc.title = "Tea Timer";
doc.theme.accent = "#00C7BE";
doc.theme.scheme = "dark";
doc.theme.font = "rounded";

describe("buildPrompt", () => {
  it("writes an English brief with the API baseline, theme and screens", () => {
    const p = buildPrompt(doc, { kind: "all" }, "en");
    expect(p).toContain("Build an iPhone app called \"Tea Timer\" in SwiftUI");
    expect(p).toContain("deployment target of iOS 26.0");
    expect(p).toContain("NavigationStack");
    expect(p).toContain("Liquid Glass");
    expect(p).toContain("## Screen: Home");
    expect(p).toContain("navigation bar");
    expect(p).toContain("tab bar");
    expect(p).toContain("Color(red: 0.000, green: 0.780, blue: 0.745)"); // #00C7BE
    expect(p).toContain(".preferredColorScheme(.dark)");
    expect(p).toContain(".fontDesign(.rounded)");
    expect(p).toContain("AnyNavigationTransition");
  });

  it("writes a Chinese brief with the same baseline in Chinese", () => {
    const p = buildPrompt(doc, { kind: "all" }, "zh");
    expect(p).toContain("用 SwiftUI 构建一个 iPhone 应用");
    expect(p).toContain("deployment target iOS 26.0");
    expect(p).toContain("NavigationStack");
    expect(p).toContain("玻璃");
    expect(p).toContain("## 屏幕: Home"); // screen names are user data, kept verbatim
    expect(p).toContain("SF Symbols");
  });

  it("scopes to one screen", () => {
    const p = buildPrompt(doc, { kind: "screen", id: doc.screens[0].id }, "en");
    expect(p).toContain("## Screen: Home");
    const allScreens = p.match(/^## Screen:/gm) ?? [];
    expect(allScreens).toHaveLength(1);
  });

  it("emits nothing for an empty design", () => {
    const empty: Doc = { ...newDoc("en"), parts: [] };
    expect(buildPrompt(empty, { kind: "all" }, "en")).toBe("");
  });

  it("describes links with their transition", () => {
    const d: Doc = newDoc("en");
    const target = d.screens[0];
    d.screens.push({ id: "s2", name: "Detail", x: 600, y: 60 });
    d.parts.push({
      id: "b1",
      screen: target.id,
      kind: "button",
      x: 16,
      y: 200,
      label: "Open",
      variant: "borderedProminent",
      link: { target: "s2", transition: "zoom" },
    });
    const p = buildPrompt(d, { kind: "all" }, "en");
    expect(p).toContain("opens the screen Detail with a zoom transition");
  });

  it("never mentions canvas-level parts", () => {
    const d: Doc = newDoc("en");
    d.screens.push({ id: "s2", name: "Detail", x: 600, y: 60 });
    d.parts.push({ id: "c1", screen: null, kind: "text", x: 1200, y: 300, label: "scratch note", variant: "body" });
    const p = buildPrompt(d, { kind: "all" }, "en");
    expect(p).not.toContain("scratch note");
    // and the screen part still lands
    d.parts.push({ id: "v1", screen: "s2", kind: "text", x: 16, y: 200, label: "visible", variant: "body" });
    expect(buildPrompt(d, { kind: "screen", id: "s2" }, "en")).toContain("visible");
  });
});
