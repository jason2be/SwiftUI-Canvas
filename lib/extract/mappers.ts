import type { Kind, Option, Part, Variant } from "../tokens";
import { partSize } from "../tokens";
import type { Decision, Extraction } from "./report";
import type { El } from "./dom";
import { estimateTextWidth, snap8 } from "./dom";

/* Element → Part mappers. Each mapper returns a draft Part (position filled
 * in later by the layout pass) or null when the element is not a control.
 * Every call records a Decision so the report can explain the draft. */

export interface MapCtx {
  decisions: Decision[];
  notes: string[];
  /** running y position inside the current content flow */
  y: number;
}

const id = (() => {
  let n = 0;
  return (tag: string) => `x${tag}${(++n).toString(36)}`;
})();

function label(el: El): string {
  return el.ownText() || el.attr("aria-label") || el.attr("placeholder") || el.attr("value") || el.attr("alt") || "";
}

function isInteractive(el: El): boolean {
  if (["button", "input", "select", "textarea"].includes(el.tag)) return true;
  // an anchor is a button only when it wears button styling; plain links
  // stay links (checked by the caller's branch order)
  return el.attr("role") === "button" || el.attr("onclick") !== null || el.classes.some((c) => /^(btn|button)$|btn-|button-/.test(c));
}

/** one candidate part from one element */
export function mapElement(el: El, ctx: MapCtx): Part | null {
  const dec = (decision: string, confidence: Decision["confidence"], reason: string) =>
    ctx.decisions.push({ source: `<${el.tag}${el.classes.length ? "." + el.classes[0] : ""}> "${el.text().slice(0, 40)}"`, decision, confidence, reason });

  const make = (kind: Kind, extra: Partial<Part>, why: string, confidence: Decision["confidence"] = "high", what = kind): Part | null => {
    const size = partSize(kind);
    const base: Part = { id: id(kind.slice(0, 2)), screen: null, x: 16, y: snap8(ctx.y), label: "", kind } as Part;
    const variant = defaultVariant(kind);
    const p: Part = { ...base, ...(variant ? { variant } : {}), ...extra } as Part;
    p.h = size.h;
    ctx.y += size.h + 8;
    dec(what, confidence, why);
    return p;
  };

  // ---- headings → text parts with SwiftUI font variants
  if (/^h[1-6]$/.test(el.tag)) {
    const level = Number(el.tag[1]);
    const text = el.text();
    if (!text) return null;
    const variant = (["largeTitle", "title", "headline", "body", "callout", "footnote"][level - 1] ?? "body") as Variant;
    const size = partSize("text", { kind: "text", variant, label: text } as Part);
    dec(`text (${variant})`, level <= 2 ? "high" : "medium", `<h${level}> maps to the ${variant} font`);
    ctx.y += size.h + 8;
    return { id: id("tx"), screen: null, kind: "text", x: 16, y: snap8(ctx.y - size.h - 8), label: text, variant, h: size.h } as Part;
  }

  // ---- paragraphs
  if (el.tag === "p") {
    const text = el.text();
    if (!text) return null;
    const size = partSize("text", { kind: "text", variant: "body", label: text } as Part);
    dec("text (body)", "high", "<p> maps to body Text");
    ctx.y += size.h + 8;
    return { id: id("tx"), screen: null, kind: "text", x: 16, y: snap8(ctx.y - size.h - 8), label: text, variant: "body", h: size.h } as Part;
  }

  // ---- search fields (must precede generic inputs)
  if (el.tag === "input") {
    const type = (el.attr("type") ?? "text").toLowerCase();
    if (type === "search") return make("searchField", { label: el.attr("placeholder") ?? "Search" }, 'input[type="search"]');
    if (type === "password") return make("secureField", { label: el.attr("placeholder") ?? "Password" }, 'input[type="password"]');
    if (type === "email" || type === "tel" || type === "text" || type === "number") {
      return make("textField", { label: el.attr("placeholder") ?? "Field", supporting: el.attr("placeholder") ?? "" }, `input[type="${type}"]`);
    }
    if (type === "checkbox" || type === "radio") {
      return make("toggle", { label: label(el) || "Toggle", checked: el.attr("checked") !== null }, `input[type="${type}"] → Toggle`);
    }
    if (type === "range") return make("slider", { label: "", value: Number(el.attr("value") ?? 50) }, 'input[type="range"] → Slider');
    return null; // submit buttons handled by the button branch
  }

  if (el.tag === "textarea") {
    return make("textEditor", { label: "", supporting: el.attr("placeholder") ?? "" }, "<textarea> → TextEditor");
  }

  if (el.tag === "select") {
    const opts: Option[] = el.children.filter((c) => c.tag === "option").map((c) => ({ label: c.text() || "Option" }));
    if (!opts.length) return null;
    return make("menu", { label: label(el) || "Menu", options: opts }, "<select> → Menu", "medium");
  }

  if (el.tag === "button" || (el.tag === "a" && isInteractive(el))) {
    const text = label(el);
    if (!text && !el.children.length) return null;
    const prominent = el.classes.some((c) => /primary|cta|submit|prominent/.test(c));
    return make("button", { label: text || "Button", variant: prominent ? "borderedProminent" : "bordered" }, prominent ? "button with CTA class → borderedProminent" : "<button>/<a>", "high");
  }

  if (el.tag === "a") {
    const text = label(el);
    if (!text) return null;
    return make("link", { label: text }, "standalone <a> → Link", "medium");
  }

  if (el.tag === "img") {
    return make("image", { label: el.attr("alt") ?? "", w: 200, h: 200 }, "<img> → image placeholder", "medium");
  }

  if (el.tag === "video") {
    return make("image", { label: "Video", w: 361, h: 200 }, "<video> → placeholder (no video part)", "low");
  }

  if (el.tag === "table" || (el.tag === "ul" && el.children.filter((c) => c.tag === "li").length >= 2)) {
    const rowsOf = (tr: El[]) =>
      tr.map((r) => {
        const cells = r.children.filter((c) => c.tag === "td" || c.tag === "th").map((c) => c.text()).filter(Boolean);
        return { label: (cells.length > 1 ? cells.join(" — ") : r.text()).slice(0, 60) || "Row" };
      });
    // linkedom does not synthesize <tbody>; accept both shapes
    const rows = el.tag === "table"
      ? rowsOf(el.children.some((c) => c.tag === "tbody")
          ? el.children.filter((c) => c.tag === "tbody").flatMap((t) => t.children.filter((r) => r.tag === "tr"))
          : el.children.filter((c) => c.tag === "tr"))
      : rowsOf(el.children.filter((c) => c.tag === "li"));
    if (rows.length < 2) return null;
    const part = make("list", { label: "", variant: "insetGrouped", options: rows.slice(0, 8) }, "<table>/<ul> → List rows", "high");
    if (part) {
      // rows stack at 44pt from the part origin; size the part to fit
      part.h = Math.max(part.h ?? 0, Math.min(rows.length, 8) * 44 + 12);
      ctx.y += (Math.min(rows.length, 8) * 44 + 12) - (partSize("list").h);
    }
    return part;
  }

  if (el.tag === "progress" || el.classes.some((c) => /progress|spinner|loader/.test(c))) {
    return make("progress", { label: "", variant: "linear" }, "progress indicator", "medium");
  }

  if (el.tag === "hr") {
    return make("divider", { label: "" }, "<hr> → Divider");
  }

  return null;
}

