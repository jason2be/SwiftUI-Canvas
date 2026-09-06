"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HISTORY_CAP, pushEntry, stepRedo, stepUndo } from "./history";
import { initLang, type Lang } from "./i18n";
import { isProject, validateDoc } from "./project";
import { newDoc, type Doc } from "./tokens";

const DOC_KEY = "swiftui-canvas.doc.v1";
const LANG_KEY = "swiftui-canvas.lang";

export interface LoadResult {
  doc: Doc;
  /** what the tolerant loader repaired or dropped, for the user to see */
  warnings: string[];
}

function loadDoc(): LoadResult {
  try {
    const raw = localStorage.getItem(DOC_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      // the same validation a file or share link goes through
      if (isProject(parsed)) return { doc: parsed, warnings: [] };
      const v = validateDoc(parsed, "Saved design");
      if (v.doc) return { doc: v.doc, warnings: v.warnings };
    }
  } catch {
    // fall through to a fresh document
  }
  return { doc: newDoc(initLang()), warnings: [] };
}

export interface Editor {
  doc: Doc;
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** apply an update; pass `key` to coalesce rapid changes of one gesture/field into one history entry */
  mutate: (fn: (doc: Doc) => Doc, key?: string) => void;
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
  /** warnings from the last tolerant load; read once on mount */
  takeLoadWarnings: () => string[];
}

export function useEditor(): Editor {
  const [lang, setLangState] = useState<Lang>("en");
  const [doc, setDoc] = useState<Doc>(() => newDoc("en"));
  const [tool, setTool] = useState<"select" | "hand">("select");
  const [sel, setSel] = useState<string[]>([]);
  const [activeScreen, setActiveScreen] = useState<string | null>(null);
  // the authoritative doc; a ref so rapid successive calls (drag moves,
  // keystrokes) always read the latest state, never a stale closure
  const docRef = useRef<Doc>(doc);
  const past = useRef<Doc[]>([]);
  const future = useRef<Doc[]>([]);
  const [pastLen, setPastLen] = useState(0);
  const [futureLen, setFutureLen] = useState(0);
  const lastKey = useRef<{ key: string; t: number } | null>(null);
  const loaded = useRef(false);
  const loadWarnings = useRef<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // initial load: language preference, then a validated saved doc or a fresh one
  useEffect(() => {
    const stored = (localStorage.getItem(LANG_KEY) as Lang | null) ?? initLang();
    setLangState(stored);
    const { doc: loadedDoc, warnings } = loadDoc();
    docRef.current = loadedDoc;
    setDoc(loadedDoc);
    if (warnings.length) loadWarnings.current = warnings;
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

  const commit = useCallback((next: Doc) => {
    docRef.current = next;
    setDoc(next);
  }, []);

  const mutate = useCallback(
    (fn: (d: Doc) => Doc, key?: string) => {
      const cur = docRef.current;
      const now = Date.now();
      const coalesce = !!key && lastKey.current?.key === key && now - lastKey.current.t < 800;
      if (!coalesce) {
        past.current = pushEntry(past.current, cur);
        setPastLen(past.current.length);
      }
      future.current = [];
      setFutureLen(0);
      lastKey.current = key ? { key, t: now } : null;
      commit(fn(cur));
    },
    [commit]
  );

  const undo = useCallback(() => {
    const step = stepUndo({ past: past.current, future: future.current }, docRef.current);
    if (!step) return;
    past.current = step.book.past;
    future.current = step.book.future;
    lastKey.current = null;
    setPastLen(past.current.length);
    setFutureLen(future.current.length);
    commit(step.doc);
  }, [commit]);

  const redo = useCallback(() => {
    const step = stepRedo({ past: past.current, future: future.current }, docRef.current);
    if (!step) return;
    past.current = step.book.past;
    future.current = step.book.future;
    lastKey.current = null;
    setPastLen(past.current.length);
    setFutureLen(future.current.length);
    commit(step.doc);
  }, [commit]);

  const replaceDoc = useCallback(
    (next: Doc) => {
      past.current = pushEntry(past.current, docRef.current);
      future.current = [];
      lastKey.current = null;
      setSel([]);
      setPastLen(past.current.length);
      setFutureLen(0);
      commit(next);
    },
    [commit]
  );

  return {
    doc,
    lang,
    setLang,
    mutate,
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
    /** warnings from the last tolerant load; read once on mount */
    takeLoadWarnings: () => {
      const w = loadWarnings.current;
      loadWarnings.current = [];
      return w;
    },
  };
}

export { HISTORY_CAP };
