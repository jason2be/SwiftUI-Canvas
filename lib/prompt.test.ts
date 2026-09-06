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

  it("tells the builder to leave room for the system chrome, once", () => {
    const p = buildPrompt(doc, { kind: "all" }, "zh");
    expect(p).toContain("系统状态栏");
    expect(p.split("系统状态栏").length - 1).toBe(1); // mentioned once, in the baseline
    const pe = buildPrompt(doc, { kind: "all" }, "en");
    expect(pe).toContain("system status bar");
  });

  it("wires list row targets into the brief like tab items", () => {
    const d: Doc = newDoc("en");
    d.screens.push({ id: "s2", name: "Detail", x: 600, y: 60 });
    d.parts.push({
      id: "l1",
      screen: d.screens[0].id,
      kind: "list",
      x: 16,
      y: 200,
      label: "",
      variant: "insetGrouped",
      options: [
        { label: "Tea", target: "s2" },
        { label: "Coffee" },
      ],
    });
    const zh = buildPrompt(d, { kind: "screen", id: d.screens[0].id }, "zh");
    expect(zh).toContain("，跳转到 Detail");
    expect(zh).toContain("点击行进入对应屏幕");
    const en = buildPrompt(d, { kind: "screen", id: d.screens[0].id }, "en");
    expect(en).toMatch(/opens Detail/);
    expect(en).toContain("tapping a row opens its screen");
  });

  it("orders the brief by visual position, not z-order", () => {
    const d: Doc = newDoc("en");
    // array order: low part first; visual order must invert it
    d.parts.push({ id: "low", screen: d.screens[0].id, kind: "text", x: 16, y: 500, label: "second line", variant: "body" });
    d.parts.push({ id: "high", screen: d.screens[0].id, kind: "text", x: 16, y: 200, label: "first line", variant: "body" });
    const p = buildPrompt(d, { kind: "screen", id: d.screens[0].id }, "en");
    expect(p.indexOf("first line")).toBeLessThan(p.indexOf("second line"));
  });

  it("groups parts that share a row onto one line", () => {
    const d: Doc = newDoc("en");
    d.parts.push(
      { id: "a", screen: d.screens[0].id, kind: "button", x: 16, y: 210, label: "Start", variant: "borderedProminent" },
      { id: "b", screen: d.screens[0].id, kind: "toggle", x: 250, y: 212, label: "Weekly", variant: "plain", checked: true },
    );
    const p = buildPrompt(d, { kind: "screen", id: d.screens[0].id }, "en");
    const rowLine = p.split("\n").find((l) => l.includes("One row, left to right"));
    expect(rowLine).toBeTruthy();
    expect(rowLine).toContain("Start");
    expect(rowLine).toContain("Weekly");
  });
});
