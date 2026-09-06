"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { initLang, type Lang } from "./i18n";
import { newDoc, type Doc } from "./tokens";

const DOC_KEY = "swiftui-canvas.doc.v1";
const LANG_KEY = "swiftui-canvas.lang";
const HISTORY_CAP = 100;

function looksLikeDoc(v: unknown): v is Doc {
  return typeof v === "object" && v !== null && "screens" in v && "parts" in v && "theme" in v;
}

function loadDoc(): Doc {
  try {
    const raw = localStorage.getItem(DOC_KEY);
    if (raw && looksLikeDoc(JSON.parse(raw))) return JSON.parse(raw);
  } catch {
    // fall through to a fresh document
  }
  return newDoc(initLang());
}

export interface Editor {
  doc: Doc;
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** apply an update; pass `key` to coalesce rapid changes of one gesture/field into one history entry */
  mutate: (fn: (doc: Doc) => Doc, key?: string) => void;
  /** snapshot the current doc into history before a multi-step gesture */
  beginBatch: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  replaceDoc: (next: Doc) => void;
  tool: "select" | "hand";
  setTool: (t: "select" | "hand") => void;
  sel: string[];
  setSel: (ids: string[]) => void;
  activeScreen: string | null;
  setActiveScreen: (id: string | null) => void;
}

export function useEditor(): Editor {
  const [lang, setLangState] = useState<Lang>("en");
  const [doc, setDoc] = useState<Doc>(() => newDoc("en"));
  const [tool, setTool] = useState<"select" | "hand">("select");
  const [sel, setSel] = useState<string[]>([]);
  const [activeScreen, setActiveScreen] = useState<string | null>(null);
  const past = useRef<Doc[]>([]);
  const future = useRef<Doc[]>([]);
  const [pastLen, setPastLen] = useState(0);
  const [futureLen, setFutureLen] = useState(0);
  const loaded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKey = useRef<{ key: string; t: number } | null>(null);

  // initial load: language preference, then a saved doc or a fresh one
  useEffect(() => {
    const stored = (localStorage.getItem(LANG_KEY) as Lang | null) ?? initLang();
    setLangState(stored);
    setDoc(loadDoc());
    loaded.current = true;
  }, []);

  // autosave (debounced)
  useEffect(() => {
    if (!loaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(DOC_KEY, JSON.stringify(doc));
      } catch {
        // storage full or blocked; the editor keeps working in memory
      }
    }, 300);
  }, [doc]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      // ignore
    }
  }, []);

  const mutate = useCallback((fn: (d: Doc) => Doc, key?: string) => {
    setDoc((d) => {
      const now = Date.now();
      const coalesce = !!key && lastKey.current?.key === key && now - lastKey.current.t < 800;
      if (!coalesce) past.current = [...past.current.slice(-HISTORY_CAP), d];
      lastKey.current = key ? { key, t: now } : null;
      future.current = [];
      return fn(d);
    });
    setPastLen(past.current.length);
    setFutureLen(0);
  }, []);

  const beginBatch = useCallback(() => {
    setDoc((d) => {
      past.current = [...past.current.slice(-HISTORY_CAP), d];
      lastKey.current = null;
      return d;
    });
    setPastLen(past.current.length);
    setFutureLen(0);
  }, []);

  const undo = useCallback(() => {
    setDoc((d) => {
      const prev = past.current.pop();
      if (!prev) return d;
      future.current = [d, ...future.current.slice(0, HISTORY_CAP)];
      lastKey.current = null;
      return prev;
    });
    setPastLen(past.current.length);
    setFutureLen(future.current.length);
  }, []);

  const redo = useCallback(() => {
    setDoc((d) => {
      const next = future.current.shift();
      if (!next) return d;
      past.current = [...past.current, d];
      lastKey.current = null;
      return next;
    });
    setPastLen(past.current.length);
    setFutureLen(future.current.length);
  }, []);

  const replaceDoc = useCallback((next: Doc) => {
    setDoc((d) => {
      past.current = [...past.current.slice(-HISTORY_CAP), d];
      return next;
    });
    future.current = [];
    setSel([]);
    setPastLen(past.current.length);
    setFutureLen(0);
  }, []);

  return {
    doc,
    lang,
    setLang,
    mutate,
    beginBatch,
    undo,
    redo,
    canUndo: pastLen > 0,
    canRedo: futureLen > 0,
    replaceDoc,
    tool,
    setTool,
    sel,
    setSel,
    activeScreen,
    setActiveScreen,
  };
}
