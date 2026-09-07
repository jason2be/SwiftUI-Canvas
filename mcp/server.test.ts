import { describe, expect, it } from "vitest";
import { handleMessage, callTool, runMcpServer, toolsList } from "./server";
import { Readable } from "node:stream";
import type { Doc } from "../lib/tokens";

const doc = (): Doc => ({
  title: "Demo",
  lang: "en",
  platform: "ios",
  theme: { accent: "systemBlue", scheme: "light", shape: "default", font: "system" },
  screens: [
    { id: "a", name: "Home", x: 0, y: 0 },
    { id: "b", name: "Detail", x: 513, y: 0 },
  ],
  parts: [
    { id: "l1", screen: "a", kind: "list", x: 16, y: 300, label: "", variant: "insetGrouped", options: [{ label: "Tea", target: "b" }, { label: "Coffee" }] },
    { id: "btn", screen: "b", kind: "button", x: 40, y: 140, label: "Back", variant: "bordered", link: { target: "back", transition: "push" } },
  ],
});

const textOf = async (p: Promise<{ content: { type: string; text: string }[]; isError?: boolean }>) => {
  const r = await p;
  return { text: r.content[0]?.text ?? "", isError: !!r.isError };
};

describe("protocol", () => {
  it("answers initialize with matching protocol version and server info", async () => {
    const res = await handleMessage({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
    const result = (res as { result: Record<string, unknown> }).result;
    expect(result.protocolVersion).toBe("2025-06-18");
    expect((result.serverInfo as Record<string, string>).name).toBe("swiftui-canvas");
    expect(result.capabilities).toEqual({ tools: {} });
  });
  it("lists the five tools with schemas", async () => {
    const res = await handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const tools = (res as { result: { tools: { name: string }[] } }).result.tools;
    expect(tools.map((t) => t.name)).toEqual(["import_html", "check_doc", "tidy_doc", "build_prompt", "open_preview"]);
    expect(tools.every((t) => (t as unknown as { inputSchema: object }).inputSchema)).toBe(true);
  });
  it("acks ping, ignores notifications, errors on unknown methods", async () => {
    expect(await handleMessage({ jsonrpc: "2.0", id: 3, method: "ping" })).toEqual({ jsonrpc: "2.0", id: 3, result: {} });
    expect(await handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
    const res = await handleMessage({ jsonrpc: "2.0", id: 4, method: "no/such" });
    expect((res as { error: { code: number } }).error.code).toBe(-32601);
  });
  it("returns tool errors as isError results, not protocol errors", async () => {
    const res = await handleMessage({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "check_doc", arguments: { doc: { junk: true } } } });
    const result = (res as { result: { isError: boolean; content: { text: string }[] } }).result;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/theme|not/i);
  });
  it("rejects malformed json frames with a parse error", async () => {
    const out: string[] = [];
    const stream = Readable.from(["not json\n"]);
    await runMcpServer(stream, (s) => out.push(s));
    expect(out.join("")).toMatch(/parse error/);
  });
  it("streams newline-delimited responses over a duplex pair", async () => {
    const out: string[] = [];
    const frames = ['{"jsonrpc":"2.0","id":1,"method":"ping"}', "", '{"jsonrpc":"2.0","id":2,"method":"tools/list"}', ""].join("\n");
    await runMcpServer(Readable.from([frames]), (s) => out.push(s));
    const lines = out.join("").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).id).toBe(1);
    expect(JSON.parse(lines[1]).result.tools).toHaveLength(5);
  });
});

describe("tools", () => {
  it("import_html returns a valid draft with decisions", async () => {
    const { text, isError } = await textOf(callTool("import_html", { source: "<html><head><title>Tea</title></head><body><h1>Tea House</h1><ul><li>A</li><li>B</li></ul></body></html>" }));
    expect(isError).toBe(false);
    const parsed = JSON.parse(text);
    expect(parsed.doc.title).toBe("Tea");
    expect(parsed.decisions.length).toBeGreaterThan(1);
    expect(parsed.hint).toMatch(/check_doc/);
  });
  it("check_doc passes strict docs untouched", async () => {
    const { text, isError } = await textOf(callTool("check_doc", { doc: doc() }));
    expect(isError).toBe(false);
    const parsed = JSON.parse(text);
    expect(parsed.strict).toBe(true);
    expect(parsed.repaired).toBe(false);
  });
  it("check_doc repairs dangling refs and reports", async () => {
    const broken = doc();
    (broken.parts[0].options![0] as { target: string }).target = "ghost";
    const { text } = await textOf(callTool("check_doc", { doc: broken as unknown as object }));
    const parsed = JSON.parse(text);
    expect(parsed.repaired).toBe(true);
    expect(parsed.warnings.join(" ")).toMatch(/target|screen|removed/i);
    expect(JSON.stringify(parsed.doc)).not.toContain("ghost");
  });
  it("accepts a JSON string or object for doc", async () => {
    const asString = await textOf(callTool("check_doc", { doc: JSON.stringify(doc()) }));
    expect(asString.isError).toBe(false);
    const asObj = await textOf(callTool("check_doc", { doc: doc() as unknown as object }));
    expect(asObj.isError).toBe(false);
  });
  it("tidy_doc reports changed screens", async () => {
    const { text } = await textOf(callTool("tidy_doc", { doc: doc() }));
    const parsed = JSON.parse(text);
    expect(parsed.changed).toEqual(["a", "b"]);
    expect(parsed.doc.screens).toHaveLength(2);
  });
  it("build_prompt returns the brief with the API baseline", async () => {
    const { text } = await textOf(callTool("build_prompt", { doc: doc(), lang: "zh" }));
    expect(text).toContain("Demo");
    expect(text).toContain("NavigationStack");
  });
  it("open_preview builds a link on a base", async () => {
    const { text } = await textOf(callTool("open_preview", { doc: doc(), base: "http://localhost:4173/" }));
    const parsed = JSON.parse(text);
    expect(parsed.link).toMatch(/^http:\/\/localhost:4173\/#sw=/);
  });
  it("unknown tools error cleanly", async () => {
    const { isError, text } = await textOf(callTool("nope", {}));
    expect(isError).toBe(true);
    expect(text).toMatch(/unknown tool/);
  });
  it("tools/list is exposed for capability discovery", () => {
    expect(toolsList().tools).toHaveLength(5);
  });
});
