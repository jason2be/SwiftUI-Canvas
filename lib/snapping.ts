/* Alignment guides and magnetic snapping.
 *
 * While a part is dragged, its left/right/center (and top/bottom/center) are
 * compared against a target set: the screen's edges, center and 16pt margins,
 * plus every other part's edges and center. The strongest pull wins, the drag
 * is nudged so the lines coincide, and the winning line is drawn as a guide
 * while the drag lasts. Cross-axis guides appear when the dragged part sits
 * at an equal distance between two neighbors. */

import type { CSSProperties } from "react";
import { MARGIN, SCREEN_H, SCREEN_W, type Kind } from "./tokens";

/** how close a line must be before it starts pulling (pt) */
export const SNAP_RANGE = 7;
/** pull strength ramp exponent, borrowed from the reference project's feel */
const PULL_EXP = 2.2;

export interface Guide {
  axis: "x" | "y";
  /** position of the line in screen coordinates */
  at: number;
}

export interface SnapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Peer extends SnapRect {
  id?: string;
}

export interface SnapTargets {
  xs: number[];
  ys: number[];
  peers: Peer[];
}

export interface SnapResult {
  dx: number;
  dy: number;
  pull: number;
  guide?: Guide;
  /** equal-spacing partner edge found on the cross axis */
  equal?: { axis: "x" | "y"; at: number };
}

/* ---------- target collection ---------- */

export function snapTargetsFor(args: {
  screen: { id: string | null };
  doc: {
    screens: { id: string }[];
    parts: { id: string; screen: string | null; kind: Kind; x: number; y: number; w?: number; h?: number }[];
  };
  width: (p: { kind: Kind; w?: number }) => number;
  height: (p: { kind: Kind; h?: number }) => number;
  /** ids of the parts being dragged: their own edges must not be targets,
   * or the part chases its last committed position */
  exclude?: string[];
}): SnapTargets {
  // screen anchors apply only on a screen; canvas-level parts snap to each other
  const xs: number[] = args.screen.id === null ? [] : [
    0,
    SCREEN_W,
    SCREEN_W / 2,
    MARGIN,
    SCREEN_W - MARGIN,
  ];
  const ys: number[] = args.screen.id === null ? [] : [
    0,
    SCREEN_H,
    SCREEN_H / 2,
    MARGIN,
    SCREEN_H - MARGIN,
  ];

  // content boundaries: below the nav bar, above the tab bar / sheet
  for (const p of args.doc.parts) {
    if (p.screen !== args.screen.id) continue;
    if (args.exclude?.includes(p.id)) continue;
    if (p.kind === "navBar") ys.push(p.y + (p.h ?? 96));
    if (p.kind === "tabBar" || p.kind === "sheet") ys.push(p.y);
  }

  const peers: Peer[] = [];
  for (const p of args.doc.parts) {
    if (p.screen !== args.screen.id) continue;
    if (args.exclude?.includes(p.id)) continue;
    if (p.kind === "navBar" || p.kind === "tabBar") continue;
    const w = args.width(p);
    const h = args.height(p);
    peers.push({ x: p.x, y: p.y, w, h, id: p.id });
    xs.push(p.x, p.x + w, p.x + w / 2);
    ys.push(p.y, p.y + h, p.y + h / 2);
  }

  return { xs, ys, peers };
}

/* ---------- magnetic pull ---------- */

interface Candidate {
  delta: number;
  dist: number;
  pull: number;
  guide: Guide;
}

function bestCandidate(offsets: number[], targets: number[], axis: "x" | "y", rect: SnapRect): Candidate | null {
  let best: Candidate | null = null;
  for (const off of offsets) {
    for (const t of targets) {
      const delta = t - off;
      const dist = Math.abs(delta);
      if (dist > SNAP_RANGE) continue;
      const pull = (1 - dist / SNAP_RANGE) ** PULL_EXP;
      // epsilon: floating-point drift from a previous snap can leave an edge
      // a hair off a target (276.49999… vs 276.5); without this, a phantom
      // near-zero pull wins the tie and produces a bogus guide
      const better = best === null || dist < best.dist - 1e-6 || (dist <= best.dist + 1e-6 && pull > best.pull);
      if (better) {
        best = { delta, dist, pull, guide: { axis, at: t } };
      }
    }
  }
  return best;
}

