import { MARGIN, SCREEN_H, SCREEN_W, partSize, type Doc, type Part, partsOf } from "./tokens";

/* One tidy pass, after the reference project's tidy:
 *
 * 1. Bars stick to the edges they belong to: the nav bar at the top, the tab
 *    bar and sheets at the bottom (stacked in order when doubled).
 * 2. Everything else stacks between the bars on the 16pt layout margins, from
 *    the top. Parts whose vertical spans overlap share one row and keep their
 *    horizontal order, packed with 8pt gaps. A row keeps the side it was on:
 *    near the left margin it stays left, near the right margin it stays right,
 *    near the centre it stays centred. Rows clear the bottom bars.
 *
 * Only positions change. Sizes, order and contents stay untouched. Returns a
 * new parts array for the screen, or null when nothing would move. */

/** vertical distance between stacked rows */
const ROW_GAP = 16;
/** horizontal distance between parts packed into one row */
const ROW_ITEM_GAP = 8;
/** how far an edge may sit from a margin or centre and still be read as intentional */
const SIDE_SNAP = 12;

const sizeOf = (p: Part) => ({ w: p.w ?? partSize(p.kind, p).w, h: p.h ?? partSize(p.kind, p).h });

export function tidyScreen(doc: Doc, screenId: string): Part[] | null {
  const parts = partsOf(doc, screenId);
  const moved = parts.map((p) => ({ ...p }));

  // 1. bars anchor to their edges (stacked in order when doubled)
  const topBars = moved.filter((p) => p.kind === "navBar");
  const bottomBars = moved.filter((p) => p.kind === "tabBar" || p.kind === "sheet");
  topBars.forEach((bar, i) => {
    bar.x = 0;
    bar.y = i === 0 ? 0 : Math.round(bar.h ?? 44) + (i - 1) * (bar.h ?? 44);
  });
  bottomBars.forEach((bar) => {
    bar.x = 0;
    bar.y = SCREEN_H - (bar.h ?? (bar.kind === "tabBar" ? 83 : 260));
  });

  // 2. body rows between the bars, in reading order
  const body = moved.filter((p) => !topBars.includes(p) && !bottomBars.includes(p));
  const sorted = [...body].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: Part[][] = [];
  for (const p of sorted) {
    const row = rows.find((r) => {
      const top = Math.min(...r.map((q) => q.y));
      const bottom = Math.max(...r.map((q) => q.y + sizeOf(q).h));
      return p.y < bottom && p.y + sizeOf(p).h > top; // vertical spans overlap → one row
    });
    if (row) row.push(p);
    else rows.push([p]);
  }
  for (const row of rows) row.sort((a, b) => a.x - b.x);

  const bottomLimit = bottomBars.length > 0 ? Math.min(...bottomBars.map((b) => b.y)) - MARGIN : SCREEN_H - 90;
  let y = topBars.length > 0 ? 100 : MARGIN;
  for (const row of rows) {
    const rowH = Math.max(...row.map((p) => sizeOf(p).h));
    const totalW = row.reduce((s, p) => s + sizeOf(p).w, 0) + (row.length - 1) * ROW_ITEM_GAP;

    // keep the row's side, judged by the row's own bounds: near the left margin
    // it stays left, near the right margin right, near the centre centred. A
    // lone stray part stacks on the reading margin; a multi-part row that is
    // near nothing keeps its position.
    const unionL = Math.min(...row.map((p) => p.x));
    const unionR = Math.max(...row.map((p) => p.x + sizeOf(p).w));
    const nearL = Math.abs(unionL - MARGIN) <= SIDE_SNAP;
    const nearR = Math.abs(unionR - (SCREEN_W - MARGIN)) <= SIDE_SNAP;
    const nearC = Math.abs((unionL + unionR) / 2 - SCREEN_W / 2) <= SIDE_SNAP * 2;
    let rowX: number;
    if (nearL) rowX = MARGIN;
    else if (nearR) rowX = SCREEN_W - MARGIN - totalW;
    else if (nearC) rowX = Math.round(SCREEN_W / 2 - totalW / 2);
    else rowX = row.length === 1 ? MARGIN : unionL;

    let x = rowX;
    for (const p of row) {
      const { w, h } = sizeOf(p);
      p.x = Math.round(x);
      p.y = Math.round(Math.min(y + (rowH - h) / 2, bottomLimit - h));
      x += w + ROW_ITEM_GAP;
    }
    y += rowH + ROW_GAP;
  }

  const changed = moved.some((p) => {
    const o = parts.find((q) => q.id === p.id)!;
    return p.x !== o.x || p.y !== o.y;
  });
  return changed ? moved : null;
}
