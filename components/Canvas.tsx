"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getT, KIND_TEXT, type Lang } from "@/lib/i18n";
import { loadCanvasPrefs, saveCanvasPrefs, DEFAULT_PREFS, type CanvasPrefs } from "@/lib/canvasPrefs";
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
import { ScreenChrome } from "./ScreenChrome";
import type { IconField } from "./Inspector";
import type { Editor } from "@/lib/store";
import {
  computeSnap,
  guidesBetween,
  snapTargetsFor,
  type GuideLine,
} from "@/lib/snapping";
import { partSize, MARGIN, screenBgCss } from "@/lib/tokens";

/* The infinite canvas: screens laid out in document space, pan/zoom in view
 * space, drag & drop from the palette, drag to move parts, link arrows. */

interface Props {
  editor: Editor;
  onOpenIcon: (partId: string, field: IconField) => void;
  /** exposed so the palette can place a part from pointer events (touch has no HTML5 drag) */
  placeRef?: React.MutableRefObject<((kind: Kind, clientX: number, clientY: number) => void) | null>;
}

interface View {
  x: number;
  y: number;
  z: number;
}

const MIN_Z = 0.25;
const MAX_Z = 2.5;
/* preset zoom levels: the +/- buttons, the level picker and future shortcuts
 * step through this ladder, so a free wheel-zoom value (e.g. 98%) can always
 * land back on a clean level; wheel zoom itself stays continuous */
const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5];

