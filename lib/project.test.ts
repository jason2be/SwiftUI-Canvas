import { describe, expect, it } from "vitest";
import { isProject, mergeDoc, validateDoc } from "./project";
import { duplicateScreen, newDoc, partSize, type Doc } from "./tokens";
import { paletteOf } from "./theme";

const base = (): Doc => ({
  title: "T",
  lang: "en",
  platform: "ios",
  theme: { accent: "systemBlue", scheme: "light", shape: "default", font: "system" },
  screens: [{ id: "s1", name: "Main", x: 0, y: 0 }],
  parts: [{ id: "p1", screen: "s1", kind: "button", x: 16, y: 100, label: "Go", variant: "borderedProminent" }],
});

describe("validateDoc", () => {
  it("accepts a healthy document untouched", () => {
    const v = validateDoc(base());
    expect(v.errors).toEqual([]);
    expect(v.warnings).toEqual([]);
    expect(v.doc?.parts).toHaveLength(1);
  });

  it("repairs a dangling screen reference and dangling links", () => {
    const d = base() as unknown as Record<string, unknown>;
    (d as { parts: unknown[] }).parts = [
      { id: "p1", screen: "ghost", kind: "button", x: 0, y: 0, label: "", variant: "bordered" },
      { id: "p2", screen: "s1", kind: "button", x: 0, y: 50, label: "L", variant: "bordered", link: { target: "ghost", transition: "push" } },
      { id: "p3", screen: "s1", kind: "tabBar", x: 0, y: 700, label: "", variant: "plain", options: [{ label: "A", target: "nope" }] },
    ];
    const v = validateDoc(d);
    expect(v.doc).not.toBeNull();
    expect(v.doc?.parts[0].screen).toBeNull();
    expect(v.doc?.parts[1].link).toBeUndefined();
    expect(v.doc?.parts[2].options?.[0].target).toBeNull();
    expect(v.warnings).toHaveLength(3);
  });

  it("renames duplicate ids instead of dropping parts", () => {
    const d = base();
    (d.parts as Doc["parts"]).push({ ...d.parts[0] });
    const v = validateDoc(d);
    expect(v.doc?.parts).toHaveLength(2);
    expect(v.doc?.parts[0].id).not.toBe(v.doc?.parts[1].id);
    expect(v.warnings.join(" ")).toContain("duplicate part id");
  });

  it("renames duplicate screen ids", () => {
    const d = base();
    d.screens.push({ ...d.screens[0] });
    const v = validateDoc(d);
    expect(new Set(v.doc?.screens.map((s) => s.id)).size).toBe(2);
    expect(v.warnings.join(" ")).toContain("duplicate screen id");
  });

  it("rejects a missing theme but keeps the report readable", () => {
    const v = validateDoc({ title: "x", screens: [{ id: "a", name: "A", x: 0, y: 0 }] }, "share");
    expect(v.doc).toBeNull();
    expect(v.errors.join(" ")).toContain("theme");
  });

  it("drops a malformed part but keeps the rest", () => {
    const d = base() as unknown as Record<string, unknown>;
    (d as { parts: unknown[] }).parts = [{ id: 42 }, ...base().parts];
    const v = validateDoc(d);
    expect(v.doc?.parts).toHaveLength(1);
    expect(v.warnings.join(" ")).toContain("dropped a malformed part");
  });

  it("strips presents triggers that point off-screen or nowhere", () => {
    const d = base();
    d.parts.push({ id: "ok", screen: "s1", kind: "alert", x: 60, y: 360, label: "Fine", variant: "plain" });
    d.parts.push({ id: "ghostBtn", screen: "s1", kind: "button", x: 16, y: 220, label: "G", variant: "bordered", presents: "nope" });
    d.screens.push({ id: "s2", name: "Other", x: 513, y: 0 });
    d.parts.push({ id: "movedBtn", screen: "s2", kind: "button", x: 16, y: 220, label: "M", variant: "bordered", presents: "ok" });
    const v = validateDoc(d);
    const byId = new Map(v.doc!.parts.map((p) => [p.id, p]));
    expect(byId.get("ghostBtn")?.presents).toBeUndefined();
    expect(byId.get("movedBtn")?.presents).toBeUndefined();
    expect(v.warnings.filter((w) => w.includes("alert/sheet")).length).toBe(2);
  });

  it("reports repair notices in the requested language", () => {
    const d = base() as unknown as Record<string, unknown>;
    (d as { parts: unknown[] }).parts = [{ id: "p9", screen: "ghost", kind: "text", x: 0, y: 0, variant: "body" }];
    const zh = validateDoc(d, "文件", "zh");
    expect(zh.warnings[0]).toContain("已移到工作区");
    const en = validateDoc(d, "File", "en");
    expect(en.warnings[0]).toContain("moved to the workspace");
  });

  it("isProject rejects a presents trigger that crosses screens", () => {
    const d = base();
    d.screens.push({ id: "s2", name: "Other", x: 513, y: 0 });
    d.parts.push(
      { id: "al", screen: "s1", kind: "alert", x: 60, y: 360, label: "A", variant: "plain" },
      { id: "b2", screen: "s2", kind: "button", x: 16, y: 220, label: "B", variant: "bordered", presents: "al" },
    );
    expect(isProject(d)).toBe(false);
    // same-screen is fine
    (d.parts.find((p) => p.id === "b2") as { screen: string }).screen = "s1";
    expect(isProject(d)).toBe(true);
  });

  it("defaults a missing title so the document stays saveable", () => {
    const d: Record<string, unknown> = {
      lang: "en",
      theme: { accent: "systemBlue", scheme: "light", shape: "default", font: "system" },
      screens: [{ id: "s1", name: "Main", x: 0, y: 0 }],
      parts: [],
    };
    const v = validateDoc(d);
    expect(v.doc?.title).toBe("Untitled App");
    expect(v.warnings.join(" ")).toContain("missing title");
  });
});

