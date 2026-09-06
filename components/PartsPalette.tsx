"use client";

import React from "react";
import { getT, KIND_TEXT } from "@/lib/i18n";
import { PALETTE_ORDER, type Kind } from "@/lib/tokens";
import { glyphFor } from "@/lib/symbols";
import type { Editor } from "@/lib/store";

/* Left panel: the parts palette, grouped, draggable onto the canvas. */

const GROUPS: { key: string; kinds: Kind[] }[] = [
  { key: "group.controls", kinds: ["button", "iconButton", "toggle", "slider", "segmented", "picker", "textField", "searchField"] },
  { key: "group.bars", kinds: ["navBar", "tabBar"] },
  { key: "group.content", kinds: ["list", "card", "text", "image", "divider", "box", "progress", "gauge"] },
  { key: "group.present", kinds: ["alert", "sheet"] },
];

function KindGlyph({ kind }: { kind: Kind }) {
  const box: React.CSSProperties = {
    width: 44,
    height: 30,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--panel-2)",
    color: "var(--accent, #5AC8FA)",
    fontSize: 15,
    flex: "none",
  };
  switch (kind) {
    case "button":
      return <div style={{ ...box, borderRadius: 15, border: "1.5px solid var(--accent, #5AC8FA)", color: "var(--accent, #5AC8FA)", fontSize: 12, fontWeight: 600 }}>Aa</div>;
    case "iconButton":
      return <div style={{ ...box, borderRadius: 15, background: "var(--accent, #5AC8FA)", color: "#fff" }}>{glyphFor("plus")}</div>;
    case "toggle":
      return <div style={{ ...box, background: "transparent" }}><div style={{ width: 34, height: 20, borderRadius: 10, background: "#34C759", position: "relative" }}><div style={{ position: "absolute", right: 2, top: 2, width: 16, height: 16, borderRadius: 8, background: "#fff" }} /></div></div>;
    case "slider":
      return <div style={{ ...box, background: "transparent", position: "relative" }}><div style={{ width: 34, height: 3, borderRadius: 2, background: "var(--panel-3)" }} /><div style={{ position: "absolute", left: 18, top: 4, width: 14, height: 14, borderRadius: 7, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.4)" }} /></div>;
    case "segmented":
      return <div style={{ ...box, gap: 2 }}><span style={{ width: 10, height: 14, borderRadius: 3, background: "var(--panel-3)" }} /><span style={{ width: 10, height: 14, borderRadius: 3, background: "var(--accent, #5AC8FA)" }} /><span style={{ width: 10, height: 14, borderRadius: 3, background: "var(--panel-3)" }} /></div>;
    case "picker":
      return <div style={{ ...box, color: "var(--text-2)", fontSize: 12 }}>{glyphFor("chevron.up.chevron.down")}</div>;
    case "textField":
      return <div style={{ ...box, background: "transparent" }}><div style={{ width: 34, height: 18, borderRadius: 5, border: "1px solid var(--panel-3)", display: "flex", alignItems: "center", paddingLeft: 4, color: "var(--text-2)", fontSize: 10 }}>|</div></div>;
    case "searchField":
      return <div style={{ ...box, borderRadius: 15, color: "var(--text-2)" }}>{glyphFor("magnifyingglass")}</div>;
    case "navBar":
      return <div style={{ ...box, background: "var(--panel-3)", color: "var(--text-1)", fontSize: 11, fontWeight: 600 }}>Aa</div>;
    case "tabBar":
      return <div style={{ ...box, gap: 3, background: "var(--panel-3)" }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: 3, background: i === 0 ? "var(--accent, #5AC8FA)" : "var(--text-2)" }} />)}</div>;
    case "list":
      return <div style={{ ...box, flexDirection: "column", gap: 2, background: "transparent" }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 32, height: 5, borderRadius: 2, background: "var(--panel-3)" }} />)}</div>;
    case "card":
      return <div style={{ ...box, flexDirection: "column", gap: 2, alignItems: "flex-start", padding: "5px 7px", border: "1px solid var(--panel-3)" }}><span style={{ width: 16, height: 3, borderRadius: 2, background: "var(--accent, #5AC8FA)" }} /><span style={{ width: 26, height: 3, borderRadius: 2, background: "var(--panel-3)" }} /><span style={{ width: 20, height: 3, borderRadius: 2, background: "var(--panel-3)" }} /></div>;
    case "alert":
      return <div style={{ ...box, flexDirection: "column", gap: 2, border: "1px solid var(--panel-3)" }}><span style={{ width: 20, height: 3, borderRadius: 2, background: "var(--panel-3)" }} /><span style={{ width: 26, height: 3, borderRadius: 2, background: "var(--accent, #5AC8FA)", marginTop: 2 }} /></div>;
    case "sheet":
      return <div style={{ ...box, alignItems: "flex-end", background: "transparent" }}><div style={{ width: 36, height: 12, borderRadius: "5px 5px 0 0", background: "var(--panel-3)" }} /></div>;
    case "progress":
      return <div style={{ ...box, background: "transparent" }}><div style={{ width: 34, height: 4, borderRadius: 2, background: "var(--panel-3)", position: "relative" }}><div style={{ width: 20, height: 4, borderRadius: 2, background: "var(--accent, #5AC8FA)" }} /></div></div>;
    case "gauge":
      return <div style={{ ...box, color: "var(--accent, #5AC8FA)", fontSize: 17 }}>◔</div>;
    case "text":
      return <div style={{ ...box, background: "transparent", fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>T</div>;
    case "image":
      return <div style={{ ...box, color: "var(--text-2)" }}>{glyphFor("photo")}</div>;
    case "divider":
      return <div style={{ ...box, background: "transparent" }}><div style={{ width: 34, height: 1, background: "var(--panel-3)" }} /></div>;
    case "box":
      return <div style={{ ...box, background: "transparent", border: "1.5px solid var(--panel-3)" }} />;
  }
}

export default function PartsPalette({ editor, onAdd }: { editor: Editor; onAdd: (kind: Kind) => void }) {
  const { lang } = editor;
  const t = getT(lang);
  return (
    <div className="palette">
      {GROUPS.map((g) => (
        <div key={g.key} className="palette-group">
          <div className="panel-title">{t(g.key)}</div>
          <div className="palette-grid">
            {g.kinds.map((k) => (
              <button
                key={k}
                className="palette-item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-sc-kind", k);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => onAdd(k)}
                title={KIND_TEXT[lang][k]}
              >
                <KindGlyph kind={k} />
                <span className="palette-name">{KIND_TEXT[lang][k]}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