export default function Canvas({ editor, onOpenIcon, placeRef }: Props) {
  const { doc, lang, tool, sel, setSel, activeScreen, setActiveScreen, mutate } = editor;
  const t = getT(lang);
  const pal = useMemo(() => paletteOf(doc.theme), [doc.theme]);
  const hostRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 60, y: 60, z: 0.7 });
  // prefs are read AFTER mount: the canvas is server-prerendered, and reading
  // storage during render diverges from the SSR HTML — React 19 does not
  // patch attribute mismatches, so the class would stay the server value.
  // One dark first frame, then the saved surface applies. The loaded flag
  // keeps the save effect from writing defaults over the stored value.
  const [prefs, setPrefs] = useState<CanvasPrefs>(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  useEffect(() => {
    setPrefs(loadCanvasPrefs());
    setPrefsLoaded(true);
  }, []);
  useEffect(() => {
    if (prefsLoaded) saveCanvasPrefs(prefs);
  }, [prefs, prefsLoaded]);
  // the popover closes on Escape and on any press outside the gear area
  useEffect(() => {
    if (!prefsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPrefsOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      const host = hostRef.current;
      if (!host?.contains(e.target as Node)) return;
      if (!(e.target as HTMLElement).closest?.(".canvas-prefs-anchor")) setPrefsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [prefsOpen]);
  const viewRef = useRef(view);
  viewRef.current = view;
  const [space, setSpace] = useState(false);
  const [guides, setGuides] = useState<(GuideLine & { equal?: boolean })[]>([]);
  const [guideScreen, setGuideScreen] = useState<string | null>(null);
  const drag = useRef<
    | { mode: "pan"; sx: number; sy: number; vx: number; vy: number }
    | { mode: "part"; ids: string[]; sx: number; sy: number; space: { id: string } | { id: null }; origins: Map<string, { x: number; y: number }> }
    | { mode: "screen"; id: string; sx: number; sy: number; ox: number; oy: number }
    | { mode: "marquee"; sx: number; sy: number; add: boolean; base: string[] }
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
      const d = drag.current;
      if (d?.mode === "pan") {
        // a wheel adjustment during a pan drag must not be rolled back by
        // the drag's cached basis: resync it to the new view
        d.vx += -e.deltaX;
        d.vy += -e.deltaY;
      }
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

  // middle button pans from anywhere: capture phase beats the part/screen
  // handlers' stopPropagation, and preventDefault stops the browser's
  // autoscroll cursor before it starts
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const onMiddle = (e: PointerEvent) => {
      // middle button exists only on mice; ignore other pointer types
      if (e.pointerType !== "mouse" || e.button !== 1) return;
      // always suppress the browser's autoscroll cursor, even when we do
      // not take over, so an in-flight drag is never eaten by this handler
      e.preventDefault();
      if (drag.current) return;
      e.stopPropagation();
      const v = viewRef.current;
      drag.current = { mode: "pan", sx: e.clientX, sy: e.clientY, vx: v.x, vy: v.y };
      setMarquee(null);
      el.setPointerCapture?.(e.pointerId);
    };
    el.addEventListener("pointerdown", onMiddle, true);
    return () => el.removeEventListener("pointerdown", onMiddle, true);
  }, []);

  // space held => temporary hand
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target as HTMLElement)?.matches?.("input, textarea, select")) setSpace(true);
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
    // select-tool drag over the workspace starts a marquee; on a screen it
    // just clears (the screen has its own click semantics)
    if (e.currentTarget === e.target) {
      const pt = toDoc(e.clientX, e.clientY);
      drag.current = { mode: "marquee", sx: pt.x, sy: pt.y, add: e.shiftKey, base: e.shiftKey ? sel : [] };
      setMarquee({ x: pt.x, y: pt.y, w: 0, h: 0 });
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } else {
      setSel([]);
      setActiveScreen(null);
    }
  };

  const onPartDown = (e: React.PointerEvent, part: Part) => {
    if (tool === "hand" || space) return; // let pan take it
    e.stopPropagation();
    // the part's screen is the active context, so its panel is one Esc away
    if (part.screen !== null) setActiveScreen(part.screen);
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
    drag.current = { mode: "part", ids, space: { id: part.screen }, sx: e.clientX, sy: e.clientY, origins };
  };

  // marquee selection over the workspace (canvas-level parts only)
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // mirrored so pointer-up can read the final size synchronously
  const marqueeRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const setMarquee = (r: { x: number; y: number; w: number; h: number } | null) => {
    marqueeRectRef.current = r;
    setMarqueeRect(r);
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
    if (d.mode === "marquee") {
      const pt = toDoc(e.clientX, e.clientY);
      const x = Math.min(d.sx, pt.x);
      const y = Math.min(d.sy, pt.y);
      const w = Math.abs(pt.x - d.sx);
      const h = Math.abs(pt.y - d.sy);
      setMarquee({ x, y, w, h });
      const inside = doc.parts.filter((p) => p.screen === null && p.x >= x && p.y >= y && p.x + (p.w ?? partSize(p.kind, p).w) <= x + w && p.y + (p.h ?? partSize(p.kind, p).h) <= y + h).map((p) => p.id);
      setSel([...d.base, ...inside.filter((id) => !d.base.includes(id))]);
      return;
    }
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

      // live space conversion: the moment the pointer crosses a screen boundary
      // the parts tear off the screen (to world coordinates) or drop back into
      // it (clamped to local coordinates), so a drag never gets stuck inside
      const ptNow = toDoc(e.clientX, e.clientY);
      const desired = hitScreen(doc, ptNow.x, ptNow.y)?.id ?? null;
      if (desired !== d.space.id) {
        const from = doc.screens.find((s) => s.id === d.space.id);
        if (d.space.id !== null && from) {
          // screen → workspace: world coordinates; each part rebases on its
          // own committed screen (a selection can span screens via shift-click)
          mutate((doc0) => {
            const parts = doc0.parts.map((p) => {
              if (!d.ids.includes(p.id) || p.screen === null) return p;
              const own = doc0.screens.find((s) => s.id === p.screen);
              // the presented alert/sheet stays behind on its own screen
              return { ...p, screen: null, x: (own?.x ?? from.x) + p.x, y: (own?.y ?? from.y) + p.y, presents: undefined };
            });
            for (const np of parts) if (d.ids.includes(np.id)) d.origins.set(np.id, { x: np.x, y: np.y });
            return { ...doc0, parts };
          }, `drag:${d.ids[0]}`);
        } else if (d.space.id === null && hitScreen(doc, ptNow.x, ptNow.y)) {
          // workspace → screen: clamped into local coordinates
          const to = hitScreen(doc, ptNow.x, ptNow.y)!;
          mutate((doc0) => {
            const parts = doc0.parts.map((p) => {
              if (!d.ids.includes(p.id) || p.screen !== null) return p;
              const pw = p.w ?? partSize(p.kind, p).w;
              const ph = p.h ?? partSize(p.kind, p).h;
              return {
                ...p,
                screen: to.id,
                x: clamp(p.x - to.x, 0, Math.max(0, SCREEN_W - pw)),
                y: clamp(p.y - to.y, 0, Math.max(0, SCREEN_H - ph)),
                presents: undefined,
              };
            });
            for (const np of parts) if (d.ids.includes(np.id)) d.origins.set(np.id, { x: np.x, y: np.y });
            return { ...doc0, parts };
          }, `drag:${d.ids[0]}`);
        }
        d.space = { id: desired };
        d.sx = e.clientX;
        d.sy = e.clientY;
        return; // this move only re-based the drag
      }

      // base position: free with Alt, else on the 8pt grid
      const grid = e.altKey ? (v: number) => v : (v: number) => Math.round(v / 8) * 8;
      let nx = grid(o.x + dx);
      let ny = grid(o.y + dy);

      // magnetic alignment: edges/centers vs peers, margins, center, bars
      const lines: (GuideLine & { equal?: boolean })[] = [];
      if (!e.altKey) {
        const targets = snapTargetsFor({
          screen: { id: d.space.id },
          doc,
          width: (p) => p.w ?? partSize(p.kind).w,
          height: (p) => p.h ?? partSize(p.kind).h,
          exclude: d.ids,
        });
        const peers = targets.peers;
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
      // apply the magnetic correction relative to each part's gridded base,
      // so the primary part lands exactly on nx/ny and guides coincide with
      // the rendered position (grid() alone would swallow the correction)
      const corrX = nx - grid(o.x + dx);
      const corrY = ny - grid(o.y + dy);
      const free = d.space.id === null;
      if (lines.length) {
        setGuides(lines);
        setGuideScreen(free ? "__canvas" : d.space.id);
      } else if (guideScreen) {
        clearGuides();
      }
      mutate((doc0) => {
        const parts = doc0.parts.map((p) => {
          if (!d.ids.includes(p.id)) return p;
          const po = d.origins.get(p.id)!;
          const pw = p.w ?? partSize(p.kind, p).w;
          const ph = p.h ?? partSize(p.kind, p).h;
          if (p.screen === null) {
            // canvas-level: free placement, no screen bounds
            return { ...p, x: grid(po.x + dx) + corrX, y: grid(po.y + dy) + corrY };
          }
          return {
            ...p,
            x: clamp(grid(po.x + dx) + corrX, 0, Math.max(0, SCREEN_W - pw)),
            y: clamp(grid(po.y + dy) + corrY, 0, Math.max(0, SCREEN_H - ph)),
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

  const onPointerUp = (e?: React.PointerEvent) => {
    const d = drag.current;
    if (d?.mode === "marquee") {
      // a box that never grew was a plain click on empty workspace: clear
      const r = marqueeRectRef.current;
      setMarquee(null);
      if (!d.add && r && r.w < 3 && r.h < 3) {
        setSel([]);
        setActiveScreen(null);
      }
    }
    drag.current = null;
    clearGuides();
    // space conversion happened live during the move, when the pointer crossed
    // the screen boundary; releasing only ends the drag
    void e;
  };

  // palette drop
  // one placement routine shared by the HTML5 drop and the pointer fallback
  const placeKindAt = (kind: Kind, clientX: number, clientY: number) => {
    const pt = toDoc(clientX, clientY);
    const target = hitScreen(doc, pt.x, pt.y);
    if (!target) {
      // the workspace itself: a canvas-level part, world coordinates, kept out of the prompt
      const size = partSize(kind);
      const part = defaultPart(
        lang,
        null,
        kind,
        Math.round((pt.x - size.w / 2) / 8) * 8,
        Math.round((pt.y - size.h / 2) / 8) * 8,
      );
      mutate((doc0) => ({ ...doc0, parts: [...doc0.parts, part] }));
      setSel([part.id]);
      return;
    }
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

  // publish the placement routine for the palette's pointer fallback
  useEffect(() => {
    if (placeRef) placeRef.current = placeKindAt;
    return () => {
      if (placeRef) placeRef.current = null;
    };
  });

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/x-sc-kind") as Kind;
    if (!kind) return;
    placeKindAt(kind, e.clientX, e.clientY);
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
    const zoomTo = (target: number) => {
      const v = viewRef.current;
      const z = clamp(target, MIN_Z, MAX_Z);
      const cx = el.clientWidth / 2;
      const cy = el.clientHeight / 2;
      const k = z / v.z;
      setView({ z, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
    };
    (el as HTMLDivElement & { __zoom?: (dir: number) => void; __zoomTo?: (z: number) => void }).__zoom = (dir: number) => {
      const v = viewRef.current;
      if (dir === 0) {
        fit();
        return;
      }
      const step = dir > 0 ? ZOOM_STEPS.find((s) => s > v.z + 1e-3) : [...ZOOM_STEPS].reverse().find((s) => s < v.z - 1e-3);
      zoomTo(step ?? (dir > 0 ? MAX_Z : MIN_Z));
    };
    (el as HTMLDivElement & { __zoom?: (dir: number) => void; __zoomTo?: (z: number) => void }).__zoomTo = zoomTo;
  }, [fit]);

  const cursor = tool === "hand" || space ? "grab" : "default";

  return (
    <div
      ref={hostRef}
      className={`canvas-host${prefs.bg === "light" ? " prefs-light" : ""}${prefs.backdrop ? " prefs-backdrop" : ""}`}
      style={{ cursor }}
      onPointerDown={onBackgroundDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => onPointerUp()}
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
              <div className={`screen-label${isActive ? " active" : ""}`} onPointerDown={(e) => e.stopPropagation()}>
                <span
                  className="screen-name"
                  title={t("action.rename")}
                  onClick={() => {
                    setActiveScreen(screen.id);
                    setSel([]);
                  }}
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
                  <Icon name="xmark" size={14} />
                </button>
              </div>
              <div
                className={`screen-frame${isActive ? " active" : ""}`}
                style={{ width: SCREEN_W, height: SCREEN_H, background: screenBgCss(screen.bg, doc.theme.scheme === "dark") }}
                onPointerDown={(e) => onScreenDown(e, screen)}
                role="presentation"
              >
                {/* dynamic island */}
                <div className="screen-island" style={{ background: doc.theme.scheme === "dark" ? "#000" : "#000" }} />
                {/* system chrome: status bar + home indicator */}
                <ScreenChrome screen={screen} dark={doc.theme.scheme === "dark"} />
                {parts.map((p) => (
                  <div
                    key={p.id}
                    className={`part-wrap${sel.includes(p.id) ? " selected" : ""}`}
                    style={{ left: p.x, top: p.y, width: p.w ?? defaultW(p) }}
                    onPointerDown={(e) => onPartDown(e, p)}
                    tabIndex={0}
                    role="button"
                    aria-label={KIND_TEXT[lang][p.kind]}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSel(e.shiftKey ? (sel.includes(p.id) ? sel.filter((s2) => s2 !== p.id) : [...sel, p.id]) : [p.id]);
                      }
                    }}
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

        {/* canvas-level parts: on the workspace itself, kept out of the prompt */}
        {doc.parts.filter((p) => p.screen === null).map((p) => (
          <div
            key={p.id}
            className={`part-wrap canvas-part${sel.includes(p.id) ? " selected" : ""}`}
            style={{ left: p.x, top: p.y, width: p.w ?? defaultW(p) }}
            onPointerDown={(e) => onPartDown(e, p)}
            tabIndex={0}
            role="button"
            aria-label={KIND_TEXT[lang][p.kind]}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSel(e.shiftKey ? (sel.includes(p.id) ? sel.filter((s2) => s2 !== p.id) : [...sel, p.id]) : [p.id]);
              }
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (p.kind === "iconButton" || p.kind === "navBar") onOpenIcon(p.id, p.kind === "navBar" ? "icon2" : "icon");
            }}
          >
            <SwiftPart part={p} palette={pal} capsule={doc.theme.shape === "capsule"} dark={doc.theme.scheme === "dark"} lang={lang} />
          </div>
        ))}

        {/* world-level marquee rectangle while dragging a selection box */}
        {marqueeRect ? <div className="marquee" style={{ left: marqueeRect.x, top: marqueeRect.y, width: marqueeRect.w, height: marqueeRect.h }} /> : null}

        {/* world-level alignment guides for a canvas-level drag */}
        {guides.map((g, i) => (
          <div
            key={i}
            className={`align-guide${g.equal ? " equal" : ""}${guideScreen === "__canvas" ? "" : " hidden"}`}
            style={
              g.axis === "x"
                ? { left: g.at - 1, top: g.from, width: 2, height: Math.max(0, g.to - g.from) }
                : { left: g.from, top: g.at - 1, width: Math.max(0, g.to - g.from), height: 2 }
            }
          />
        ))}

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
        <button onClick={() => (hostRef.current as (HTMLDivElement & { __zoom?: (d: number) => void }) | null)?.__zoom?.(1)} title={t("zoom.in")} aria-label={t("zoom.in")}><Icon name="plus.magnifyingglass" size={15} /></button>
        <button onClick={() => (hostRef.current as (HTMLDivElement & { __zoom?: (d: number) => void }) | null)?.__zoom?.(-1)} title={t("zoom.out")} aria-label={t("zoom.out")}><Icon name="minus.magnifyingglass" size={15} /></button>
        <button onClick={() => (hostRef.current as (HTMLDivElement & { __zoom?: (d: number) => void }) | null)?.__zoom?.(0)} title={t("zoom.fit")} aria-label={t("zoom.fit")}><Icon name="arrow.up.left.and.arrow.down.right" size={15} /></button>
        <ZoomLevel z={view.z} lang={lang} onPick={(z) => (hostRef.current as (HTMLDivElement & { __zoomTo?: (z: number) => void }) | null)?.__zoomTo?.(z)} />
        <div className="canvas-prefs-anchor">
          <button
            onClick={() => setPrefsOpen((v) => !v)}
            title={t("canvas.settings")}
            aria-label={t("canvas.settings")}
            aria-expanded={prefsOpen}
          >
            <Icon name="gearshape" size={15} />
          </button>
          {prefsOpen && (
            <div className="canvas-prefs" onPointerDown={(e) => e.stopPropagation()}>
              <div className="prefs-title">{t("canvas.settings")}</div>
              <div className="prefs-row">
                <span>{t("canvas.bg")}</span>
                <div className="prefs-seg" role="group" aria-label={t("canvas.bg")}>
                  <button className={prefs.bg === "dark" ? "on" : ""} onClick={() => setPrefs({ ...prefs, bg: "dark" })}>{t("canvas.bgDark")}</button>
                  <button className={prefs.bg === "light" ? "on" : ""} onClick={() => setPrefs({ ...prefs, bg: "light" })}>{t("canvas.bgLight")}</button>
                </div>
              </div>
              <label className="prefs-row">
                <span>{t("canvas.backdrop")}</span>
                <input type="checkbox" checked={prefs.backdrop} onChange={(e) => setPrefs({ ...prefs, backdrop: e.target.checked })} />
              </label>
            </div>
          )}
        </div>
      </div>
      {doc.screens.length === 0 ? <div className="canvas-empty">{t("screen.empty")}</div> : null}
    </div>
  );
}

/* the zoom read-out doubles as a preset-level picker; when the current zoom
 * sits between levels (free wheel zoom) it shows as an extra option so the
 * select never renders empty */
function ZoomLevel({ z, lang, onPick }: { z: number; lang: Lang; onPick: (z: number) => void }) {
  const t = getT(lang);
  const pct = Math.round(z * 100);
  const onLadder = ZOOM_STEPS.some((s) => Math.round(s * 100) === pct);
  return (
    <select
      className="zoom-num"
      value={pct}
      onChange={(e) => onPick(Number(e.target.value) / 100)}
      title={t("zoom.level")}
      aria-label={t("zoom.level")}
    >
      {!onLadder && <option key={`x${pct}`} value={pct}>{pct}%</option>}
      {ZOOM_STEPS.map((step) => {
        const level = Math.round(step * 100);
        return (
          <option key={level} value={level}>
            {level}%
          </option>
        );
      })}
    </select>
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
