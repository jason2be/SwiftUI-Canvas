"use client";

import React from "react";
import { alignParts, type AlignKind } from "@/lib/align";
import { getT } from "@/lib/i18n";
import type { Editor } from "@/lib/store";

/* The alignment controls, after the reference project's AlignSection: one row
 * for left / center / right / space-evenly, one for top / middle / bottom /
 * space-evenly. One selected part lines up with its screen's body; several
 * line up with each other. Each button draws a small picture of its result:
 * a dashed box for the reference and bars placed the way the parts will be. */

const ROWS: AlignKind[][] = [
  ["left", "centerH", "right", "distributeH"],
  ["top", "centerV", "bottom", "distributeV"],
];

function AlignGlyph({ kind }: { kind: AlignKind }) {
  const bars: [number, number, number, number][] =
    kind === "left" ? [[4, 7, 16, 6], [4, 15, 10, 6]]
    : kind === "centerH" ? [[12, 7, 16, 6], [15, 15, 10, 6]]
    : kind === "right" ? [[20, 7, 16, 6], [26, 15, 10, 6]]
    : kind === "distributeH" ? [[4, 8, 6, 12], [17, 8, 6, 12], [30, 8, 6, 12]]
    : kind === "top" ? [[12, 4, 6, 14], [22, 4, 6, 8]]
    : kind === "centerV" ? [[12, 7, 6, 14], [22, 10, 6, 8]]
    : kind === "bottom" ? [[12, 10, 6, 14], [22, 16, 6, 8]]
    : [[14, 4, 12, 4], [14, 12, 12, 4], [14, 20, 12, 4]];
  return (
    <svg width={40} height={28} viewBox="0 0 40 28" aria-hidden>
      <rect x={1} y={1} width={38} height={26} rx={3} fill="none" stroke="currentColor" opacity={0.28} strokeWidth={1} strokeDasharray="3 2" />
      {bars.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx={1.5} fill="currentColor" />
      ))}
    </svg>
  );
}

export default function AlignSection({ editor }: { editor: Editor }) {
  const { doc, lang, sel, mutate } = editor;
  const t = getT(lang);
  const ids = sel.length ? doc.parts.filter((p) => sel.includes(p.id)) : [];
  const screens = new Set(ids.map((p) => p.screen));
  if (!ids.length || screens.size !== 1) return null;
  const many = ids.length > 1;

  const align = (kind: AlignKind) => {
    const out = alignParts(doc, sel, kind);
    if (!out) return;
    mutate(
      (d) => ({
        ...d,
        parts: d.parts.map((p) => {
          const m = out.find((o) => o.id === p.id);
          return m ? { ...p, x: m.x, y: m.y } : p;
        }),
      }),
      `align:${kind}:${sel.join(",")}`,
    );
  };

  return (
    <div className="align-sec" data-title={t("align.title")}>
      {ROWS.map((row, i) => (
        <div key={i} className="align-row">
          {row.map((kind) => {
            const off = kind.startsWith("distribute") && ids.length < 3;
            return (
              <button
                key={kind}
                className="align-btn"
                onClick={() => align(kind)}
                disabled={off}
                title={t(`align.${kind}`)}
                aria-label={t(`align.${kind}`)}
              >
                <AlignGlyph kind={kind} />
              </button>
            );
          })}
        </div>
      ))}
      <p className="align-hint">{t(many ? "align.hintMany" : "align.hintOne")}</p>
    </div>
  );
}
