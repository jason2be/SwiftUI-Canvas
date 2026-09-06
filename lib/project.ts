import { KIND_ORDER, type Doc } from "./tokens";

/* A project file is the Doc as JSON, nothing more. Reading one back only
 * checks the shape the editor relies on. */

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const KINDS = new Set<string>(KIND_ORDER);

const validOption = (o: unknown) =>
  isRecord(o) && typeof o.label === "string" && (o.icon === undefined || typeof o.icon === "string" || o.icon === null);

const validPart = (p: unknown) =>
  isRecord(p) &&
  typeof p.id === "string" &&
  typeof p.screen === "string" &&
  typeof p.kind === "string" &&
  KINDS.has(p.kind) &&
  typeof p.label === "string" &&
  Number.isFinite(p.x) &&
  Number.isFinite(p.y) &&
  typeof p.variant === "string" &&
  (p.options === undefined || (Array.isArray(p.options) && p.options.every(validOption)));

const validScreen = (s: unknown) =>
  isRecord(s) &&
  typeof s.id === "string" &&
  typeof s.name === "string" &&
  Number.isFinite(s.x) &&
  Number.isFinite(s.y);

const validTheme = (t: unknown) =>
  isRecord(t) && typeof t.accent === "string" && (t.scheme === "light" || t.scheme === "dark") && typeof t.shape === "string" && typeof t.font === "string";

export const isProject = (v: unknown): v is Doc =>
  isRecord(v) &&
  typeof v.title === "string" &&
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
