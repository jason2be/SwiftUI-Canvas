import { checkDocFile, tidyDoc, buildPromptForDoc, openLink, importHtml, docFromInput, type Lang } from "../cli/core";
import { isProject, validateDoc } from "../lib/project";
import type { Doc } from "../lib/tokens";

/* MCP server for SwiftUI-Canvas (stdio transport, newline-delimited JSON).
 * Five tools, all thin shells over cli/core.ts: import_html, check_doc,
 * tidy_doc, build_prompt, open_preview. An agent imports a page, iterates on
 * the draft document, gets a brief, and hands its owner a share link. */

type Json = Record<string, unknown>;

interface ToolDef {
  name: string;
  description: string;
  inputSchema: Json;
}

const TOOLS: ToolDef[] = [
  {
    name: "import_html",
    description: "Extract a SwiftUI-Canvas draft document from a static HTML page (URL, file path, or raw HTML). Returns the draft doc plus a decision report (●high ◐medium ○low confidence) and notes; revise the doc deliberately, then verify with check_doc.",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "An http(s) URL, a local file path, or a raw HTML string (starting with '<')." },
        name: { type: "string", description: "Override the app/screen title." },
        lang: { type: "string", enum: ["en", "zh"], description: "Language for the app copy; default en." },
      },
      required: ["source"],
    },
  },
  {
    name: "check_doc",
    description: "Validate a SwiftUI-Canvas document. Returns the (possibly repaired) document, whether it passed strict validation, and bilingual warnings for anything repaired. Always run this before build_prompt or open_preview.",
    inputSchema: {
      type: "object",
      properties: {
        doc: { type: ["object", "string"], description: "The document (object, JSON string, or file path)." },
        lang: { type: "string", enum: ["en", "zh"] },
      },
      required: ["doc"],
    },
  },
  {
    name: "tidy_doc",
    description: "Apply the row-model tidy to every screen (or one screen), snapping parts into aligned rows. Returns the tidied document and which screens changed.",
    inputSchema: {
      type: "object",
      properties: {
        doc: { type: ["object", "string"], description: "The document (object, JSON string, or file path)." },
        screenId: { type: "string", description: "Tidy only this screen." },
      },
      required: ["doc"],
    },
  },
  {
    name: "build_prompt",
    description: "Generate the SwiftUI implementation brief for a document: visual-order screens, navigation map, theme, and the modern-API baseline (iOS 26/27). Feed this text to the code-generating model.",
    inputSchema: {
      type: "object",
      properties: {
        doc: { type: ["object", "string"], description: "The document (object, JSON string, or file path)." },
        screenId: { type: "string", description: "Brief one screen only." },
        lang: { type: "string", enum: ["en", "zh"] },
      },
      required: ["doc"],
    },
  },
  {
    name: "open_preview",
    description: "Build a share link (deployed editor URL + #sw= document hash) that opens the design in SwiftUI-Canvas for continued editing. Pass base to link a local 'swiftui-canvas preview' server instead.",
    inputSchema: {
      type: "object",
      properties: {
        doc: { type: ["object", "string"], description: "The document (object, JSON string, or file path)." },
        base: { type: "string", description: "Editor base URL, e.g. http://localhost:4173/ from the CLI preview command." },
      },
      required: ["doc"],
    },
  },
];

/** accept an object, a JSON string, or a file path */
async function docFromUnknown(value: unknown): Promise<Doc> {
  if (value && typeof value === "object") {
    if (isProject(value)) return value;
    const v = validateDoc(value, "document");
    if (v.doc) return v.doc;
    throw new Error(v.errors.join("; "));
  }
  if (typeof value === "string") return docFromInput(value);
  throw new Error("doc must be an object, a JSON string, or a file path");
}

/** the raw value behind a doc argument, without any repair */
async function rawDoc(value: unknown): Promise<unknown> {
  if (value && typeof value === "object") return value;
  if (typeof value === "string") {
    if (value.trim().startsWith("{")) return JSON.parse(value) as unknown;
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(value, "utf8")) as unknown;
  }
  throw new Error("doc must be an object, a JSON string, or a file path");
}

