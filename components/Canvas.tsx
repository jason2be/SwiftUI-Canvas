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
import Icon from "./Icon";
import type { IconField } from "./Inspector";
import type { Editor } from "@/lib/store";
import {
  computeSnap,
  guidesBetween,
  snapTargetsFor,
  type GuideLine,
} from "@/lib/snapping";
import { partSize, MARGIN } from "@/lib/tokens";

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
  const { doc, lang, tool, sel, setSel, activeScreen, setActiveScreen, mutate } = editor;
  const t = getT(lang);
  const pal = paletteOf(doc.theme);
  const hostRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 60, y: 60, z: 0.7 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [space, setSpace] = useState(false);
  const [guides, setGuides] = useState<(GuideLine & { equal?: boolean })[]>([]);
  const [guideScreen, setGuideScreen] = useState<string | null>(null);
  const drag = useRef<
    | { mode: "pan"; sx: number; sy: number; vx: number; vy: number }
    | { mode: "part"; ids: string[]; sx: number; sy: number; origins: Map<string, { x: number; y: number }> }
    | { mode: "screen"; id: string; sx: number; sy: number; ox: number; oy: number }
    | null
  >(null);

  const clearGuides = () => {
    setGuides([]);
    setGuideScreen(null);
  };

  const flashGuides = (lines: (GuideLine & { equal?: boolean })[], screenId: string) => {
    setGuides(lines);
    setGuideScreen(screenId);
    setTimeout(clearGuides, 700);
  };

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
    drag.current = { mode: "part", ids, sx: e.clientX, sy: e.clientY, origins };
  };

  const onScreenDown = (e: React.PointerEvent, screen: Screen) => {
    if (tool === "hand" || space) return;
    e.stopPropagation();
    setActiveScreen(screen.id);
    setSel([]);
    // drag the whole screen by its empty areas
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
      const primary = doc.parts.find((p) => p.id === d.ids[0]);
      if (!primary) return;
      const w = primary.w ?? partSize(primary.kind).w;
      const h = primary.h ?? partSize(primary.kind).h;
      const o = d.origins.get(d.ids[0])!;

      // base position: free with Alt, else on the 8pt grid
      const grid = e.altKey ? (v: number) => v : (v: number) => Math.round(v / 8) * 8;
      let nx = grid(o.x + dx);
      let ny = grid(o.y + dy);

      // magnetic alignment: edges/centers vs peers, margins, center, bars
      const lines: (GuideLine & { equal?: boolean })[] = [];
      if (!e.altKey) {
        const targets = snapTargetsFor({
          screen: { id: primary.screen },
          doc,
          width: (p) => p.w ?? partSize(p.kind).w,
          height: (p) => p.h ?? partSize(p.kind).h,
        });
        const peers = targets.peers.filter((p) => !d.ids.includes(p.id ?? ""));
        const res = computeSnap({ x: nx, y: ny, w, h }, { ...targets, peers });
        nx += res.dx;
        ny += res.dy;
        if (res.guide) {
          lines.push(...guidesBetween({ x: nx, y: ny, w, h }, res.guide, peers, { x: 0, y: 0 }));
          if (res.equal) {
            lines.push({
              axis: res.equal.axis,
              at: res.equal.at,
              from: res.equal.axis === "x" ? ny : nx,
              to: res.equal.axis === "x" ? ny + h : nx + w,
              equal: true,
            });
          }
        }
      }
      if (lines.length) {
        setGuides(lines);
        setGuideScreen(primary.screen);
      } else if (guideScreen) {
        clearGuides();
      }

      // apply the same magnetic correction to every selected part
      const corrX = nx - (o.x + dx);
      const corrY = ny - (o.y + dy);
      mutate((doc0) => {
        const parts = doc0.parts.map((p) => {
          if (!d.ids.includes(p.id)) return p;
          const po = d.origins.get(p.id)!;
          const pw = p.w ?? partSize(p.kind).w;
          return {
            ...p,
            x: clamp(grid(po.x + dx) + corrX, 0, Math.max(0, SCREEN_W - pw)),
            y: clamp(grid(po.y + dy) + corrY, 0, Math.max(0, SCREEN_H - 40)),
          };
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
    clearGuides();
  };

  // palette drop
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/x-sc-kind") as Kind;
    if (!kind) return;
    const pt = toDoc(e.clientX, e.clientY);
    const target = hitScreen(doc, pt.x, pt.y) ?? doc.screens[0];
    if (!target) return;
    const size = partSize(kind);
    const localX = pt.x - target.x;
    const localY = pt.y - target.y;

    // classic-position snapping on drop: near margins / h-center / content top
    const near = (v: number, t: number, r = 12) => Math.abs(v - t) <= r;
    const xs = [MARGIN, SCREEN_W - MARGIN - size.w, Math.round((SCREEN_W - size.w) / 2)];
    const ys = [MARGIN, 150];
    let x = clamp(localX - size.w / 2, 0, SCREEN_W - size.w);
    let y = clamp(localY - size.h / 2, 0, SCREEN_H - size.h);
    let axis: "x" | "y" | null = null;
    for (const cx of xs) {
      if (near(x, cx, 14)) {
        x = cx;
        axis = "x";
        break;
      }
    }
    for (const cy of ys) {
      if (near(y, cy, 14)) {
        y = cy;
        axis = axis ? axis : "y";
        break;
      }
    }

    const part = defaultPart(lang, target.id, kind, x, y);
    mutate((doc0) => ({ ...doc0, parts: [...doc0.parts, part] }));
    setActiveScreen(target.id);

    // flash a guide showing what snapped
    const line: GuideLine & { equal?: boolean } =
      axis === "x"
        ? { axis: "x", at: x, from: y, to: y + size.h }
        : axis === "y"
          ? { axis: "y", at: y, from: x, to: x + size.w }
          : { axis: "x", at: x, from: y, to: y + size.h };
    if (axis) flashGuides([line], target.id);
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
                    <SwiftPart part={p} palette={pal} capsule={doc.theme.shape === "capsule"} dark={doc.theme.scheme === "dark"} lang={lang} />
                    {p.link ? <span className="part-link-badge">→</span> : null}
                  </div>
                ))}
                {/* alignment guides for the active drag, drawn in screen space */}
                {guides.map((g, i) => (
                  <div
                    key={i}
                    className={`align-guide${g.equal ? " equal" : ""}${guideScreen === screen.id ? "" : " hidden"}`}
                    style={
                      g.axis === "x"
                        ? { left: g.at - 1, top: g.from, width: 2, height: Math.max(0, g.to - g.from) }
                        : { left: g.from, top: g.at - 1, width: Math.max(0, g.to - g.from), height: 2 }
                    }
                  />
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
          {doc.parts.map((p) => {
            // tab items navigate through options[].target; draw their flow too
            if (p.kind !== "tabBar") return null;
            const from = doc.screens.find((s) => s.id === p.screen);
            if (!from) return null;
            const opts = p.options ?? [];
            const w = (p.w ?? SCREEN_W) / Math.max(1, opts.length);
            return opts.map((o, i) => {
              if (!o.target || o.target === BACK_TARGET) return null;
              const to = doc.screens.find((s) => s.id === o.target);
              if (!to) return null;
              const x1 = from.x + p.x + w * (i + 0.5);
              const y1 = from.y + p.y + 12;
              const x2 = to.x + SCREEN_W / 2;
              const y2 = to.y + SCREEN_H / 2;
              const mx = (x1 + x2) / 2 + (y2 - y1) * 0.15;
              const my = (y1 + y2) / 2 - (x2 - x1) * 0.15;
              return <path key={`${p.id}:${i}`} d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} fill="none" stroke={pal.accent} strokeWidth={2} strokeDasharray="4 5" markerEnd="url(#arrow-head)" opacity={0.7} />;
            });
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
  return p.w ?? partSize(p.kind, p).w;
}

export function addScreenAt(doc: Doc, lang: "en" | "zh"): Doc {
  const s = newScreen(lang, doc.screens.length);
  const maxX = Math.max(0, ...doc.screens.map((sc) => sc.x));
  return { ...doc, screens: [...doc.screens, { ...s, x: maxX + SCREEN_W + 120, y: doc.screens[0]?.y ?? 60 }] };
}
