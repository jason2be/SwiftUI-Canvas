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

/** every presents trigger names an alert/sheet on the same screen */
const presentsIntact = (parts: unknown[]): boolean => {
  const recs = parts.filter(isRecord);
  return recs.every((p) => {
    if (p.presents === undefined) return true;
    if (typeof p.presents !== "string") return false;
    return recs.some((q) => q.id === p.presents && q.screen === p.screen && (q.kind === "alert" || q.kind === "sheet"));
  });
};

export const isProject = (v: unknown): v is Doc =>
  isRecord(v) &&
  typeof v.title === "string" &&
  (v.lang === undefined || v.lang === "en" || v.lang === "zh") &&
  validTheme(v.theme) &&
  Array.isArray(v.screens) &&
  v.screens.every(validScreen) &&
  Array.isArray(v.parts) &&
  v.parts.every(validPart) &&
  presentsIntact(v.parts);

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

type MsgKey =
  | "notObject"
  | "theme"
  | "screens"
  | "missingTitle"
  | "unknownLang"
  | "droppedPart"
  | "dupPart"
  | "movedToWorkspace"
  | "linkRemoved"
  | "targetRemoved"
  | "presentsRemoved"
  | "dupScreen";

/** repair notices in the interface language; ids and names stay verbatim */
const msg = (lang: "en" | "zh", key: MsgKey, label: string, detail = ""): string => {
  const zh: Record<MsgKey, [string, string]> = {
    notObject: ["不是 JSON 对象", ""],
    theme: ["theme 缺失或格式错误", ""],
    screens: ["screens 缺失或格式错误", ""],
    missingTitle: ["缺少标题，已设为", "Untitled App"],
    unknownLang: ["未知语言，已改用", "en"],
    droppedPart: ["丢弃了无法识别的组件", ""],
    dupPart: ["重复的组件 id 已改名为", ""],
    movedToWorkspace: ["组件引用了不存在的屏幕，已移到工作区", ""],
    linkRemoved: ["组件指向不存在的屏幕，链接已移除", ""],
    targetRemoved: ["组件的选项指向不存在的屏幕，目标已移除", ""],
    presentsRemoved: ["组件弹出的警告/面板不存在（或不在同一屏），弹出已移除", ""],
    dupScreen: ["重复的屏幕 id 已改名为", ""],
  };
  const en: Record<MsgKey, [string, string]> = {
    notObject: ["is not a JSON object", ""],
    theme: ["theme is missing or malformed", ""],
    screens: ["screens are missing or malformed", ""],
    missingTitle: ["missing title, set to", "Untitled App"],
    unknownLang: ["unknown language, using", "en"],
    droppedPart: ["dropped a malformed part", ""],
    dupPart: ["duplicate part id renamed to", ""],
    movedToWorkspace: ["part referenced a missing screen, moved to the workspace", ""],
    linkRemoved: ["part linked to a missing screen, link removed", ""],
    targetRemoved: ["part had an option pointing at a missing screen, target removed", ""],
    presentsRemoved: ["part presented a missing or off-screen alert/sheet, presentation removed", ""],
    dupScreen: ["duplicate screen id renamed to", ""],
  };
  const [phrase, arg] = (lang === "zh" ? zh : en)[key];
  const tail = [arg, detail].filter(Boolean).join(" ");
  return `${label}${lang === "zh" ? "：" : ": "}${phrase}${tail ? (lang === "zh" ? " " : " ") + tail : ""}`;
};

/** screen ids the doc actually contains, for dangling-reference checks */
const screenIds = (screens: { id: string }[]): Set<string> => new Set(screens.map((s) => s.id));

