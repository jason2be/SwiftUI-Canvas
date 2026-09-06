"use client";

import React, { useEffect, useState } from "react";
import Canvas, { addScreenAt } from "@/components/Canvas";
import ErrorBoundary from "@/components/ErrorBoundary";
import IconPicker from "@/components/IconPicker";
import Icon from "@/components/Icon";
import Inspector, { type IconField } from "@/components/Inspector";
import PartsPalette from "@/components/PartsPalette";
import Preview from "@/components/Preview";
import PromptPanel from "@/components/PromptPanel";
import ThemePanel from "@/components/ThemePanel";
import Toolbar from "@/components/Toolbar";
import { getT } from "@/lib/i18n";
import { readShareLink } from "@/lib/share";
import { useEditor } from "@/lib/store";
import { MARGIN, defaultPart, type Doc, type Kind } from "@/lib/tokens";
import { tidyScreen } from "@/lib/tidy";

/* The editor page: toolbar, palette, canvas, inspector, modals, shortcuts. */

export default function Page() {
  const editor = useEditor();
  const { doc, lang, mutate, activeScreen, setActiveScreen, sel, setSel, replaceDoc } = editor;
  const t = getT(lang);

  const [showPreview, setShowPreview] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [iconTarget, setIconTarget] = useState<{ partId: string; field: IconField } | null>(null);

  // open a shared link once on load, then clean the address bar
  useEffect(() => {
    readShareLink().then((shared) => {
      if (shared) {
        replaceDoc(shared);
        history.replaceState(null, "", location.pathname + location.search);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addPart = (kind: Kind) => {
    const screenId = activeScreen ?? doc.screens[0]?.id;
    if (!screenId) return;
    const count = doc.parts.filter((p) => p.screen === screenId).length;
    const y = Math.min(140 + (count % 8) * 70, 640);
    mutate((d: Doc) => ({ ...d, parts: [...d.parts, defaultPart(d.lang, screenId, kind, MARGIN, y)] }));
  };

  const addScreen = () => {
    mutate((d) => addScreenAt(d, lang));
  };

  const tidy = () => {
    mutate((d) => {
      const targets = activeScreen ? [activeScreen] : d.screens.map((s) => s.id);
      const byScreen = new Map(targets.map((id) => [id, tidyScreen(d, id)]));
      if (![...byScreen.values()].some(Boolean)) return d;
      return { ...d, parts: d.parts.map((p) => (p.screen ? (byScreen.get(p.screen)?.find((np) => np.id === p.id) ?? p) : p)) };
    });
  };

  // global shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el?.matches?.("input, textarea, select, [contenteditable]")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const parts = doc.parts.filter((p) => sel.includes(p.id));
        if (parts.length) {
          mutate((d) => ({
            ...d,
            parts: [...d.parts, ...parts.map((p) => ({ ...p, ...{ id: `${p.id}c${Math.random().toString(36).slice(2, 6)}`, x: p.x + 16, y: p.y + 16, options: p.options?.map((o) => ({ ...o })) } }))],
          }));
        }
        return;
      }
      switch (e.key) {
        case "v":
        case "V":
          editor.setTool("select");
          break;
        case "h":
        case "H":
          editor.setTool("hand");
          break;
        case "p":
        case "P":
          setShowPreview((v) => !v);
          break;
        case "0": {
          // fit the canvas view to its content
          (document.querySelector(".canvas-host") as (HTMLDivElement & { __zoom?: (d: number) => void }) | null)?.__zoom?.(0);
          break;
        }
        case "Escape":
          setShowPreview(false);
          setShowPrompt(false);
          setShowTheme(false);
          setIconTarget(null);
          setSel([]);
          break;
        case "Delete":
        case "Backspace":
          if (sel.length) {
            mutate((d) => ({ ...d, parts: d.parts.filter((p) => !sel.includes(p.id)) }));
            setSel([]);
          }
          break;
        case "ArrowLeft":
        case "ArrowRight":
        case "ArrowUp":
        case "ArrowDown": {
          if (!sel.length) return;
          e.preventDefault();
          const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
          const dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
          const step = e.shiftKey ? 10 : 1;
          mutate((d) => ({
            ...d,
            parts: d.parts.map((p) => (sel.includes(p.id) ? { ...p, x: p.x + dx * step, y: p.y + dy * step } : p)),
          }), `nudge:${sel.join(",")}`);
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, sel, editor, mutate, setSel]);

  const pickIcon = (name: string | null) => {
    if (!iconTarget) return;
    const { partId, field } = iconTarget;
    mutate((d) => ({
      ...d,
      parts: d.parts.map((p) => {
        if (p.id !== partId) return p;
        if (field === "icon") return { ...p, icon: name };
        if (field === "icon2") return { ...p, icon2: name };
        const idx = Number(field.slice(4));
        return { ...p, options: (p.options ?? []).map((o, i) => (i === idx ? { ...o, icon: name } : o)) };
      }),
    }));
    setIconTarget(null);
  };

  const iconInitial = iconTarget
    ? (() => {
        const p = doc.parts.find((x) => x.id === iconTarget.partId);
        if (!p) return null;
        if (iconTarget.field === "icon") return p.icon;
        if (iconTarget.field === "icon2") return p.icon2;
        return p.options?.[Number(iconTarget.field.slice(4))]?.icon;
      })()
    : null;

  return (
    <ErrorBoundary>
    <div className="app">
      <Toolbar
        editor={editor}
        onAddScreen={addScreen}
        onTidy={tidy}
        onPreview={() => setShowPreview(true)}
        onPrompt={() => setShowPrompt(true)}
        onTheme={() => setShowTheme((v) => !v)}
      />
      <div className="main">
        <aside className="left">
          <div className="panel-title">{t("panel.parts")}</div>
          <PartsPalette editor={editor} onAdd={addPart} />
          <div className="screens-strip">
            <div className="panel-title">{t("canvas.screenLabel")}</div>
            {doc.screens.map((s) => (
              <button key={s.id} className={`screen-chip${activeScreen === s.id ? " on" : ""}`} onClick={() => setActiveScreen(s.id)}>
                {s.name}
              </button>
            ))}
            <button className="screen-chip add" onClick={addScreen} aria-label={t("action.addScreen")}><Icon name="plus" size={14} /></button>
          </div>
        </aside>
        <Canvas editor={editor} onOpenIcon={(partId, field) => setIconTarget({ partId, field })} />
        <Inspector editor={editor} onOpenIcon={(partId, field) => setIconTarget({ partId, field })} />
      </div>

      {showTheme ? (
        <div className="overlay overlay-top" onPointerDown={(e) => e.target === e.currentTarget && setShowTheme(false)}>
          <ThemePanel editor={editor} onClose={() => setShowTheme(false)} />
        </div>
      ) : null}
      {showPrompt ? <PromptPanel editor={editor} onClose={() => setShowPrompt(false)} /> : null}
      {showPreview ? <Preview editor={editor} startScreen={activeScreen} onExit={() => setShowPreview(false)} /> : null}
      {iconTarget ? <IconPicker initial={iconInitial} onPick={pickIcon} onClose={() => setIconTarget(null)} lang={lang} /> : null}
    </div>
    </ErrorBoundary>
  );
}
