import type { Doc } from "../tokens";
import { parseColor, fontDesign } from "./dom";
import type { Decision, Extraction } from "./report";
import { parseHtml, type El } from "./dom";
import { mapFlow, type MapCtx } from "./mappers";

/* Page → screen segmentation and theme extraction. One HTML page becomes one
 * screen; bars (header/footer/nav) are pulled out first, the remaining flow
 * maps through the element mappers. */

const BAR = /navbar|nav-bar|header|site-header|topbar|top-bar|toolbar|appbar|app-bar/;
const TABBAR = /tabbar|tab-bar|bottom-nav|bottomnav|footer-nav|tab-strip/;

/** pull header/footer-ish containers out of the body flow */
export function segment(root: El): { header: El | null; footer: El | null; content: El[] } {
  let header: El | null = null;
  let footer: El | null = null;
  const content: El[] = [];
  const visit = (el: El) => {
    const looksLikeBar = BAR.test(el.classes.join(" ")) || BAR.test(el.id) || el.tag === "header";
    const looksLikeTabs = TABBAR.test(el.classes.join(" ")) || TABBAR.test(el.id);
    if (!header && looksLikeBar && el.tag !== "footer") {
      header = el;
      return;
    }
    if (!footer && (looksLikeTabs || el.tag === "footer")) {
      footer = el;
      return;
    }
    content.push(el);
  };
  for (const c of root.children) visit(c);
  return { header, footer, content };
}

/** innermost nav-ish bar that actually holds a title text */
export function barTitle(header: El | null): string {
  if (!header) return "";
  const heading = header.children.find((c) => /^h[1-3]$/.test(c.tag));
  return (heading?.text() ?? header.text()).slice(0, 60);
}

/** theme from clustered element colors; picks the most saturated recurring color */
export function themeOf(styles: { color: string | null; background: string | null }[]): Doc["theme"] {
  const seen = new Map<string, number>();
  let bg = "";
  for (const st of styles) {
    const fg = st.color ? parseColor(st.color) : null;
    if (fg && fg.sat > 0.35) seen.set(fg.hex, (seen.get(fg.hex) ?? 0) + 1);
    const bgc = st.background ? parseColor(st.background) : null;
    if (bgc && !bg) bg = bgc.hex;
  }
  let accent = "";
  let best = 0;
  for (const [hex, n] of seen) if (n > best) [accent, best] = [hex, n];
  const bgLum = bg ? parseColor(bg) : null;
  const dark = bgLum ? parseInt(bgLum.hex.slice(1), 16) < 0x808080 : false;
  return { accent: accent || "systemBlue", scheme: dark ? "dark" : "light", shape: "default", font: "system" };
}

export const fontDesignOf = fontDesign;

/** walk the tree gathering color-ish inline styles (style attr only) */
export function collectColors(root: El): { color: string | null; background: string | null }[] {
  const out: { color: string | null; background: string | null }[] = [];
  const visit = (el: El) => {
    const style = el.attr("style") ?? "";
    const color = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)?.[1]?.trim() ?? null;
    const background = style.match(/background(?:-color)?\s*:\s*([^;]+)/i)?.[1]?.trim() ?? null;
    if (color || background) out.push({ color, background });
    for (const c of el.children) visit(c);
  };
  visit(root);
  return out;
}

/** extract one HTML page into a single-screen draft doc */
export function extractPage(html: string, opts: { lang?: "en" | "zh"; name?: string } = {}): Extraction {
  const page = parseHtml(html);
  const { header, footer, content } = segment(page.root);
  const decisions: Decision[] = [];
  const notes: string[] = [];

  const parts: Doc["parts"] = [];
  let y = 0;
  const screenId = "s1";

  // header → navBar (title from the first heading inside)
  const title = barTitle(header) || page.title;
  if (header) {
    const large = /hero|jumbotron|large|banner/.test(header.classes.join(" "));
    parts.push({ id: "n1", screen: screenId, kind: "navBar", x: 0, y: large ? 0 : 59, label: title || "Home", variant: large ? "large" : "inline" } as Doc["parts"][number]);
    y = large ? 96 : 59 + 44 + 8;
    decisions.push({ source: "<header>", decision: `navBar (${large ? "large" : "inline"} "${title}")`, confidence: "high", reason: "header element becomes the nav bar" });
  }

  // footer → tabBar-ish? A footer is usually links, not tabs: record, skip
  if (footer) {
    notes.push("footer/nav bottom bar found — map its links to a tabBar only if they switch pages");
    decisions.push({ source: "<footer>", decision: "skipped (site footer, not a tab bar)", confidence: "high", reason: "footers carry legal/contact links" });
  }

  // content flow
  const ctx: MapCtx = { decisions, notes, y };
  for (const p of mapFlow(content, ctx)) {
    parts.push({ ...p, screen: screenId, x: 16, y: p.y } as Doc["parts"][number]);
  }

  // theme: inline styles only (a real stylesheet needs fetch+parse, later work)
  const colorNodes = collectColors(page.root);
  const theme = themeOf(colorNodes);
  if (theme.accent !== "systemBlue") {
    decisions.push({ source: "inline styles", decision: `accent ${theme.accent}`, confidence: "medium", reason: "most common saturated color" });
  }
  if (theme.scheme === "dark") {
    decisions.push({ source: "background colors", decision: "dark scheme", confidence: "medium", reason: "page background is dark" });
  }

  const doc: Doc = {
    title: page.title || opts.name || "Untitled App",
    lang: opts.lang ?? "en",
    platform: "ios",
    theme,
    screens: [{ id: screenId, name: opts.name || page.title || "Screen 1", x: 0, y: 0 }],
    parts,
  };
  return { doc, decisions, notes };
}
