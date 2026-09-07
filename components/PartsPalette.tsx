"use client";

import React, { useEffect, useRef, useState } from "react";
import { getT, KIND_TEXT } from "@/lib/i18n";
import { type Kind } from "@/lib/tokens";
import Icon from "./Icon";
import type { Editor } from "@/lib/store";

/* Left panel: the parts palette, grouped, draggable onto the canvas. */

const GROUPS: { key: string; kinds: Kind[] }[] = [
  { key: "group.controls", kinds: ["button", "iconButton", "toggle", "slider", "stepper", "segmented", "picker", "menu", "datePicker", "textField", "secureField", "textEditor", "searchField"] },
  { key: "group.bars", kinds: ["navBar", "tabBar"] },
  { key: "group.content", kinds: ["list", "disclosure", "labeledContent", "card", "text", "link", "shareLink", "image", "divider", "box", "progress", "gauge", "chart", "map", "contentUnavailable"] },
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
      return <div style={{ ...box, borderRadius: 15, background: "var(--accent, #5AC8FA)", color: "#fff" }}><Icon name="plus" size={14} /></div>;
    case "toggle":
      return <div style={{ ...box, background: "transparent" }}><div style={{ width: 34, height: 20, borderRadius: 10, background: "#34C759", position: "relative" }}><div style={{ position: "absolute", right: 2, top: 2, width: 16, height: 16, borderRadius: 8, background: "#fff" }} /></div></div>;
    case "slider":
      return <div style={{ ...box, background: "transparent", position: "relative" }}><div style={{ width: 34, height: 3, borderRadius: 2, background: "var(--panel-3)" }} /><div style={{ position: "absolute", left: 18, top: 4, width: 14, height: 14, borderRadius: 7, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.4)" }} /></div>;
    case "segmented":
      return <div style={{ ...box, gap: 2 }}><span style={{ width: 10, height: 14, borderRadius: 3, background: "var(--panel-3)" }} /><span style={{ width: 10, height: 14, borderRadius: 3, background: "var(--accent, #5AC8FA)" }} /><span style={{ width: 10, height: 14, borderRadius: 3, background: "var(--panel-3)" }} /></div>;
    case "picker":
      return <div style={{ ...box, color: "var(--text-2)" }}><Icon name="chevron.up.chevron.down" size={12} /></div>;
    case "textField":
      return <div style={{ ...box, background: "transparent" }}><div style={{ width: 34, height: 18, borderRadius: 5, border: "1px solid var(--panel-3)", display: "flex", alignItems: "center", paddingLeft: 4, color: "var(--text-2)", fontSize: 10 }}>|</div></div>;
    case "searchField":
      return <div style={{ ...box, borderRadius: 15, color: "var(--text-2)" }}><Icon name="magnifyingglass" size={13} /></div>;
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
      return <div style={{ ...box, color: "var(--text-2)" }}><Icon name="photo" size={15} /></div>;
    case "divider":
      return <div style={{ ...box, background: "transparent" }}><div style={{ width: 34, height: 1, background: "var(--panel-3)" }} /></div>;
    case "box":
      return <div style={{ ...box, background: "transparent", border: "1.5px solid var(--panel-3)" }} />;
    case "menu":
      return <div style={{ ...box, borderRadius: 15, border: "1.5px solid var(--accent, #5AC8FA)", color: "var(--accent, #5AC8FA)", fontSize: 11, fontWeight: 600, gap: 2 }}>Aa<Icon name="chevron.up.chevron.down" size={9} /></div>;
    case "stepper":
      return <div style={{ ...box, gap: 2, color: "var(--text-2)" }}><span style={{ width: 12, height: 18, borderRadius: 4, background: "var(--panel-3)", display: "grid", placeItems: "center", fontSize: 10 }}>−</span><span style={{ width: 12, height: 18, borderRadius: 4, background: "var(--panel-3)", display: "grid", placeItems: "center", fontSize: 10 }}>+</span></div>;
    case "datePicker":
      return <div style={{ ...box, color: "var(--text-2)" }}><Icon name="calendar" size={14} /></div>;
    case "secureField":
      return <div style={{ ...box, background: "transparent" }}><div style={{ width: 34, height: 18, borderRadius: 5, border: "1px solid var(--panel-3)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px", color: "var(--text-2)", fontSize: 9 }}>••••<Icon name="eye.slash" size={9} /></div></div>;
    case "textEditor":
      return <div style={{ ...box, flexDirection: "column", gap: 2, alignItems: "flex-start", padding: "5px 7px", border: "1px solid var(--panel-3)" }}><span style={{ width: 20, height: 3, borderRadius: 2, background: "var(--panel-3)" }} /><span style={{ width: 26, height: 3, borderRadius: 2, background: "var(--panel-3)" }} /><span style={{ width: 14, height: 3, borderRadius: 2, background: "var(--panel-3)" }} /></div>;
    case "shareLink":
      return <div style={{ ...box, color: "var(--text-2)" }}><Icon name="square.and.arrow.up" size={15} /></div>;
    case "link":
      return <div style={{ ...box, background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--accent, #5AC8FA)", textDecoration: "underline" }}>Aa</div>;
    case "contentUnavailable":
      return <div style={{ ...box, flexDirection: "column", color: "var(--text-2)" }}><Icon name="tray" size={15} /></div>;
    case "disclosure":
      return <div style={{ ...box, color: "var(--text-2)", justifyContent: "space-between", padding: "0 7px" }}><span style={{ width: 14, height: 4, borderRadius: 2, background: "var(--panel-3)" }} /><Icon name="chevron.down" size={11} /></div>;
    case "labeledContent":
      return <div style={{ ...box, justifyContent: "space-between", padding: "0 7px" }}><span style={{ width: 12, height: 4, borderRadius: 2, background: "var(--panel-3)" }} /><span style={{ width: 8, height: 4, borderRadius: 2, background: "var(--accent, #5AC8FA)" }} /></div>;
    case "map":
      return <div style={{ ...box, color: "#ff3b30", background: "transparent" }}><Icon name="mappin" size={16} /></div>;
    case "chart":
      return <div style={{ ...box, gap: 2, alignItems: "flex-end", background: "transparent" }}>{[8, 14, 10, 17].map((h, i) => <span key={i} style={{ width: 6, height: h, borderRadius: "2px 2px 0 0", background: "var(--accent, #5AC8FA)", opacity: i === 3 ? 1 : 0.5 }} />)}</div>;
  }
}

export default function PartsPalette({ editor, onAdd, placeRef }: { editor: Editor; onAdd: (kind: Kind) => void; placeRef?: React.MutableRefObject<((kind: Kind, clientX: number, clientY: number) => void) | null> }) {
  const { lang } = editor;
  const t = getT(lang);
  // pointer fallback for touch (HTML5 drag does not fire there): track a
  // drag on a palette item and place it where the finger lifts
  const [ghost, setGhost] = useState<{ kind: Kind; x: number; y: number } | null>(null);
  const pending = useRef<{ kind: Kind; x: number; y: number; moved: boolean; touch: boolean; armed: boolean; pid: number } | null>(null);
  const suppressClick = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = pending.current;
      if (!p || e.pointerId !== p.pid) return;
      // touch arms only after a hold: until then the gesture belongs to the
      // panel's native scrolling (pan-y), and cancel cleans up
      if (p.touch && !p.armed) return;
      if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 8) return;
      p.moved = true;
      setGhost({ kind: p.kind, x: e.clientX, y: e.clientY });
    };
    const onUp = (e: PointerEvent) => {
      const p = pending.current;
      if (p && e.pointerId !== p.pid) return; // another finger lifting
      pending.current = null;
      setGhost(null);
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (!p) return;
      if (p.moved && placeRef?.current) {
        placeRef.current(p.kind, e.clientX, e.clientY);
        suppressClick.current = true;
      } else if (p.touch) {
        onAdd(p.kind); // a touch tap has no click on some browsers; place once
        suppressClick.current = true;
      }
    };
    // the browser can claim the gesture for scrolling at any moment (especially
    // on the scrollable left panel): release the drag cleanly or the next tap
    // would place a stale part
    const onCancel = () => {
      pending.current = null;
      setGhost(null);
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
    const onFirstMove = (e: PointerEvent) => {
      // real movement (past the same jitter the drag uses) before the hold
      // completes hands the gesture to scroll; pressure-only events do not
      const p = pending.current;
      if (!p || e.pointerId !== p.pid || p.armed) return;
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 8) return;
      if (holdTimer.current) {
        clearTimeout(holdTimer.current);
        holdTimer.current = null;
        pending.current = null;
      }
    };
    window.addEventListener("pointermove", onFirstMove, { capture: true, once: false });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onFirstMove, { capture: true });
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  });

  return (
    <div className="palette">
      {ghost ? (
        <div className="palette-ghost" style={{ left: ghost.x, top: ghost.y }}>
          <KindGlyph kind={ghost.kind} />
        </div>
      ) : null}
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
                onPointerDown={(e) => {
                  if (e.pointerType === "mouse") return; // mouse uses HTML5 drag
                  pending.current = { kind: k, x: e.clientX, y: e.clientY, moved: false, touch: true, armed: false, pid: e.pointerId };
                  // a 250ms hold picks the item up; earlier movement is scrolling
                  if (holdTimer.current) clearTimeout(holdTimer.current);
                  holdTimer.current = setTimeout(() => {
                    if (pending.current?.kind === k) pending.current.armed = true;
                  }, 250);
                }}
                onClick={() => {
                  if (suppressClick.current) {
                    suppressClick.current = false;
                    return;
                  }
                  onAdd(k);
                }}
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
