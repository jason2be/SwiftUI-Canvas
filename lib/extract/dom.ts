import type { Decision } from "./report";

/* A tiny read-only DOM view the mappers work against. linkedom provides it
 * for HTML strings; the shape matches the standard DOM closely enough that
 * the mappers also run against a real document (tests, future headless use).
 * We depend only on querySelectorAll/getAttribute/textContent/classList —
 * never on layout. */

export interface El {
  tag: string;
  /** normalized class list, lowercased */
  classes: string[];
  id: string;
  attr: (name: string) => string | null;
  text: () => string;
  children: El[];
  /** direct + wrapped text of this element (its own, excluding descendants' tags) */
  ownText: () => string;
}

export interface ParsedPage {
  root: El;
  title: string;
  links: { href: string; text: string }[];
}

type RawEl = {
  tagName: string | null;
  className: unknown;
  id?: string;
  getAttribute: (n: string) => string | null;
  textContent: string | null;
  childNodes: RawEl[];
  querySelectorAll: (s: string) => RawEl[];
};

export function wrapEl(raw: RawEl): El {
  const tag = (raw.tagName ?? "").toLowerCase();
  const classes = typeof raw.className === "string" ? raw.className.toLowerCase().split(/\s+/).filter(Boolean) : [];
  const ownText = () =>
    raw.childNodes
      .filter((n) => !(n.tagName ?? ""))
      .map((n) => (n.textContent ?? "").trim())
      .filter(Boolean)
      .join(" ");
  return {
    tag,
    classes,
    id: raw.id ?? "",
    attr: (n) => raw.getAttribute(n),
    text: () => (raw.textContent ?? "").replace(/\s+/g, " ").trim(),
    children: raw.childNodes.filter((n) => n.tagName).map((n) => wrapEl(n)),
    ownText,
  };
}

/** parse an HTML string into the read-only view (linkedom; no layout, no JS) */
export function parseHtml(html: string): ParsedPage {
  // linkedom is imported lazily so the rest of the extract lib stays pure
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { parseHTML } = require("linkedom") as { parseHTML: (s: string) => { document: { querySelectorAll: (s: string) => RawEl[]; querySelector: (s: string) => RawEl | null; body: RawEl; documentElement: RawEl | null; title: string } } };
  const { document } = parseHTML(html);
  // linkedom builds a <body> for full documents; bare fragments land directly
  // under the document, so pick whichever root actually holds the content
  const body = document.body ?? document.querySelector("body");
  const root = body && (body.childNodes ?? []).some((n) => n.tagName) ? body : document.documentElement ?? body;
  const links = Array.from(document.querySelectorAll("a[href]")).map((a) => ({ href: a.getAttribute("href") ?? "", text: (a.textContent ?? "").replace(/\s+/g, " ").trim() }));
  return { root: wrapEl(root), title: (document.title ?? "").trim(), links };
}

/* ---------- style parsing helpers (pure string math) ---------- */

const HEX6 = /^#([0-9a-f]{6})$/i;

export function parseColor(input: string): { hex: string; sat: number; count: 1 } | null {
  let v = input.trim().toLowerCase();
  // rgb(r, g, b) / rgba(...)
  const rgb = v.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (rgb) {
    const [, r, g, b] = rgb;
    v = `#${[r, g, b].map((c) => Number(c).toString(16).padStart(2, "0")).join("")}`;
  }
  const m3 = v.match(/^#([0-9a-f]{3})$/i);
  if (m3) v = `#${m3[1][0]}${m3[1][0]}${m3[1][1]}${m3[1][1]}${m3[1][2]}${m3[1][2]}`;
  const m = v.match(HEX6);
  if (!m) return null;
  const h = m[1];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  return { hex: `#${h}`, sat, count: 1 };
}

export function px(value: string | null): number | null {
  if (!value) return null;
  const m = value.match(/^(-?\d+(?:\.\d+)?)px$/);
  return m ? Number(m[1]) : null;
}

/** snap to the 8pt grid the editor lives on */
export const snap8 = (v: number): number => Math.max(0, Math.round(v / 8) * 8);

/** crude text-width estimate for a UI label at 17pt (SwiftUI body) */
export const estimateTextWidth = (text: string, size = 17): number => Math.min(361, Math.max(40, Math.round(text.length * size * 0.55)));

export const push = (list: Decision[], d: Decision): number => list.push(d);

/** map a CSS font-family list to the Doc's font design token */
export function fontDesign(families: string | null): "system" | "rounded" | "serif" | "monospaced" {
  const v = (families ?? "").toLowerCase();
  if (/rounded|nunito|quicksand|baloo|comfortaa|varela/.test(v)) return "rounded";
  if (/mono|courier|menlo|consolas|roboto mono/.test(v)) return "monospaced";
  if (/serif|georgia|times|garamond|merriweather|playfair|lora/.test(v) && !/sans/.test(v)) return "serif";
  return "system";
}
