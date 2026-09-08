/* Canvas appearance preferences — view-level settings, not document data.
 * They live in localStorage so they survive reloads but never enter the
 * shared document or the prompt. */

export interface CanvasPrefs {
  /** canvas surface behind the screens */
  bg: "dark" | "light";
  /** draw a light chip behind workspace parts so transparent, dark-text
   *  parts stay readable on the dark canvas */
  backdrop: boolean;
}

export const DEFAULT_PREFS: CanvasPrefs = { bg: "dark", backdrop: false };

const KEY = "swiftui-canvas.canvas.v1";

/** repairs unknown values to defaults; the repaired object is persisted
 *  again by the save effect (self-heal), keeping store and state in step */
export function normalizeCanvasPrefs(value: unknown): CanvasPrefs {
  if (!value || typeof value !== "object") return { ...DEFAULT_PREFS };
  const v = value as Record<string, unknown>;
  return {
    bg: v.bg === "light" ? "light" : "dark",
    backdrop: v.backdrop === true,
  };
}

export function loadCanvasPrefs(store?: Pick<Storage, "getItem"> | null): CanvasPrefs {
  const s = store ?? (typeof localStorage === "undefined" ? null : localStorage);
  if (!s) return { ...DEFAULT_PREFS };
  try {
    const raw = s.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return normalizeCanvasPrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveCanvasPrefs(prefs: CanvasPrefs, store?: Pick<Storage, "setItem"> | null): void {
  const s = store ?? (typeof localStorage === "undefined" ? null : localStorage);
  if (!s) return;
  try {
    s.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // quota/private mode: preferences are best-effort
  }
}