function defaultVariant(kind: Kind): Variant {
  switch (kind) {
    case "list": return "insetGrouped";
    case "button": return "bordered";
    default: return "plain";
  }
}

/** walk the content flow in order, mapping what we can */
export function mapFlow(roots: El[], ctx: MapCtx): Part[] {
  const parts: Part[] = [];
  const walk = (el: El, depth: number) => {
    if (depth > 6) return; // do not descend into deep widget trees
    const before = ctx.y;
    const mapped = mapElement(el, ctx);
    if (mapped) {
      parts.push(mapped);
      return; // mapped containers are leaves (list rows live in options)
    }
    for (const c of el.children) walk(c, depth + 1);
    if (ctx.y === before && el.children.length === 0 && el.ownText()) {
      // bare text nodes inside divs
      const text = el.ownText().slice(0, 200);
      if (text.length > 1) {
        const size = partSize("text", { kind: "text", variant: "body", label: text } as Part);
        parts.push({ id: id("tx"), screen: null, kind: "text", x: 16, y: snap8(ctx.y), label: text, variant: "body", h: size.h } as Part);
        ctx.y += size.h + 8;
        ctx.decisions.push({ source: `"${text.slice(0, 40)}"`, decision: "text (body)", confidence: "medium", reason: "bare text in a div" });
      }
    }
  };
  for (const el of roots) walk(el, 0);
  return parts;
}

export type { Extraction };
