"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { getT } from "@/lib/i18n";
import { paletteOf } from "@/lib/theme";
import { BACK_TARGET, partsOf, screenById, type Part, type Transition } from "@/lib/tokens";
import SwiftPart from "./SwiftPart";
import type { Editor } from "@/lib/store";

/* Tap-through preview: a phone viewport; tappable parts navigate with the
 * chosen transition. The moving screen is a keyed layer with a CSS keyframe
 * animation (which plays on mount); the screen underneath stays visible, so
 * push/sheet/cover/zoom read as real transitions in both directions. */

interface Props {
  editor: Editor;
  startScreen: string | null;
  onExit: () => void;
}

interface Anim {
  /** the screen rendered in the moving layer */
  screen: string;
  kind: Transition;
  dir: 1 | -1; // 1 = forward, -1 = back
  n: number; // remount key so the keyframe restarts every time
}

const ANIM_MS = 380;

export default function Preview({ editor, startScreen, onExit }: Props) {
  const { doc, lang } = editor;
  const t = getT(lang);
  const pal = paletteOf(doc.theme);
  const [stack, setStack] = useState<string[]>([startScreen ?? doc.screens[0]?.id ?? ""]);
  const [anim, setAnim] = useState<Anim | null>(null);
  const animN = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = anim !== null;

  // fit the phone to the window, and keep fitting on resize
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () =>
      setScale(Math.min((window.innerHeight - 96) / 852, (Math.min(window.innerWidth, 520) - 32) / 393, 1));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const navigate = useCallback(
    (target: string, kind: Transition, back = false) => {
      if (busy) return; // one transition at a time
      if (kind === "none") {
        setStack((st) => (back ? (st.length > 1 ? st.slice(0, -1) : st) : [...st, target]));
        return;
      }
      animN.current += 1;
      setAnim({ screen: back ? "" : target, kind, dir: back ? -1 : 1, n: animN.current });
      timer.current = setTimeout(() => {
        setStack((st) =>
          back
            ? st.length > 1
              ? st.slice(0, -1)
              : st
            : st.includes(target)
              ? [...st.slice(0, st.indexOf(target) + 1)]
              : [...st, target]
        );
        setAnim(null);
      }, ANIM_MS);
    },
    [busy]
  );

  const pop = useCallback(() => {
    if (busy) return;
    setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
  }, [busy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || busy) return;
      if (stack.length > 1) pop();
      else onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stack, busy, pop, onExit]);

  const top = stack[stack.length - 1];
  const screen = screenById(doc, top);
  if (!screen) return null;

  const tapOf = (p: Part) => {
    const link = p.link;
    if (!link?.target) return undefined;
    return () => {
      if (link.target === BACK_TARGET) {
        if (stack.length > 1) navigate("", link.transition, true);
      } else {
        navigate(link.target, link.transition);
      }
    };
  };

  /* tab items navigate through options[].target; an invisible hit zone is
   * laid over each item because the tabs render inside SwiftPart */
  const tabTapsOf = (p: Part) => {
    if (p.kind !== "tabBar") return null;
    const opts = p.options ?? [];
    const w = (p.w ?? 393) / Math.max(1, opts.length);
    const h = p.h ?? 83;
    return opts.map((o, i) => {
      if (!o.target) return null;
      const go = () => {
        if (o.target === BACK_TARGET) {
          if (stack.length > 1) navigate("", "none", true);
        } else {
          navigate(o.target!, "none");
        }
      };
      return (
        <button
          key={i}
          aria-label={o.label}
          className="preview-tabzone"
          style={{ left: p.x + i * w, top: p.y, width: w, height: h }}
          onClick={go}
        />
      );
    });
  };

  // which screen sits underneath during a transition
  const underId = anim ? (anim.dir > 0 ? top : stack[stack.length - 2] ?? top) : top;
  const under = screenById(doc, underId) ?? screen;
  // the moving layer: forward shows the target, back shows the outgoing screen
  const moverId = anim ? (anim.dir > 0 ? anim.screen : top) : null;
  const mover = moverId ? screenById(doc, moverId) : null;

  const moverClass = anim
    ? anim.dir > 0
      ? `pv-in-${anim.kind}`
      : `pv-out-${anim.kind}`
    : "";

  return (
    <div className="preview-overlay" role="dialog" aria-label={t("action.preview")}>
      <div className="preview-stage">
        <div
          className="preview-phone"
          style={{
            width: 393,
            height: 852,
            transform: `scale(${scale})`,
            background: doc.theme.scheme === "dark" ? "#000" : "#F2F2F7",
          }}
        >
          {/* the screen underneath the transition */}
          <div className="preview-screen">
            <div className="screen-island" />
            {partsOf(doc, under.id).map((p) => {
              const interactive = !anim && under.id === top;
              const tap = interactive ? tapOf(p) : undefined;
              const tabZones = interactive ? tabTapsOf(p) : null;
              return (
                <React.Fragment key={p.id}>
                  <div
                    className={`part-wrap preview-part${tap ? " tappable" : ""}`}
                    style={{ left: p.x, top: p.y, width: p.w ?? 160 }}
                    onClick={tap}
                    role={tap ? "button" : undefined}
                  >
                    <SwiftPart part={p} palette={pal} capsule={doc.theme.shape === "capsule"} dark={doc.theme.scheme === "dark"} lang={lang} />
                  </div>
                  {tabZones}
                </React.Fragment>
              );
            })}
            {!anim && stack.length > 1 ? (
              <button className="preview-back" onClick={pop}>{t("preview.back")}</button>
            ) : null}
          </div>

          {/* the moving screen during a transition */}
          {anim && mover ? (
            <div key={anim.n} className={`preview-screen ${moverClass}`}>
              <div className="screen-island" />
              {partsOf(doc, mover.id).map((p) => (
                <div key={p.id} className="part-wrap preview-part" style={{ left: p.x, top: p.y, width: p.w ?? 160 }}>
                  <SwiftPart part={p} palette={pal} capsule={doc.theme.shape === "capsule"} dark={doc.theme.scheme === "dark"} lang={lang} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="preview-foot">
        <span className="hint">{stack.length > 1 ? "" : t("preview.exit")}</span>
        <button className="mini" onClick={onExit}>{t("preview.exit")}</button>
      </div>
    </div>
  );
}
