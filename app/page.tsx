"use client";

import React, { useEffect, useRef, useState } from "react";
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
import { mergeDoc } from "@/lib/project";
import { readShareLink } from "@/lib/share";
import { useEditor } from "@/lib/store";
import { MARGIN, SCREEN_H, CHROME_TOP, defaultPart, duplicateScreen, partSize, type Doc, type Kind, type Part } from "@/lib/tokens";
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
  const [notices, setNotices] = useState<string[]>([]);
  // internal part clipboard for ⌘C/⌘X/⌘V (the OS clipboard is not ours to write)
  const clipboard = useRef<Part[]>([]);
  // canvas placement routine, shared with the palette's touch fallback
  const placeRef = useRef<((kind: Kind, clientX: number, clientY: number) => void) | null>(null);
  const [shareCandidate, setShareCandidate] = useState<Doc | null>(null);

  // open a shared link once on load, then clean the address bar; ask before
  // clobbering a local draft, offer to keep both instead
  useEffect(() => {
    const stored = localStorage.getItem("swiftui-canvas.doc.v1");
    const warnings = editor.takeLoadWarnings();
    if (warnings.length) setNotices(warnings);
    readShareLink().then((shared) => {
      if (!shared) return;
      history.replaceState(null, "", location.pathname + location.search);
      if (stored) setShareCandidate(shared);
      else replaceDoc(shared);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openShared = (mode: "replace" | "copy") => {
    const shared = shareCandidate;
    setShareCandidate(null);
    if (!shared) return;
    if (mode === "replace") {
      replaceDoc(shared);
    } else {
      const yOffset = Math.max(0, ...doc.screens.map((s) => s.y)) + SCREEN_H + 120;
      const shifted: Doc = { ...shared, screens: shared.screens.map((s) => ({ ...s, y: s.y + yOffset })) };
      mutate((d) => mergeDoc(shifted, d));
      setActiveScreen(shared.screens[0]?.id ?? null);
    }
  };

  const addPart = (kind: Kind) => {
    const screenId = activeScreen ?? doc.screens[0]?.id;
    if (!screenId) return;
    const screen = doc.screens.find((s) => s.id === screenId);
    const existing = doc.parts.filter((p) => p.screen === screenId);
    const chromeTop = screen?.chrome ? CHROME_TOP : 0;
    const hasBar = existing.some((p) => p.kind === "navBar");
    // place below the last part's bottom (bars own the top), so a click-to-add
    // never stacks onto an earlier part
    const bottom = existing.reduce((m, p) => Math.max(m, p.y + (p.h ?? partSize(p.kind, p).h)), hasBar ? chromeTop + 96 : chromeTop);
    const y = Math.min(bottom + 8, SCREEN_H - 140);
    mutate((d: Doc) => ({ ...d, parts: [...d.parts, defaultPart(d.lang, screenId, kind, MARGIN, y)] }));
  };

  const addScreen = () => {
    mutate((d) => addScreenAt(d, lang));
  };

  const dupeScreen = (screenId: string) => {
    mutate((d) => duplicateScreen(d, screenId));
  };

  const moveScreen = (screenId: string, dir: -1 | 1) => {
    mutate((d) => {
      const i = d.screens.findIndex((s) => s.id === screenId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.screens.length) return d;
      const screens = [...d.screens];
      [screens[i], screens[j]] = [screens[j], screens[i]];
      return { ...d, screens };
    }, `smove:${screenId}`);
  };

  const tidy = () => {
    mutate((d) => {
      const targets = activeScreen ? [activeScreen] : d.screens.map((s) => s.id);
      const byScreen = new Map(targets.map((id) => [id, tidyScreen(d, id)]));
      if (![...byScreen.values()].some(Boolean)) return d;
      return { ...d, parts: d.parts.map((p) => (p.screen ? (byScreen.get(p.screen)?.find((np) => np.id === p.id) ?? p) : p)) };
    });
  };

  // keep <html lang> in step with the interface language
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

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
      if (mod && e.key.toLowerCase() === "c") {
        // clipboard lives in a ref (a ref, not state, so rapid copy/paste works)
        const parts = doc.parts.filter((p) => sel.includes(p.id));
        if (parts.length) clipboard.current = parts;
        return;
      }
      if (mod && e.key.toLowerCase() === "x") {
        const parts = doc.parts.filter((p) => sel.includes(p.id));
        if (parts.length) {
          clipboard.current = parts;
          mutate((d) => ({ ...d, parts: d.parts.filter((p) => !sel.includes(p.id)) }));
          setSel([]);
        }
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        const copied = clipboard.current;
        if (!copied.length) return;
        e.preventDefault();
        // paste beside the copies, onto the active screen when pasting there
        const active = activeScreen ?? copied[0].screen;
        mutate((d) => {
          const pasted = copied.map((p) => ({
            ...p,
            id: `${p.id}p${Math.random().toString(36).slice(2, 6)}`,
            screen: active !== null && p.screen !== null ? active : p.screen,
            options: p.options?.map((o) => ({ ...o })),
          }));
          return { ...d, parts: [...d.parts, ...pasted] };
        });
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSel(doc.parts.filter((p) => (activeScreen ? p.screen === activeScreen : p.screen === null)).map((p) => p.id));
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
          // the preview owns Escape while open: it pops one screen at a time
          if (!showPreview) {
            setShowPrompt(false);
            setShowTheme(false);
            setIconTarget(null);
            setSel([]);
          }
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
        onLoaded={(warnings) => setNotices(warnings)}
      />
      {notices.length > 0 && (
        <div className="notices" role="status">
          <span>{notices.join(" · ")}</span>
          <button onClick={() => setNotices([])} aria-label={t("action.close")}>✕</button>
        </div>
      )}
      {shareCandidate && (
        <div className="overlay" onPointerDown={(e) => e.target === e.currentTarget && setShareCandidate(null)}>
          <div className="modal">
            <div className="modal-head"><strong>{t("share.openTitle")}</strong></div>
            <p className="modal-p">{t("share.openBody")}</p>
            <div className="row-btns">
              <button className="mini" onClick={() => openShared("copy")}>{t("share.openCopy")}</button>
              <button className="mini" onClick={() => openShared("replace")}>{t("share.openReplace")}</button>
              <button className="mini danger" onClick={() => setShareCandidate(null)}>{t("action.cancel")}</button>
            </div>
          </div>
        </div>
      )}
      <div className="main">
        <aside className="left">
          <div className="panel-title">{t("panel.parts")}</div>
          <PartsPalette editor={editor} onAdd={addPart} placeRef={placeRef} />
          <div className="screens-strip">
            <div className="panel-title">{t("canvas.screenLabel")}</div>
            {doc.screens.map((s, i) => (
              <span key={s.id} className="screen-chip-wrap">
                <button className={`screen-chip${activeScreen === s.id ? " on" : ""}`} onClick={() => setActiveScreen(s.id)} title={t("field.screen")}>
                  {s.name}
                </button>
                <span className="chip-tools">
                  <button onClick={() => moveScreen(s.id, -1)} disabled={i === 0} aria-label={t("action.moveUp")}>↑</button>
                  <button onClick={() => moveScreen(s.id, 1)} disabled={i === doc.screens.length - 1} aria-label={t("action.moveDown")}>↓</button>
                  <button onClick={() => dupeScreen(s.id)} aria-label={t("action.duplicateScreen")}><Icon name="plus.rectangle.on.rectangle" size={12} /></button>
                </span>
              </span>
            ))}
            <button className="screen-chip add" onClick={addScreen} aria-label={t("action.addScreen")}><Icon name="plus" size={14} /></button>
          </div>
        </aside>
        <Canvas editor={editor} onOpenIcon={(partId, field) => setIconTarget({ partId, field })} placeRef={placeRef} />
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
