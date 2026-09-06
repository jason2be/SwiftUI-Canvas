import { BACK_TARGET, KIND_ORDER, KIND_VARIANTS, SCREEN_BGS, TRANSITIONS, newId, type Doc } from "./tokens";

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
  (p.presents === undefined || typeof p.presents === "string") &&
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
  (s.chrome === undefined || typeof s.chrome === "boolean") &&
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

/* ---------- tolerant ingress ---------- */

/* What the share-link/file path uses: accept an author's or agent's document
 * even when parts of it are wrong, dropping or repairing the broken bits and
 * reporting what happened, so one typo never discards a whole design. */

export interface Validated {
  doc: Doc | null;
  errors: string[];
  warnings: string[];
}

/** screen ids the doc actually contains, for dangling-reference checks */
const screenIds = (screens: { id: string }[]): Set<string> => new Set(screens.map((s) => s.id));

export function validateDoc(value: unknown, label = "document"): Validated {
  if (!isRecord(value)) return { doc: null, errors: [`${label} is not a JSON object`], warnings: [] };
  if (!validTheme(value.theme)) return { doc: null, errors: [`${label}: theme is missing or malformed`], warnings: [] };
  if (!Array.isArray(value.screens) || value.screens.length === 0 || !value.screens.every(validScreen)) {
    return { doc: null, errors: [`${label}: screens are missing or malformed`], warnings: [] };
  }
  const screens = value.screens as Doc["screens"];
  const ids = screenIds(screens);
  const errors: string[] = [];
  const warnings: string[] = [];

  // duplicate screen ids would silently merge unrelated parts; rename copies
  const seenScreens = new Set<string>();
  for (const s of screens) {
    if (seenScreens.has(s.id)) {
      s.id = `${s.id}v${seenScreens.size}`;
      warnings.push(`${label}: duplicate screen id renamed to ${s.id}`);
    }
    seenScreens.add(s.id);
  }
  ids.clear();
  for (const s of screens) ids.add(s.id);
  const seen = new Set<string>();
  const parts: Doc["parts"] = [];
  const rawParts = Array.isArray(value.parts) ? value.parts : [];
  for (const raw of rawParts) {
    if (!validPart(raw)) {
      warnings.push(`${label}: dropped a malformed part${isRecord(raw) && typeof raw.id === "string" ? ` (${raw.id})` : ""}`);
      continue;
    }
    let p = raw as Doc["parts"][number];
    if (seen.has(p.id)) {
      p = { ...p, id: `${p.id}d${parts.length}` };
      warnings.push(`${label}: duplicate part id renamed to ${p.id}`);
    }
    seen.add(p.id);
    if (p.screen !== null && !ids.has(p.screen)) {
      p = { ...p, screen: null };
      warnings.push(`${label}: part ${p.id} referenced a missing screen, moved to the workspace`);
    }
    if (p.link && p.link.target !== BACK_TARGET && !ids.has(p.link.target)) {
      p = { ...p, link: undefined };
      warnings.push(`${label}: part ${p.id} linked to a missing screen, link removed`);
    }
    if (p.options?.some((o) => o.target && o.target !== BACK_TARGET && !ids.has(o.target))) {
      p = { ...p, options: p.options.map((o) => (o.target && o.target !== BACK_TARGET && !ids.has(o.target) ? { ...o, target: null } : o)) };
      warnings.push(`${label}: part ${p.id} had an option pointing at a missing screen, target removed`);
    }
    if (p.presents && !rawParts.some((q) => isRecord(q) && q.id === p.presents && (q.kind === "alert" || q.kind === "sheet"))) {
      p = { ...p, presents: undefined };
      warnings.push(`${label}: part ${p.id} presented a missing alert/sheet, presentation removed`);
    }
    parts.push(p);
  }
  return { doc: { ...(value as unknown as Doc), parts }, errors, warnings };
}

/** paste a whole document beside the current one: every id is remapped, so
 *  nothing collides and internal links keep pointing at the copies */
export function mergeDoc(incoming: Doc, current: Doc): Doc {
  const idOf = new Map<string, string>();
  for (const s of incoming.screens) idOf.set(s.id, newId());
  for (const p of incoming.parts) idOf.set(p.id, newId());
  const remapTarget = (t: string) => (t === BACK_TARGET ? BACK_TARGET : (idOf.get(t) ?? BACK_TARGET));
  const screens = incoming.screens.map((s) => ({ ...s, id: idOf.get(s.id)! }));
  const parts = incoming.parts.map((p) => ({
    ...p,
    id: idOf.get(p.id)!,
    screen: p.screen === null ? null : (idOf.get(p.screen) ?? null),
    link: p.link ? { ...p.link, target: remapTarget(p.link.target) } : undefined,
    options: p.options?.map((o) => ({ ...o, target: o.target ? remapTarget(o.target) : null })),
    presents: p.presents ? (idOf.get(p.presents) ?? undefined) : undefined,
  }));
  return { ...current, screens: [...current.screens, ...screens], parts: [...current.parts, ...parts] };
}
