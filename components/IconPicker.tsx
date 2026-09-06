"use client";

import React, { useMemo, useState } from "react";
import { getT, type Lang } from "@/lib/i18n";
import { searchSymbols, SYMBOLS } from "@/lib/symbols";
import Icon from "./Icon";

/* SF Symbols picker: search + grid. Picking writes the exact symbol name;
 * the canvas shows an approximation glyph. */

interface Props {
  initial?: string | null;
  onPick: (name: string | null) => void;
  onClose: () => void;
  lang: Lang;
}

const CATS: { key: SymbolDefCat; en: string; zh: string }[] = [
  { key: "all", en: "All", zh: "全部" },
  { key: "common", en: "Common", zh: "常用" },
  { key: "media", en: "Media", zh: "媒体" },
  { key: "comms", en: "Comms", zh: "通信" },
  { key: "arrows", en: "Arrows", zh: "箭头" },
  { key: "nature", en: "Objects", zh: "对象" },
];

type SymbolDefCat = "all" | "common" | "media" | "comms" | "arrows" | "nature";

export default function IconPicker({ initial, onPick, onClose, lang }: Props) {
  const t = getT(lang);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<SymbolDefCat>("all");
  const list = useMemo(() => {
    let items = searchSymbols(q);
    if (cat !== "all") items = items.filter((s) => s.cat === cat);
    return items;
  }, [q, cat]);

  return (
    <div className="overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-icon" role="dialog" aria-label="SF Symbols">
        <div className="modal-head">
          <strong>SF Symbols</strong>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="name…" className="search-input" />
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="seg seg-cats">
          {CATS.map((c) => (
            <button key={c.key} className={cat === c.key ? "on" : ""} onClick={() => setCat(c.key)}>{lang === "zh" ? c.zh : c.en}</button>
          ))}
        </div>
        <div className="icon-grid">
          {list.map((s) => (
            <button
              key={s.name}
              className={`icon-cell${initial === s.name ? " on" : ""}`}
              title={s.name}
              onClick={() => onPick(s.name)}
            >
              <span className="icon-cell-glyph"><Icon name={s.name} size={20} /></span>
              <span className="icon-cell-name">{s.name}</span>
            </button>
          ))}
          {list.length === 0 ? <div className="hint">{t("iconpicker.none").replace("{q}", q)}</div> : null}
        </div>
        <div className="modal-foot">
          <span className="hint">{t("iconpicker.count").replace("{n}", String(SYMBOLS.length))}</span>
          <button className="mini" onClick={() => onPick(null)}>{t("iconpicker.clear")}</button>
        </div>
      </div>
    </div>
  );
}
