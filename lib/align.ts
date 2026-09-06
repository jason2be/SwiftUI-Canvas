import { MARGIN, SCREEN_H, SCREEN_W, partSize, type Part } from "./tokens";

/* Alignment system, after the reference project's lib/tidy.ts approach:
 *
 * One selected part lines up with its screen's body — the content area inside
 * the layout margins and clear of the bars (nav bar at top, tab bar / sheet at
 * bottom), exactly the box the body rows flow through. Several selected parts
 * line up with each other; "space evenly" keeps the two outer parts in place
 * and equalizes the gaps between them. A moved part never lands on a part that
 * is not moving: when the aligned spot is taken, the part steps aside and tries
 * again, the way the reference does it.
 *
 * Only positions change. Sizes, order and contents stay untouched. */

export type AlignKind =
  | "left"
  | "centerH"
  | "right"
  | "distributeH"
  | "top"
  | "centerV"
  | "bottom"
  | "distributeV";

type Rect = { l: number; t: number; r: number; b: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rectOf(p: Part): Rect {
  const w = p.w ?? partSize(p.kind, p).w;
  const h = p.h ?? partSize(p.kind, p).h;
  return { l: p.x, t: p.y, r: p.x + w, b: p.y + h };
}

/** the content box of a screen: inside the layout margins, below nav bars,
 *  above tab bars and sheets — where a lone part should line up */
export function bodyRect(doc: { parts: Part[] }, screenId: string, except: Set<string> = new Set()): Rect {
  let top = 0;
  let bottom = SCREEN_H;
  for (const p of doc.parts) {
    if (p.screen !== screenId || except.has(p.id)) continue;
    const h = p.h ?? partSize(p.kind, p).h;
    if (p.kind === "navBar") top = Math.max(top, p.y + h);
    if (p.kind === "tabBar" || p.kind === "sheet") bottom = Math.min(bottom, p.y);
  }
  return { l: MARGIN, t: top + MARGIN, r: Math.max(MARGIN, SCREEN_W - MARGIN), b: Math.max(top + MARGIN, bottom - MARGIN) };
}

const hits = (r: Rect, others: Rect[]) => others.filter((o) => o.l < r.r && o.r > r.l && o.t < r.b && o.b > r.t);

/** Align the selection. One part lines up with its screen's body; several line
 *  up with each other (or space out between the two outers). Parts never leave
 *  their screen. Returns the next x/y for each moved part, or null when the
 *  action would change nothing. */
export function alignParts(
  doc: { parts: Part[] },
  sel: string[],
  kind: AlignKind,
): { id: string; x: number; y: number }[] | null {
  const ids = new Set(sel);
  const moving = doc.parts.filter((p) => ids.has(p.id));
  if (!moving.length) return null;
  const screenId = moving[0].screen;
  if (moving.some((p) => p.screen !== screenId)) return null; // one screen at a time

  const rects = new Map(moving.map((p) => [p.id, rectOf(p)] as const));
  const distributing = kind === "distributeH" || kind === "distributeV";
  const horizontal = kind === "left" || kind === "centerH" || kind === "right" || kind === "distributeH";

  // reference box: the body for a lone part, the selection's own bounds otherwise
  let bb: Rect;
  if (moving.length === 1 && !distributing) {
    bb = bodyRect(doc, screenId, ids);
  } else {
    bb = [...rects.values()].reduce((a, r) => ({
      l: Math.min(a.l, r.l),
      t: Math.min(a.t, r.t),
      r: Math.max(a.r, r.r),
      b: Math.max(a.b, r.b),
    }));
  }

  if (distributing) {
    const sorted = [...moving].sort((a, b) =>
      horizontal ? rects.get(a.id)!.l - rects.get(b.id)!.l : rects.get(a.id)!.t - rects.get(b.id)!.t,
    );
    const sizes = sorted.map((p) => {
      const r = rects.get(p.id)!;
      return horizontal ? r.r - r.l : r.b - r.t;
    });
    const span = horizontal ? bb.r - bb.l : bb.b - bb.t;
    const total = sizes.reduce((s, v) => s + v, 0);
    if (sorted.length < 3 || total >= span) return null; // nothing to spread out
    const gap = (span - total) / (sorted.length - 1);
    let pos = horizontal ? bb.l : bb.t;
    const out: { id: string; x: number; y: number }[] = [];
    sorted.forEach((p, i) => {
      const r = rects.get(p.id)!;
      out.push({ id: p.id, x: horizontal ? Math.round(pos) : r.l, y: horizontal ? r.t : Math.round(pos) });
      pos += sizes[i] + gap;
    });
    return out;
  }

  // parts on the same screen that are not moving, so an aligned part never lands on one
  const others = doc.parts.filter((p) => p.screen === screenId && !ids.has(p.id)).map(rectOf);
  // step away from the aligned edge: right of a left edge, up from a bottom edge;
  // a centre without a clear spot tries both ways
  const dir = kind === "left" || kind === "top" ? 1 : kind === "right" || kind === "bottom" ? -1 : 0;
  const out: { id: string; x: number; y: number }[] = [];
  for (const p of moving) {
    const r = rects.get(p.id)!;
    const w = r.r - r.l;
    const h = r.b - r.t;
    const ax = kind === "left" ? bb.l : kind === "centerH" ? Math.round((bb.l + bb.r) / 2 - w / 2) : kind === "right" ? bb.r - w : r.l;
    const ay = kind === "top" ? bb.t : kind === "centerV" ? Math.round((bb.t + bb.b) / 2 - h / 2) : kind === "bottom" ? bb.b - h : r.t;
    let x = ax;
    let y = ay;
    let clear = false;
    for (let tries = 0, sign = dir || 1; tries < 12; tries++, sign = dir || -sign) {
      const blocking = hits({ l: x, t: y, r: x + w, b: y + h }, others);
      if (!blocking.length) {
        clear = true;
        break;
      }
      const step = 8 + (horizontal ? Math.max(...blocking.map((o) => o.r - o.l)) : Math.max(...blocking.map((o) => o.b - o.t)));
      if (horizontal) x = clamp(x + sign * step * (dir ? 1 : tries + 1), bb.l, Math.max(bb.l, bb.r - w));
      else y = clamp(y + sign * step * (dir ? 1 : tries + 1), bb.t, Math.max(bb.t, bb.b - h));
    }
    if (!clear) {
      x = ax;
      y = ay;
    }
    out.push({ id: p.id, x, y });
  }
  return out.some((m, i) => m.x !== moving[i].x || m.y !== moving[i].y) ? out : null;
}