describe("mergeDoc", () => {
  it("pastes a document beside the current one with remapped ids", () => {
    const a = base();
    const b = base();
    b.screens[0].name = "Pasted";
    (b.parts[0] as { link?: unknown }).link = { target: "s1", transition: "push" };
    const { doc: merged } = mergeDoc(b, a);
    expect(merged.screens).toHaveLength(2);
    expect(merged.parts).toHaveLength(2);
    const pastedScreen = merged.screens[1];
    expect(pastedScreen.id).not.toBe("s1");
    const pastedPart = merged.parts[1];
    expect(pastedPart.screen).toBe(pastedScreen.id);
    expect(pastedPart.link?.target).toBe(pastedScreen.id);
  });

  it("remaps presents triggers and drops targets that lead nowhere", () => {
    const a = base();
    const b = base();
    b.parts.push(
      { id: "al", screen: "s1", kind: "alert", x: 60, y: 360, label: "Sure?", variant: "plain" },
      { id: "btn", screen: "s1", kind: "button", x: 16, y: 200, label: "Go", variant: "bordered", presents: "al", link: { target: "elsewhere", transition: "push" } },
    );
    const { doc: merged } = mergeDoc(b, a);
    const pastedScreen = merged.screens[1];
    const pastedAlert = merged.parts.find((p) => p.screen === pastedScreen.id && p.kind === "alert")!;
    const goCopies = merged.parts.filter((p) => p.screen === pastedScreen.id && p.label === "Go");
    expect(goCopies).toHaveLength(2);
    const presentsButton = goCopies.find((p) => p.presents)!;
    // presents follows the copy of the alert
    expect(presentsButton.presents).toBe(pastedAlert.id);
    // the dangling link target is dropped, not rewritten to "back"
    expect(presentsButton.link).toBeUndefined();
  });
});

describe("duplicateScreen", () => {
  it("clones the screen and its parts, retargeting links at the copy", () => {
    const d = base();
    d.screens.push({ id: "s2", name: "Detail", x: 513, y: 0 });
    d.parts.push({ id: "p2", screen: "s1", kind: "button", x: 16, y: 200, label: "Open", variant: "bordered", link: { target: "s2", transition: "push" } });
    d.parts.push({ id: "p3", screen: "s2", kind: "text", x: 16, y: 100, label: "hi", variant: "body" });
    const next = duplicateScreen(d, "s1");
    const copy = next.screens.find((s) => s.id !== "s1" && s.name.includes("copy"));
    expect(copy).toBeTruthy();
    const copies = next.parts.filter((p) => p.screen === copy!.id);
    expect(copies).toHaveLength(2);
    // the copy's own button still points at Detail
    const copyButton = copies.find((p) => p.label === "Open")!;
    expect(copyButton.link?.target).toBe("s2");
    // the original's button now ALSO offers the copy? no: it keeps pointing at Detail
    const origButton = next.parts.find((p) => p.id === "p2")!;
    expect(origButton.link?.target).toBe("s2");
  });

  it("duplicating a detail screen retargets inbound links to the copy", () => {
    const d = base();
    d.screens.push({ id: "s2", name: "Detail", x: 513, y: 0 });
    d.parts.push({ id: "p2", screen: "s1", kind: "button", x: 16, y: 200, label: "Open", variant: "bordered", link: { target: "s2", transition: "push" } });
    const next = duplicateScreen(d, "s2");
    const copyId = next.screens.find((s) => s.name.includes("copy"))!.id;
    expect(next.parts.find((p) => p.id === "p2")!.link?.target).toBe(copyId);
  });

  it("remaps presents triggers inside the copy", () => {
    const d = base();
    d.parts.push({ id: "al", screen: "s1", kind: "alert", x: 60, y: 360, label: "Sure?", variant: "plain" });
    d.parts[0].presents = "al";
    const next = duplicateScreen(d, "s1");
    const copyId = next.screens.find((s) => s.name.includes("copy"))!.id;
    const copyAlert = next.parts.find((p) => p.screen === copyId && p.kind === "alert")!;
    const copyButton = next.parts.find((p) => p.screen === copyId && p.kind === "button")!;
    expect(copyButton.presents).toBe(copyAlert.id);
  });
});

describe("theme font on canvas", () => {
  it("paletteOf carries a font stack for every design", () => {
    for (const font of ["system", "rounded", "serif", "monospaced"] as const) {
      const pal = paletteOf({ accent: "systemBlue", scheme: "dark", shape: "default", font });
      expect(pal.font.length).toBeGreaterThan(4);
    }
    expect(paletteOf({ accent: "systemBlue", scheme: "light", shape: "default", font: "rounded" }).font).toContain("ui-rounded");
    expect(paletteOf({ accent: "systemBlue", scheme: "light", shape: "default", font: "monospaced" }).font).toContain("ui-monospace");
  });
});

describe("partSize consistency", () => {
  it("never returns zero or negative sizes", () => {
    const d = newDoc("en");
    void d;
    for (const kind of ["button", "list", "alert", "datePicker", "chart"] as const) {
      const s = partSize(kind);
      expect(s.w).toBeGreaterThan(0);
      expect(s.h).toBeGreaterThan(0);
    }
  });
});
