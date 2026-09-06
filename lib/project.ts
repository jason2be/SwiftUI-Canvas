import { KIND_ORDER, KIND_VARIANTS, SCREEN_BGS, TRANSITIONS, type Doc } from "./tokens";

/* A project file is the Doc as JSON, nothing more. Reading one back only
 * checks the shape the editor relies on — strictly enough that a malformed
 * file or share link cannot crash the editor when it renders. */

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const KINDS = new Set<string>(KIND_ORDER);

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const isVariantFor = (kind: string, variant: unknown): boolean =>
  variant === undefined || // the renderer/prompt fall back to the kind's first variant
  (typeof variant === "string" && (KIND_VARIANTS[kind as keyof typeof KIND_VARIANTS] ?? []).some((k) => k === variant));

const isTransition = (t: unknown): boolean => typeof t === "string" && (TRANSITIONS as string[]).includes(t);

const validOption = (o: unknown): boolean =>
  isRecord(o) &&
  typeof o.label === "string" &&
  (o.icon === undefined || typeof o.icon === "string" || o.icon === null) &&
  (o.target === undefined || o.target === null || typeof o.target === "string");

const validLink = (l: unknown): boolean =>
  isRecord(l) && typeof l.target === "string" && isTransition(l.transition);

const validPart = (p: unknown): boolean =>
  isRecord(p) &&
  typeof p.id === "string" &&
  (p.screen === null || typeof p.screen === "string") &&
  typeof p.kind === "string" &&
  KINDS.has(p.kind) &&
  (p.label === undefined || typeof p.label === "string") &&
  finite(p.x) &&
  finite(p.y) &&
  isVariantFor(p.kind, p.variant) &&
  (p.options === undefined || (Array.isArray(p.options) && p.options.every(validOption))) &&
  (p.icon === undefined || p.icon === null || typeof p.icon === "string") &&
  (p.icon2 === undefined || p.icon2 === null || typeof p.icon2 === "string") &&
  (p.supporting === undefined || typeof p.supporting === "string") &&
  (p.note === undefined || typeof p.note === "string") &&
  (p.checked === undefined || typeof p.checked === "boolean") &&
  (p.selected === undefined || finite(p.selected)) &&
  (p.value === undefined || finite(p.value)) &&
  (p.w === undefined || (finite(p.w) && p.w > 0)) &&
  (p.h === undefined || (finite(p.h) && p.h > 0)) &&
  (p.link === undefined || p.link === null || validLink(p.link));

const validScreen = (s: unknown): boolean =>
  isRecord(s) &&
  typeof s.id === "string" &&
  typeof s.name === "string" &&
  finite(s.x) &&
  finite(s.y) &&
  (s.note === undefined || typeof s.note === "string") &&
  (s.bg === undefined || (typeof s.bg === "string" && (SCREEN_BGS.includes(s.bg as never) || /^#[0-9a-fA-F]{3,8}$/.test(s.bg))));

const validTheme = (t: unknown): boolean =>
  isRecord(t) &&
  typeof t.accent === "string" &&
  (t.scheme === "light" || t.scheme === "dark") &&
  (t.shape === "default" || t.shape === "capsule") &&
  (t.font === "system" || t.font === "rounded" || t.font === "serif" || t.font === "monospaced");

export const isProject = (v: unknown): v is Doc =>
  isRecord(v) &&
  typeof v.title === "string" &&
  (v.lang === undefined || v.lang === "en" || v.lang === "zh") &&
  validTheme(v.theme) &&
  Array.isArray(v.screens) &&
  v.screens.every(validScreen) &&
  Array.isArray(v.parts) &&
  v.parts.every(validPart);

export const projectFileName = (doc: Doc) => {
  const name = doc.title.trim().replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
  return name ? `swiftui-canvas ${name}.json` : "swiftui-canvas.json";
};

export function saveProject(doc: Doc) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = projectFileName(doc);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function readProject(file: File): Promise<Doc | null> {
  try {
    const next: unknown = JSON.parse(await file.text());
    return isProject(next) ? next : null;
  } catch {
    return null;
  }
}