export function validateDoc(value: unknown, label = "document", lang: "en" | "zh" = "en"): Validated {
  if (!isRecord(value)) return { doc: null, errors: [msg(lang, "notObject", label)], warnings: [] };
  if (!validTheme(value.theme)) return { doc: null, errors: [msg(lang, "theme", label)], warnings: [] };
  if (!Array.isArray(value.screens) || value.screens.length === 0 || !value.screens.every(validScreen)) {
    return { doc: null, errors: [msg(lang, "screens", label)], warnings: [] };
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
      warnings.push(msg(lang, "dupScreen", label, s.id));
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
      warnings.push(msg(lang, "droppedPart", label, isRecord(raw) && typeof raw.id === "string" ? `(${raw.id})` : ""));
      continue;
    }
    let p = raw as Doc["parts"][number];
    if (seen.has(p.id)) {
      p = { ...p, id: `${p.id}d${parts.length}` };
      warnings.push(msg(lang, "dupPart", label, p.id));
    }
    seen.add(p.id);
    if (p.screen !== null && !ids.has(p.screen)) {
      p = { ...p, screen: null };
      warnings.push(msg(lang, "movedToWorkspace", label, p.id));
    }
    if (p.link && p.link.target !== BACK_TARGET && !ids.has(p.link.target)) {
      p = { ...p, link: undefined };
      warnings.push(msg(lang, "linkRemoved", label, p.id));
    }
    if (p.options?.some((o) => o.target && o.target !== BACK_TARGET && !ids.has(o.target))) {
      p = { ...p, options: p.options.map((o) => (o.target && o.target !== BACK_TARGET && !ids.has(o.target) ? { ...o, target: null } : o)) };
      warnings.push(msg(lang, "targetRemoved", label, p.id));
    }
    parts.push(p);
  }
  // presents must point at an alert/sheet that SURVIVED repair on the same
  // screen (a raw scan would accept a target dropped earlier in this pass)
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p.presents) continue;
    const ok = parts.some((q) => q.id === p.presents && q.screen === p.screen && (q.kind === "alert" || q.kind === "sheet"));
    if (!ok) {
      parts[i] = { ...p, presents: undefined };
      warnings.push(msg(lang, "presentsRemoved", label, p.id));
    }
  }
  // fields isProject requires, normalized so a repaired doc loads and saves
  // cleanly (projectFileName calls title.trim())
  const doc: Doc = {
    title: typeof value.title === "string" ? value.title : "Untitled App",
    lang: value.lang === "zh" ? "zh" : "en",
    platform: "ios",
    theme: value.theme as Doc["theme"],
    screens,
    parts,
  };
  if (typeof value.title !== "string") warnings.push(msg(lang, "missingTitle", label));
  if (value.lang !== undefined && value.lang !== "en" && value.lang !== "zh") warnings.push(msg(lang, "unknownLang", label));
  return { doc, errors, warnings };
}

/** paste a whole document beside the current one: every id is remapped, so
 *  nothing collides and internal links keep pointing at the copies */
export function mergeDoc(incoming: Doc, current: Doc): { doc: Doc; idMap: Map<string, string> } {
  const idOf = new Map<string, string>();
  for (const s of incoming.screens) idOf.set(s.id, newId());
  for (const p of incoming.parts) idOf.set(p.id, newId());
  // a target outside the incoming doc has no home here: drop it, like the
  // validator does, instead of silently rewriting it into "back"
  const remapTarget = (t: string) => (t === BACK_TARGET ? BACK_TARGET : idOf.get(t));
  const screens = incoming.screens.map((s) => ({ ...s, id: idOf.get(s.id)! }));
  const parts = incoming.parts.map((p) => ({
    ...p,
    id: idOf.get(p.id)!,
    screen: p.screen === null ? null : (idOf.get(p.screen) ?? null),
    link: p.link && remapTarget(p.link.target) !== undefined ? { ...p.link, target: remapTarget(p.link.target)! } : undefined,
    options: p.options?.map((o) => ({ ...o, target: o.target ? (remapTarget(o.target) ?? null) : null })),
    presents: p.presents ? idOf.get(p.presents) : undefined,
  }));
  return { doc: { ...current, screens: [...current.screens, ...screens], parts: [...current.parts, ...parts] }, idMap: idOf };
}