export async function callTool(name: string, args: Json): Promise<{ content: { type: string; text: string }[]; isError?: boolean }> {
  try {
    const lang = (args.lang === "zh" ? "zh" : "en") as Lang;
    switch (name) {
      case "import_html": {
        const source = String(args.source ?? "");
        if (!source) throw new Error("source is required");
        const r = await importHtml(source, { lang, name: typeof args.name === "string" ? args.name : undefined });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  doc: r.doc,
                  decisions: r.decisions,
                  notes: r.notes,
                  hint: "check_doc after editing; tidy_doc to snap rows; build_prompt for the implementation brief",
                },
                null,
                2,
              ),
            },
          ],
        };
      }
      case "check_doc": {
        // work on the RAW value so repairs are reported, not applied silently
        const value = await rawDoc(args.doc);
        const strict = value !== null && typeof value === "object" && isProject(value);
        const r = strict
          ? { doc: value as Doc, repaired: false, warnings: [] as string[], strict: true }
          : (() => {
              const v = validateDoc(value, "document", lang);
              if (!v.doc) throw new Error(v.errors.join("; "));
              return { doc: v.doc, repaired: true, warnings: v.warnings, strict: false };
            })();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ...r, hint: r.repaired ? "the document was repaired; review the warnings" : "document is strict-valid" }, null, 2),
            },
          ],
        };
      }
      case "tidy_doc": {
        const doc = await docFromUnknown(args.doc);
        const r = tidyDoc(doc, typeof args.screenId === "string" ? args.screenId : undefined);
        return { content: [{ type: "text", text: JSON.stringify(r, null, 2) }] };
      }
      case "build_prompt": {
        const doc = await docFromUnknown(args.doc);
        const text = buildPromptForDoc(doc, typeof args.screenId === "string" ? { kind: "screen", id: args.screenId } : undefined, lang);
        return { content: [{ type: "text", text }] };
      }
      case "open_preview": {
        const doc = await docFromUnknown(args.doc);
        const link = await openLink(doc, typeof args.base === "string" ? args.base : undefined);
        return { content: [{ type: "text", text: JSON.stringify({ link, hint: "open in a browser; the design loads from the hash" }, null, 2) }] };
      }
      default:
        throw new Error(`unknown tool: ${name}`);
    }
  } catch (err) {
    return { content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }], isError: true };
  }
}

export function toolsList(): { tools: ToolDef[] } {
  return { tools: TOOLS };
}

/** handle one JSON-RPC message; null for notifications */
export async function handleMessage(msg: Json): Promise<Json | null> {
  const method = typeof msg.method === "string" ? msg.method : "";
  const hasId = msg.id !== undefined && msg.id !== null;
  try {
    if (method === "initialize") {
      const clientVersion = typeof (msg.params as Json | undefined)?.protocolVersion === "string" ? (msg.params as Json).protocolVersion : "2024-11-05";
      return {
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          protocolVersion: clientVersion,
          capabilities: { tools: {} },
          serverInfo: { name: "swiftui-canvas", version: "0.1.0" },
          instructions:
            "Tools for the SwiftUI-Canvas design format: import an HTML page into a draft document, validate/tidy it, generate the SwiftUI brief, and produce a share link. Iterate on the doc JSON between tools; all ids (screens, parts, targets) must stay consistent.",
        },
      };
    }
    if (method === "tools/list") return { jsonrpc: "2.0", id: msg.id, result: toolsList() };
    if (method === "tools/call") {
      const params = (msg.params ?? {}) as Json;
      const name = String(params.name ?? "");
      const args = (params.arguments ?? {}) as Json;
      const result = await callTool(name, args);
      return { jsonrpc: "2.0", id: msg.id, result };
    }
    if (method === "ping") return { jsonrpc: "2.0", id: msg.id, result: {} };
    if (method.startsWith("notifications/")) return null;
    if (hasId) return { jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: `method not found: ${method}` } };
    return null;
  } catch (err) {
    if (!hasId) return null;
    return { jsonrpc: "2.0", id: msg.id, error: { code: -32603, message: err instanceof Error ? err.message : String(err) } };
  }
}

/** run the stdio loop over any duplex pair (testable without a real tty) */
export function runMcpServer(input: NodeJS.ReadableStream, write: (s: string) => void): Promise<void> {
  return new Promise((resolve) => {
    let buffer = "";
    input.on("data", (chunk: Buffer | string) => {
      buffer += chunk.toString();
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        void (async () => {
          let msg: Json;
          try {
            msg = JSON.parse(line) as Json;
          } catch {
            write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }) + "\n");
            return;
          }
          const res = await handleMessage(msg);
          if (res) write(JSON.stringify(res) + "\n");
        })();
      }
    });
    input.on("end", () => resolve());
    input.on("error", () => resolve());
  });
}

/** entry: serve on stdio; each response streams out line by line */
export async function main(): Promise<void> {
  const { stdin, stdout } = await import("node:process");
  await runMcpServer(stdin, (s) => stdout.write(s));
}

// esbuild defines this to true for the dist bundle; as a plain module it is
// undefined, so importing the file never starts a server
declare const __MCP_ENTRY__: boolean;
if (typeof __MCP_ENTRY__ !== "undefined" && __MCP_ENTRY__) {
  void main();
}