/** Nudge a dragged rect toward the strongest alignment line. `dx`/`dy` are the
 * proposed motion deltas; the result adds the magnetic correction. */
export function computeSnap(rect: SnapRect, targets: SnapTargets): SnapResult {
  const xCand = bestCandidate([rect.x, rect.x + rect.w, rect.x + rect.w / 2], targets.xs, "x", rect);
  const yCand = bestCandidate([rect.y, rect.y + rect.h, rect.y + rect.h / 2], targets.ys, "y", rect);
  const dx = xCand?.delta ?? 0;
  const dy = yCand?.delta ?? 0;
  const pull = Math.max(xCand?.pull ?? 0, yCand?.pull ?? 0);
  const guide = !xCand && !yCand ? undefined : (yCand && (!xCand || yCand.pull > xCand.pull) ? yCand : xCand)!.guide;

  const moved: SnapRect = { ...rect, x: rect.x + dx, y: rect.y + dy };
  const equal = findEqualSpacing(moved, targets.peers);
  return { dx, dy, pull, guide, equal };
}

/** finds a cross-axis gap equality: |a - rect.left| ≈ |rect.right - b| within 2pt */
function findEqualSpacing(rect: SnapRect, peers: Peer[]): SnapResult["equal"] {
  for (const axis of ["x", "y"] as const) {
    const lo = axis === "x" ? rect.x : rect.y;
    const hi = axis === "x" ? rect.x + rect.w : rect.y + rect.h;
    const lefts: number[] = [];
    const rights: number[] = [];
    for (const p of peers) {
      const plo = axis === "x" ? p.x : p.y;
      const phi = axis === "x" ? p.x + p.w : p.y + p.h;
      if (phi <= lo + 0.5) lefts.push(phi);
      if (plo >= hi - 0.5) rights.push(plo);
    }
    for (const l of lefts) {
      for (const r of rights) {
        const gapL = lo - l;
        const gapR = r - hi;
        if (gapL > 0 && gapR > 0 && Math.abs(gapL - gapR) <= 2 && gapL <= 80) {
          return { axis, at: axis === "x" ? (l + r + rect.w) / 2 : (l + r + rect.h) / 2 };
        }
      }
    }
  }
  return undefined;
}

/* ---------- guide rendering ---------- */

export interface GuideLine extends Guide {
  from: number;
  to: number;
}

/** extent of a guide line: across the dragged part plus any peer sharing the
 * same line, falling back to the full screen length. */
export function guidesBetween(
  rect: SnapRect,
  guide: Guide,
  peers: Peer[],
  screen: { x: number; y: number }
): GuideLine[] {
  const lines: GuideLine[] = [];
  const along = guide.axis === "x" ? [rect.y, rect.y + rect.h] : [rect.x, rect.x + rect.w];
  let from = Math.min(...along);
  let to = Math.max(...along);
  let shared = false;
  for (const p of peers) {
    const pos = guide.axis === "x" ? [p.x, p.x + p.w, p.x + p.w / 2] : [p.y, p.y + p.h, p.y + p.h / 2];
    if (!pos.some((v) => Math.abs(v - guide.at) < 0.5)) continue;
    shared = true;
    const other = guide.axis === "x" ? [p.y, p.y + p.h] : [p.x, p.x + p.w];
    from = Math.min(from, ...other);
    to = Math.max(to, ...other);
  }
  if (!shared) {
    from = 0;
    to = guide.axis === "x" ? SCREEN_H : SCREEN_W;
  }
  lines.push({
    axis: guide.axis,
    at: guide.at,
    from,
    to,
  });
  return lines;
}

/** screen-coordinate position for CSS placement */
export function guideToStyle(line: GuideLine, screen: { x: number; y: number }): CSSProperties {
  void screen;
  if (line.axis === "x") {
    return { left: line.at - 1, top: line.from, width: 2, height: line.to - line.from };
  }
  return { left: line.from, top: line.at - 1, width: line.to - line.from, height: 2 };
}
