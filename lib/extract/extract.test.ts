import { describe, expect, it } from "vitest";
import { extractPage, collectColors, themeOf, barTitle, segment } from "./extract";
import { parseHtml, parseColor, snap8, fontDesign } from "./dom";
import { mapFlow, type MapCtx } from "./mappers";
import { isProject, validateDoc } from "../project";

const page = `<!doctype html><html><head><title>Tea House</title></head><body>
<header class="site-header"><h1>Tea House</h1></header>
<main>
<h2>Our Menu</h2>
<p>Freshly brewed every morning.</p>
<ul class="menu-list"><li>Jasmine Green</li><li>Oolong</li><li>Earl Grey</li><li>Matcha Latte</li></ul>
<input type="search" placeholder="Find a tea">
<input type="password" placeholder="Password">
<button class="btn primary" style="color: #7c3aed">Order Now</button>
<a href="/story">Our story</a>
<table class="hours"><tr><td>Mon</td><td>9-5</td></tr><tr><td>Tue</td><td>9-5</td></tr></table>
<img src="garden.png" alt="The garden">
<input type="range" value="30">
<select><option>Small</option><option>Large</option></select>
<textarea placeholder="Notes"></textarea>
<hr>
</main>
<footer><a href="/legal">Legal</a></footer>
</body></html>`;

describe("dom helpers", () => {
  it("parses colors in rgb and hex forms", () => {
    expect(parseColor("rgb(124, 58, 237)")?.hex).toBe("#7c3aed");
    expect(parseColor("#7C3AED")?.hex).toBe("#7c3aed");
    expect(parseColor("#f3f")?.sat).toBeGreaterThan(0.3);
    expect(parseColor("transparent")).toBeNull();
  });
  it("snaps to 8pt and clamps at zero", () => {
    expect(snap8(137)).toBe(136);
    expect(snap8(-3)).toBe(0);
  });
  it("maps font families to designs", () => {
    expect(fontDesign("Nunito, sans-serif")).toBe("rounded");
    expect(fontDesign("ui-monospace, Menlo")).toBe("monospaced");
    expect(fontDesign("Georgia, serif")).toBe("serif");
    expect(fontDesign("Inter")).toBe("system");
  });
});

describe("segment + theme", () => {
  it("finds the header title", () => {
    const { root } = parseHtml(page);
    const { header } = segment(root);
    expect(barTitle(header)).toBe("Tea House");
  });
  it("clusters the most saturated recurring color as accent", () => {
    const theme = themeOf([
      { color: "#7c3aed", background: null },
      { color: "rgb(124, 58, 237)", background: "#ffffff" },
      { color: "#111111", background: null },
    ]);
    expect(theme.accent).toBe("#7c3aed");
    expect(theme.scheme).toBe("light");
  });
  it("detects dark scheme from a dark background", () => {
    expect(themeOf([{ color: null, background: "#1a1a2e" }]).scheme).toBe("dark");
  });
  it("collects inline style colors across the tree", () => {
    const { root } = parseHtml('<div style="color:#7c3aed">x<span style="background:#111">y</span></div>');
    const colors = collectColors(root);
    expect(colors).toHaveLength(2);
    expect(colors[0].color).toBe("#7c3aed");
    expect(colors[1].background).toBe("#111");
  });
});

describe("mappers", () => {
  const ctx = (): MapCtx => ({ decisions: [], notes: [], y: 100 });
  it("maps headings to text variants and paragraphs to body", () => {
    const { root } = parseHtml("<div><h2>Title</h2><p>Body copy here</p></div>");
    const parts = mapFlow([root], ctx());
    expect(parts.map((p) => p.variant)).toEqual(["title", "body"]);
  });
  it("maps inputs to their field kinds", () => {
    const { root } = parseHtml('<div><input type="search" placeholder="S"><input type="password"><input type="range" value="20"><select><option>a</option><option>b</option></select><textarea></textarea></div>');
    const parts = mapFlow([root], ctx());
    expect(parts.map((p) => p.kind)).toEqual(["searchField", "secureField", "slider", "menu", "textEditor"]);
  });
  it("a styled anchor is a button; a plain anchor is a link", () => {
    const { root } = parseHtml('<div><a class="btn" href="/x">Go</a><a href="/y">Read more</a></div>');
    const parts = mapFlow([root], ctx());
    expect(parts.map((p) => p.kind)).toEqual(["button", "link"]);
  });
  it("tables map to list rows even without tbody (linkedom)", () => {
    const { root } = parseHtml("<table><tr><td>Mon</td><td>9-5</td></tr><tr><td>Tue</td><td>9-5</td></tr></table>");
    const parts = mapFlow([root], ctx());
    expect(parts).toHaveLength(1);
    expect(parts[0].kind).toBe("list");
    expect(parts[0].options?.map((o) => o.label)).toEqual(["Mon — 9-5", "Tue — 9-5"]);
    expect(parts[0].h).toBeGreaterThanOrEqual(2 * 44 + 12);
  });
  it("bare text in divs becomes text parts", () => {
    const { root } = parseHtml("<div><div>hello world</div></div>");
    const parts = mapFlow([root], ctx());
    expect(parts[0].kind).toBe("text");
    expect(parts[0].label).toBe("hello world");
  });
});

