"use client";

import React, { useEffect, useRef, useState } from "react";
import { getT } from "@/lib/i18n";
import { paletteOf } from "@/lib/theme";
import { BACK_TARGET, partsOf, screenById, type Part, type Transition } from "@/lib/tokens";
import SwiftPart from "./SwiftPart";
import type { Editor } from "@/lib/store";

/* Tap-through preview: full-viewport phone screen; tappable parts navigate
 * with the chosen transition; back plays in reverse. */

interface Props {
  editor: Editor;
  startScreen: string | null;
  onExit: () => void;
}

type Show = { screen: string; anim: "push" | "zoom" | "sheet" | "cover" | "none"; dir: 1 | -1 } | null;

export default function Preview({ editor, startScreen, onExit }: Props) {
  const { doc, lang } = editor;
  const t = getT(lang);
  const pal = paletteOf(doc.theme);
  const [stack, setStack] = useState<string[]>([startScreen ?? doc.screens[0]?.id ?? ""]);
  const [show, setShow] = useState<Show>(null);
  const top = stack[stack.length - 1];
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (stack.length > 1) pop();
        else onExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stack]);

  const scale = Math.min(
    (window.innerHeight - 96) / 852,
    (Math.min(window.innerWidth, 520) - 32) / 393,
    1
  );

  const navigate = (target: string, anim: Transition, back = false) => {
    if (timer.current) clearTimeout(timer.current);
    if (anim === "none") {
      setStack((st) => (back ? st.slice(0, -1) : [...st, target]));
      return;
    }
    setShow({ screen: back ? "" : target, anim, dir: back ? -1 : 1 });
    timer.current = setTimeout(() => {
      setStack((st) => (back ? st.slice(0, -1) : st.includes(target) ? [...st.slice(0, st.indexOf(target) + 1)] : [...st, target]));
      setShow(null);
    }, 420);
  };

  const pop = () => {
    setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
  };

  const screen = screenById(doc, top);
  if (!screen) return null;
  const parts = partsOf(doc, screen.id);

  const tapOf = (p: Part) => {
    if (!p.link || !p.link.target) return undefined;
    return () => {
      if (p.link!.target === BACK_TARGET) {
        if (stack.length > 1) navigate("", p.link!.transition === "none" ? "none" : p.link!.transition, true);
      } else {
        navigate(p.link!.target, p.link!.transition);
      }
    };
  };

  const overlayAnim: React.CSSProperties =
    show?.anim === "push"
      ? { transform: `translateX(${show.dir * 100}%)`, transition: "transform 0.4s cubic-bezier(0.32,0.72,0,1)" }
      : show?.anim === "zoom"
        ? { transform: `scale(${show.dir * 0.4 + (show.dir > 0 ? 0.6 : 1)})`, opacity: show.dir > 0 ? 0 : 1, transition: "all 0.4s cubic-bezier(0.32,0.72,0,1)" }
        : show?.anim === "sheet"
          ? { transform: `translateY(${show.dir * 100}%)`, transition: "transform 0.4s cubic-bezier(0.32,0.72,0,1)" }
          : show?.anim === "cover"
            ? { transform: `translateY(${show.dir * 100}%)`, transition: "transform 0.4s ease-out" }
            : {};

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
          {/* the screen under the transition overlay */}
          <div className="preview-screen" style={{ opacity: show && show.anim !== "none" ? 0.0 : 1 }}>
            <div className="screen-island" />
            {parts.map((p) => {
              const tap = tapOf(p);
              return (
                <div
                  key={p.id}
                  className={`part-wrap preview-part${tap ? " tappable" : ""}`}
                  style={{ left: p.x, top: p.y, width: p.w ?? 160 }}
                  onClick={tap}
                  role={tap ? "button" : undefined}
                >
                  <SwiftPart part={p} palette={pal} capsule={doc.theme.shape === "capsule"} dark={doc.theme.scheme === "dark"} />
                </div>
              );
            })}
            {stack.length > 1 ? (
              <button className="preview-back" onClick={pop}>{t("preview.back")}</button>
            ) : null}
          </div>

          {/* the incoming/outgoing screen during a transition */}
          {show ? (
            <div className="preview-screen overlay-anim" style={overlayAnim}>
              <div className="screen-island" />
              {(() => {
                const s = show.dir > 0 ? screenById(doc, show.screen) : screen;
                if (!s) return null;
                const ops = partsOf(doc, s.id);
                const backAnim = show.dir < 0;
                return ops.map((p) => (
                  <div
                    key={p.id}
                    className={`part-wrap preview-part${p.link ? " tappable" : ""}`}
                    style={{
                      left: p.x,
                      top: p.y,
                      width: p.w ?? 160,
                      transform: backAnim ? `translateX(${(1 - 0) * 0}px)` : undefined,
                    }}
                    onClick={p.link?.target && p.link.target !== BACK_TARGET ? () => navigate(p.link!.target, p.link!.transition) : undefined}
                  >
                    <SwiftPart part={p} palette={pal} capsule={doc.theme.shape === "capsule"} dark={doc.theme.scheme === "dark"} />
                  </div>
                ));
              })()}
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
