#!/usr/bin/env node
import { argv, exit, stdout } from "node:process";
import { checkDocFile, docFromInput, docFromInputReported, tidyDoc, buildPromptForDoc, openLink, writeDocFile, readDocFile, importHtml, type Lang } from "./core";
import type { PromptScope } from "../lib/prompt";

/* The swiftui-canvas binary. Thin: parses argv, calls cli/core.ts functions,
 * prints results. --json switches any command to machine-readable output for
 * agent consumption. */

const USAGE = `swiftui-canvas — sketch SwiftUI screens anywhere, brief any agent

Usage:
  swiftui-canvas import <page.html|https://…> [-o draft.sc.json] [--lang zh|en] [--name X] [--json]
  swiftui-canvas check <file.sc.json> [--lang zh|en] [--json]
  swiftui-canvas tidy <file.sc.json> [--screen <id>] [--fix] [--json]
  swiftui-canvas prompt <file.sc.json> [--screen <id>] [--lang zh|en]
  swiftui-canvas open <file.sc.json> [--base <url>]
  swiftui-canvas preview <file.sc.json> [--port <n>]

Every command reads a Document (the .sc.json this project saves). Run
"swiftui-canvas import" (once built) to turn an HTML page into one.`;

function parseArgs(args: string[]): { pos: string[]; flags: Record<string, string | boolean> } {
  const pos: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("-")) {
      const key = a.replace(/^-+/, "");
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      pos.push(a);
    }
  }
  return { pos, flags };
}

const out = (s: string) => stdout.write(s + "\n");

async function main(): Promise<number> {
  const [cmd, ...rest] = argv.slice(2);
  const { pos, flags } = parseArgs(rest);
  const lang = (flags.lang === "zh" ? "zh" : "en") as Lang;
  const json = !!flags.json;

  if (!cmd || flags.help) {
    out(USAGE);
    return 0;
  }

  const file = pos[0];
  if (!file) {
    out(USAGE);
    return 2;
  }

  try {
    switch (cmd) {
      case "check": {
        const r = await checkDocFile(file, lang);
        if (json) {
          out(JSON.stringify(r, null, 2));
        } else {
          if (r.strict && !r.repaired) out(lang === "zh" ? "✓ 文档通过严格校验。" : "✓ document passes strict validation.");
          if (r.repaired) {
            out(lang === "zh" ? `⚠ 文档已修复（${r.warnings.length} 处）：` : `⚠ document repaired (${r.warnings.length}):`);
            for (const w of r.warnings) out(`  - ${w}`);
          }
        }
        return 0;
      }
      case "tidy": {
        const { doc, warnings } = await docFromInputReported(file);
        if (warnings.length) {
          out(lang === "zh" ? `⚠ 载入时已修复 ${warnings.length} 处，写回前请检查：` : `⚠ repaired on load (${warnings.length}) — review before writing back:`);
          for (const w of warnings) out(`  - ${w}`);
        }
        const { doc: tidied, changed } = tidyDoc(doc, typeof flags.screen === "string" ? flags.screen : undefined);
        if (flags.fix) await writeDocFile(file, tidied);
        if (json) {
          out(JSON.stringify({ changed, fixed: !!flags.fix, doc: tidied }, null, 2));
        } else {
          out(lang === "zh" ? (changed.length ? `✓ 已整理 ${changed.length} 个屏幕${flags.fix ? "，已写回" : "（--fix 写回）"}。` : "无需整理。") : changed.length
            ? `✓ tidied ${changed.length} screen(s)${flags.fix ? ", written back" : " (use --fix to write back)"}.`
            : "nothing to tidy.");
        }
        return 0;
      }
      case "prompt": {
        const doc = await docFromInput(file);
        const scope: PromptScope | undefined = typeof flags.screen === "string" ? { kind: "screen", id: flags.screen } : undefined;
        const text = buildPromptForDoc(doc, scope, lang);
        if (!text) {
          out(lang === "zh" ? "（空文档：无屏幕或无组件）" : "(empty document: no screens or parts)");
          return 1;
        }
        out(text);
        return 0;
      }
      case "open": {
        const doc = await readDocFile(file);
        out(await openLink(doc, typeof flags.base === "string" ? flags.base : undefined));
        return 0;
      }
      case "import": {
        const src = pos[0];
        if (!src) {
          out(USAGE);
          return 2;
        }
        const r = await importHtml(src, { lang, name: typeof flags.name === "string" ? flags.name : undefined });
        const outFile = typeof flags.o === "string" ? flags.o : "draft.sc.json";
        await writeDocFile(outFile, r.doc);
        if (json) {
          out(JSON.stringify(r, null, 2));
        } else {
          out(lang === "zh" ? `✓ 草稿已写入 ${outFile}（${r.doc.screens.length} 屏，${r.doc.parts.length} 组件）` : `✓ draft written to ${outFile} (${r.doc.screens.length} screen(s), ${r.doc.parts.length} part(s))`);
          if (r.decisions.length) {
            out(lang === "zh" ? "决策（●高 ◐中 ○低置信度）：" : "decisions (●high ◐medium ○low):");
            for (const d of r.decisions.slice(0, 30)) out(`  ${d.confidence === "high" ? "●" : d.confidence === "medium" ? "◐" : "○"} ${d.decision} — ${d.reason}`);
          }
          for (const n of r.notes) out(lang === "zh" ? `  注：${n}` : `  note: ${n}`);
        }
        return 0;
      }
      case "preview": {
        const { servePreview } = await import("./serve");
        const { doc } = await checkDocFile(file, lang);
        await servePreview(JSON.stringify(doc), Number(flags.port) || 4173);
        return 0; // servePreview resolves when the process is killed
      }
      default:
        out(`unknown command: ${cmd}\n\n${USAGE}`);
        return 2;
    }
  } catch (err) {
    out(`error: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}

exit(await main());