describe("extractPage end-to-end", () => {
  const r = extractPage(page, { name: "Tea House" });
  it("produces a strictly valid one-screen draft", () => {
    expect(isProject(r.doc)).toBe(true);
    expect(r.doc.screens).toHaveLength(1);
    expect(r.doc.title).toBe("Tea House");
    const kinds = r.doc.parts.map((p) => p.kind);
    expect(kinds).toContain("navBar");
    expect(kinds).toContain("list");
    expect(kinds).toContain("searchField");
    expect(kinds).toContain("button");
    expect(kinds).toContain("link");
    expect(kinds).toContain("image");
  });
  it("names the nav bar from the header heading", () => {
    const nav = r.doc.parts.find((p) => p.kind === "navBar")!;
    expect(nav.label).toBe("Tea House");
    expect(nav.variant).toBe("inline");
  });
  it("records a decision trail with confidences", () => {
    expect(r.decisions.length).toBeGreaterThan(5);
    expect(r.decisions.some((d) => d.confidence === "high" && d.decision.startsWith("navBar"))).toBe(true);
    expect(r.decisions.some((d) => d.decision.includes("#7c3aed"))).toBe(true);
  });
  it("skips the site footer with a note", () => {
    expect(r.notes.join(" ")).toMatch(/footer/);
  });
  it("handles a bare fragment (no html/body tags) without losing elements", () => {
    const frag = extractPage("<h1>Tea House</h1><p>Fresh brews daily</p><ul><li>Jasmine</li><li>Oolong</li></ul>", { name: "Tea" });
    const kinds = frag.doc.parts.map((p) => p.kind);
    expect(kinds).toContain("text");
    expect(kinds).toContain("list");
    const list = frag.doc.parts.find((p) => p.kind === "list")!;
    expect(list.options).toHaveLength(2);
    expect(frag.doc.parts.some((p) => p.label === "Tea House")).toBe(true);
    expect(frag.doc.parts.some((p) => p.label === "Fresh brews daily")).toBe(true);
  });
  it("does not mistake markup literals for document structure", () => {
    // a "<html>" inside a comment, a script, or an attribute value must not
    // stop the fragment from being wrapped (round-2 blocker regression)
    const cases = [
      '<h1>Alpha</h1><!-- <html> old markup --><p>Beta</p><ul><li>one</li><li>two</li></ul>',
      '<!-- <html lang="en"> --><h1>Alpha</h1><p>Beta</p><ul><li>one</li><li>two</li></ul>',
      '<script>document.write("<html>");</script><h1>Alpha</h1><p>Beta</p><ul><li>one</li><li>two</li></ul>',
      '<div data-tpl="<html><body>x</body></html>"></div><h1>Alpha</h1><p>Beta</p><ul><li>one</li><li>two</li></ul>',
      '<div>Alpha</div><html><body><div>Beta</div></body></html>',
    ];
    for (const [i, src] of cases.entries()) {
      const r = extractPage(src, { name: `C${i}` });
      const labels = r.doc.parts.map((p) => p.label);
      expect(labels.some((l) => l.includes("Alpha")), `case ${i}: ${src}`).toBe(true);
      expect(labels.some((l) => l.includes("Beta")), `case ${i}: ${src}`).toBe(true);
      if (i < 4) expect(r.doc.parts.some((p) => p.kind === "list"), `case ${i}: list`).toBe(true);
    }
  });
  it("keeps the title of a real document unwrapped", () => {
    const real = extractPage("<!doctype html><html><head><title>Real Doc</title></head><body><p>Hello</p></body></html>");
    expect(real.doc.title).toBe("Real Doc");
    expect(real.doc.parts.map((p) => p.label)).toContain("Hello");
  });
  it("the draft survives the tolerant loader untouched", () => {
    const v = validateDoc(JSON.parse(JSON.stringify(r.doc)), "test");
    expect(v.doc).not.toBeNull();
    expect(v.warnings).toHaveLength(0);
  });
});
