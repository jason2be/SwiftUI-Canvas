import { readFile, writeFile } from "node:fs/promises";
import { isProject, saveProject, validateDoc, type Validated } from "../lib/project";
import { extractPage } from "../lib/extract/extract";
import type { Extraction } from "../lib/extract/report";
import type { Part } from "../lib/tokens";
import { buildPrompt, type PromptScope } from "../lib/prompt";
import { shareLink } from "../lib/share";
import { tidyScreen } from "../lib/tidy";
import { type Doc, type Screen } from "../lib/tokens";

/* The CLI/MCP kernel: every command is a function over a Doc file, so the
 * binary (cli/index.ts) and the MCP server (mcp/server.ts) stay thin shells.
 * Nothing here touches process.argv, process.stdout or the DOM. */

export type Lang = "en" | "zh";

export async function readDocFile(path: string): Promise<Doc> {
  return docFromInput(path);
}

/** check: validate + tolerant repair; returns the report and (possibly
 *  repaired) document without writing anything */
export async function checkDocFile(path: string, lang: Lang = "en"): Promise<{ doc: Doc; repaired: boolean; warnings: string[]; strict: boolean }> {
  const text = await readFile(path, "utf8");
  const parsed: unknown = JSON.parse(text);
  const strict = isProject(parsed);
  if (strict) return { doc: parsed, repaired: false, warnings: [], strict };
  const label = lang === "zh" ? "文档" : "document";
  const v: Validated = validateDoc(parsed, label, lang);
  if (!v.doc) throw new Error(v.errors.join("; "));
  return { doc: v.doc, repaired: true, warnings: v.warnings, strict };
}

/** tidy: apply the row-model tidy to every screen (or one), reporting which
 *  screens changed */
export function tidyDoc(doc: Doc, screenId?: string): { doc: Doc; changed: string[] } {
  const targets = screenId ? [screenId] : doc.screens.map((s) => s.id);
  const changed: string[] = [];
  const byScreen = new Map<string, ReturnType<typeof tidyScreen>>();
  for (const id of targets) {
    const next = tidyScreen(doc, id);
    if (next) {
      byScreen.set(id, next);
      changed.push(id);
    }
  }
  if (byScreen.size === 0) return { doc, changed };
  return {
    doc: {
      ...doc,
      parts: doc.parts.map((p) => (p.screen ? (byScreen.get(p.screen)?.find((np: Part) => np.id === p.id) ?? p) : p)),
    },
    changed,
  };
}

/** prompt: the full brief, whole design or one screen, either language */
export function buildPromptForDoc(doc: Doc, scope: PromptScope | undefined, lang: Lang): string {
  return buildPrompt(doc, scope ?? { kind: "all" }, lang);
}

/** open: the deployed share link a person can click to keep editing */
export async function openLink(doc: Doc, base?: string): Promise<string> {
  return shareLink(doc, base);
}

/** write a doc back to its file with the editor's own save format */
export async function writeDocFile(path: string, doc: Doc): Promise<void> {
  await writeFile(path, JSON.stringify(doc, null, 2) + "\n", "utf8");
}

/** load a Doc from a file path or a raw JSON string, WITHOUT hiding repairs:
 *  callers that write the document back (tidy --fix) must surface the
 *  warnings, so repairs are never silent */
export async function docFromInputReported(input: string): Promise<{ doc: Doc; warnings: string[]; strict: boolean }> {
  const text = input.trim().startsWith("{") ? input : await readFile(input, "utf8");
  const parsed: unknown = JSON.parse(text);
  if (isProject(parsed)) return { doc: parsed, warnings: [], strict: true };
  const v = validateDoc(parsed, "document");
  if (v.doc) return { doc: v.doc, warnings: v.warnings, strict: false };
  throw new Error(v.errors.join("; ") || "unrecognizable document");
}

/** load a Doc from a file path or a raw JSON string (repairs applied silently) */
export async function docFromInput(input: string): Promise<Doc> {
  return (await docFromInputReported(input)).doc;
}

export { saveProject };
export type { Screen };

/** import: HTML (url, file path, or raw html string) → draft doc + report */
export async function importHtml(source: string, opts: { lang?: Lang; name?: string; fetchHtml?: (url: string) => Promise<string> } = {}): Promise<Extraction> {
  const lang = opts.lang;
  let html: string;
  let name = opts.name;
  if (/^https?:\/\//i.test(source)) {
    html = opts.fetchHtml ? await opts.fetchHtml(source) : await (await fetch(source)).text();
  } else if (/^\s*</.test(source)) {
    html = source;
  } else {
    html = await readFile(source, "utf8");
    if (!name) name = source.replace(/\\.[^.]*$/, "").split(/[\\/]/).pop();
  }
  return extractPage(html, { lang, name });
}
