import { MARGIN, SCREEN_H, SCREEN_W, type Doc, type Part, partsOf } from "./tokens";

/** One tidy pass: bars to their edges, sheets to the bottom, the rest stacked
 * on 16pt margins in reading order. Returns a new parts array (or null when
 * nothing moved). */
export function tidyScreen(doc: Doc, screenId: string): Part[] | null {
  const parts = partsOf(doc, screenId);
  const moved = parts.map((p) => ({ ...p }));
  const top = moved.filter((p) => p.kind === "navBar");
  const bottom = moved.filter((p) => p.kind === "tabBar" || p.kind === "sheet");
  const rest = moved.filter((p) => p.kind !== "navBar" && p.kind !== "tabBar" && p.kind !== "sheet");

  for (const bar of top) {
    bar.x = 0;
    bar.y = 0;
  }
  for (const bar of bottom) {
    bar.x = 0;
    bar.y = SCREEN_H - (bar.h ?? (bar.kind === "tabBar" ? 83 : 260));
  }

  rest.sort((a, b) => (a.y - b.y) || (a.x - b.x));
  let y = top.length > 0 ? 100 : MARGIN;
  for (const p of rest) {
    const h = p.h ?? (p.kind === "box" ? 220 : p.kind === "image" ? 200 : p.kind === "card" ? 140 : 50);
    if (p.kind === "divider" || p.kind === "text") {
      p.x = p.x < SCREEN_W / 2 ? MARGIN : p.x;
    } else {
      p.x = MARGIN;
    }
    p.y = Math.min(y, SCREEN_H - h - 90);
    y = p.y + h + MARGIN;
  }

  const changed = moved.some((p, i) => p.x !== parts[i].x || p.y !== parts[i].y);
  return changed ? moved : null;
}
