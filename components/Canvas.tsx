"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { getT } from "@/lib/i18n";
import { paletteOf } from "@/lib/theme";
import {
  BACK_TARGET,
  SCREEN_H,
  SCREEN_W,
  clamp,
  defaultPart,
  newScreen,
  partsOf,
  type Doc,
  type Kind,
  type Part,
  type Screen,
} from "@/lib/tokens";
import SwiftPart from "./SwiftPart";
import type { IconField } from "./Inspector";
import type { Editor } from "@/lib/store";

/* The infinite canvas: screens laid out in document space, pan/zoom in view
 * space, drag & drop from the palette, drag to move parts, link arrows. */

interface Props {
  editor: Editor;
  onOpenIcon: (partId: string, field: IconField) => void;
}

interface View {
  x: number;
  y: number;
  z: number;
}

const MIN_Z = 0.25;
const MAX_Z = 2.5;

export default function Canvas({ editor, onOpenIcon }: Props) {
  const { doc, lang, tool, sel, setSel, activeScreen, setActiveScreen, mutate, beginBatch } = editor;
  const t = getT(lang);
  const pal = paletteOf(doc.theme);
  const hostRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 60, y: 60, z: 0.7 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [space, setSpace] = useState(false);
  const drag = useRef<
    | { mode: "pan"; sx: number; sy: number; vx: number; vy: number }
    | { mode: "part"; ids: string[]; sx: number; sy: number; origins: Map<string, { x: number; y: number }> }
    | { mode: "screen"; id: string; sx: number; sy: number; ox: number; oy: number }
    | null
  >(null);

  // non-passive wheel: pan, ctrl+wheel zoom
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const z = clamp(v.z * (1 - e.deltaY * 0.002), MIN_Z, MAX_Z);
        const k = z / v.z;
        setView({ z, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
      } else {
        setView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY });
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // space held => temporary hand
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target as HTMLElement)?.matches?.("input, textarea")) setSpace(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpace(false);
    };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const toDoc = useCallback((clientX: number, clientY: number) => {
    const rect = hostRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (clientX - rect.left - v.x) / v.z, y: (clientY - rect.top - v.y) / v.z };
  }, []);

  const startPan = (e: React.PointerEvent) => {
    drag.current = { mode: "pan", sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onBackgroundDown = (e: React.PointerEvent) => {
    if (tool === "hand" || space || e.button === 1) {
      startPan(e);
      return;
    }
    setSel([]);
    setActiveScreen(null);
  };

  const onPartDown = (e: React.PointerEvent, part: Part) => {
    if (tool === "hand" || space) return; // let pan take it
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (e.shiftKey) {
      setSel(sel.includes(part.id) ? sel.filter((s) => s !== part.id) : [...sel, part.id]);
      return;
    }
    if (!sel.includes(part.id)) setSel([part.id]);
    const ids = sel.includes(part.id) ? sel : [part.id];
    const origins = new Map<string, { x: number; y: number }>();
    for (const id of ids) {
      const p = doc.parts.find((pp) => pp.id === id);
      if (p) origins.set(id, { x: p.x, y: p.y });
    }
    beginBatch();
    drag.current = { mode: "part", ids, sx: e.clientX, sy: e.clientY, origins };
  };

  const onScreenDown = (e: React.PointerEvent, screen: Screen) => {
    if (tool === "hand" || space) return;
    e.stopPropagation();
    setActiveScreen(screen.id);
    setSel([]);
    // drag the whole screen by its empty areas
    beginBatch();
    drag.current = { mode: "screen", id: screen.id, sx: e.clientX, sy: e.clientY, ox: screen.x, oy: screen.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.mode === "pan") {
      setView((v) => ({ ...v, x: d.vx + (e.clientX - d.sx), y: d.vy + (e.clientY - d.sy) }));
    } else if (d.mode === "part") {
      const dx = (e.clientX - d.sx) / view.z;
      const dy = (e.clientY - d.sy) / view.z;
      const snap = e.altKey ? (v: number) => v : (v: number) => Math.round(v / 8) * 8;
      mutate((doc0) => {
        const parts = doc0.parts.map((p) => {
          const o = d.origins.get(p.id);
          if (!o) return p;
          const w = p.w ?? defaultW(p);
          return { ...p, x: clamp(snap(o.x + dx), 0, Math.max(0, SCREEN_W - w)), y: clamp(snap(o.y + dy), 0, Math.max(0, SCREEN_H - 40)) };
        });
        return { ...doc0, parts };
      }, `drag:${d.ids[0]}`);
    } else if (d.mode === "screen") {
      const dx = (e.clientX - d.sx) / view.z;
      const dy = (e.clientY - d.sy) / view.z;
      mutate((doc0) => ({
        ...doc0,
        screens: doc0.screens.map((s) => (s.id === d.id ? { ...s, x: Math.round(d.ox + dx), y: Math.round(d.oy + dy) } : s)),
      }), `screen:${d.id}`);
    }
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  // palette drop
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/x-sc-kind") as Kind;
    if (!kind) return;
    const pt = toDoc(e.clientX, e.clientY);
    const target = hitScreen(doc, pt.x, pt.y) ?? doc.screens[0];
    if (!target) return;
    const w = defaultW({ kind } as Part);
    const x = clamp(Math.round((pt.x - target.x - w / 2) / 4) * 4, 0, SCREEN_W - w);
    const y = clamp(Math.round((pt.y - target.y - 24) / 4) * 4, 0, SCREEN_H - 100);
    mutate((doc0) => {
      const p = defaultPart(lang, target.id, kind, x, y);
      return { ...doc0, parts: [...doc0.parts, p] };
    });
    setActiveScreen(target.id);
  };

  // fit view to content
  const fit = useCallback(() => {
    const el = hostRef.current;
    if (!el || doc.screens.length === 0) return;
    const minX = Math.min(...doc.screens.map((s) => s.x));
    const minY = Math.min(...doc.screens.map((s) => s.y));
    const maxX = Math.max(...doc.screens.map((s) => s.x + SCREEN_W));
    const maxY = Math.max(...doc.screens.map((s) => s.y + SCREEN_H));
    const pad = 60;
    const z = clamp(Math.min((el.clientWidth - pad * 2) / (maxX - minX), (el.clientHeight - pad * 2) / (maxY - minY)), MIN_Z, 1.2);
    setView({ z, x: pad - minX * z, y: pad - minY * z });
  }, [doc.screens]);

  useEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // zoom API for keyboard shortcuts
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    (el as HTMLDivElement & { __zoom?: (dir: number) => void }).__zoom = (dir: number) => {
      const v = viewRef.current;
      if (dir === 0) {
        fit();
        return;
      }
      const z = clamp(v.z * (dir > 0 ? 1.2 : 1 / 1.2), MIN_Z, MAX_Z);
      const cx = el.clientWidth / 2;
      const cy = el.clientHeight / 2;
      const k = z / v.z;
      setView({ z, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
    };
  }, [fit]);

  const cursor = tool === "hand" || space ? "grab" : "default";

  return (
    <div
      ref={hostRef}
      className="canvas-host"
      style={{ cursor }}
      onPointerDown={onBackgroundDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).classList.contains("canvas-host")) fit();
      }}
    >
      <div
        className="canvas-world"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}
      >
        {doc.screens.map((screen) => {
          const parts = partsOf(doc, screen.id);
          const isActive = activeScreen === screen.id;
          return (
            <div key={screen.id} className="screen-wrap" style={{ left: screen.x, top: screen.y }}>
              <div className="screen-label" onPointerDown={(e) => e.stopPropagation()}>
                <span
                  className="screen-name"
                  title={t("action.rename")}
                  onDoubleClick={() => {
                    const name = prompt(t("action.rename"), screen.name);
                    if (name && name.trim()) mutate((d) => ({ ...d, screens: d.screens.map((s) => (s.id === screen.id ? { ...s, name: name.trim() } : s)) }));
                  }}
                >
                  {screen.name}
                </span>
                <button
                  className="screen-del"
                  title={t("action.delete")}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (doc.screens.length > 1 && confirm(t("confirm.deleteScreen"))) {
                      mutate((d) => ({ ...d, screens: d.screens.filter((s) => s.id !== screen.id), parts: d.parts.filter((p) => p.screen !== screen.id) }));
                      if (activeScreen === screen.id) setActiveScreen(null);
                    }
                  }}
                >
                  ×
                </button>
              </div>
              <div
                className={`screen-frame${isActive ? " active" : ""}`}
                style={{ width: SCREEN_W, height: SCREEN_H, background: doc.theme.scheme === "dark" ? "#000" : "#F2F2F7" }}
                onPointerDown={(e) => onScreenDown(e, screen)}
                role="presentation"
              >
                {/* dynamic island */}
                <div className="screen-island" style={{ background: doc.theme.scheme === "dark" ? "#000" : "#000" }} />
                {parts.map((p) => (
                  <div
                    key={p.id}
                    className={`part-wrap${sel.includes(p.id) ? " selected" : ""}`}
                    style={{ left: p.x, top: p.y, width: p.w ?? defaultW(p) }}
                    onPointerDown={(e) => onPartDown(e, p)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (p.kind === "iconButton" || p.kind === "navBar") onOpenIcon(p.id, p.kind === "navBar" ? "icon2" : "icon");
                    }}
                  >
                    <SwiftPart part={p} palette={pal} capsule={doc.theme.shape === "capsule"} dark={doc.theme.scheme === "dark"} />
                    {p.link ? <span className="part-link-badge">→</span> : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* link arrows */}
        <svg className="canvas-arrows" width={1} height={1} style={{ overflow: "visible", position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
          <defs>
            <marker id="arrow-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 z" fill={pal.accent} />
            </marker>
          </defs>
          {doc.parts.map((p) => {
            if (!p.link || p.link.target === BACK_TARGET) return null;
            const from = doc.screens.find((s) => s.id === p.screen);
            const to = doc.screens.find((s) => s.id === p.link!.target);
            if (!from || !to) return null;
            const x1 = from.x + p.x + (p.w ?? 60) / 2;
            const y1 = from.y + p.y + 20;
            const x2 = to.x + SCREEN_W / 2;
            const y2 = to.y + SCREEN_H / 2;
            const mx = (x1 + x2) / 2 + (y2 - y1) * 0.15;
            const my = (y1 + y2) / 2 - (x2 - x1) * 0.15;
            return <path key={p.id} d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} fill="none" stroke={pal.accent} strokeWidth={2.5} strokeDasharray="7 5" markerEnd="url(#arrow-head)" opacity={0.85} />;
          })}
        </svg>
      </div>

      <div className="canvas-hud">
        <button onClick={() => (hostRef.current as (HTMLDivElement & { __zoom?: (d: number) => void }) | null)?.__zoom?.(1)} title="Zoom in">＋</button>
        <button onClick={() => (hostRef.current as (HTMLDivElement & { __zoom?: (d: number) => void }) | null)?.__zoom?.(-1)} title="Zoom out">－</button>
        <button onClick={() => (hostRef.current as (HTMLDivElement & { __zoom?: (d: number) => void }) | null)?.__zoom?.(0)} title="Fit (0)">⤢</button>
        <span className="zoom-num">{Math.round(view.z * 100)}%</span>
      </div>
      {doc.screens.length === 0 ? <div className="canvas-empty">{t("screen.empty")}</div> : null}
    </div>
  );
}

function hitScreen(doc: Doc, x: number, y: number): Screen | null {
  for (let i = doc.screens.length - 1; i >= 0; i--) {
    const s = doc.screens[i];
    if (x >= s.x && x <= s.x + SCREEN_W && y >= s.y && y <= s.y + SCREEN_H) return s;
  }
  return null;
}

export function defaultW(p: Part): number {
  return p.w ?? (p.kind === "navBar" || p.kind === "tabBar" || p.kind === "sheet" ? SCREEN_W : 160);
}

export function addScreenAt(doc: Doc, lang: "en" | "zh"): Doc {
  const s = newScreen(lang, doc.screens.length);
  const maxX = Math.max(0, ...doc.screens.map((sc) => sc.x));
  return { ...doc, screens: [...doc.screens, { ...s, x: maxX + SCREEN_W + 120, y: doc.screens[0]?.y ?? 60 }] };
}
