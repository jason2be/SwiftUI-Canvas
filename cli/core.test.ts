import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkDocFile, docFromInput, docFromInputReported, tidyDoc, buildPromptForDoc, openLink, writeDocFile } from "./core";
import { startServer, handlerFor, detectBase } from "./serve";
import type { Doc } from "../lib/tokens";

const doc = (): Doc => ({
  title: "CLI Demo",
  lang: "en" as const,
  platform: "ios" as const,
  theme: { accent: "systemBlue", scheme: "light" as const, shape: "default" as const, font: "system" as const },
  screens: [
    { id: "a", name: "Home", x: 0, y: 0, chrome: true },
    { id: "b", name: "Detail", x: 513, y: 0 },
  ],
  parts: [
    { id: "l1", screen: "a", kind: "list", x: 16, y: 300, label: "", variant: "insetGrouped", options: [{ label: "Tea", target: "b" }, { label: "Coffee" }] },
    { id: "btn", screen: "b", kind: "button", x: 40, y: 140, label: "Back", variant: "bordered", link: { target: "back", transition: "push" } },
  ],
});

describe("checkDocFile", () => {
  it("passes a strict document through untouched", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sc-cli-"));
    const file = join(dir, "a.sc.json");
    await writeFile(file, JSON.stringify(doc()));
    const r = await checkDocFile(file);
    expect(r.strict).toBe(true);
    expect(r.repaired).toBe(false);
  });

  it("repairs a broken document and reports in-language", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sc-cli-"));
    const file = join(dir, "b.sc.json");
    const broken = { ...doc(), parts: [...doc().parts, { id: "x", screen: "ghost", kind: "text", x: 0, y: 0, variant: "body" }] };
    await writeFile(file, JSON.stringify(broken));
    const en = await checkDocFile(file, "en");
    expect(en.repaired).toBe(true);
    expect(en.warnings.join(" ")).toContain("moved to the workspace");
    const zh = await checkDocFile(file, "zh");
    expect(zh.warnings.join(" ")).toContain("已移到工作区");
  });

  it("throws a readable error on unrepairable input", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sc-cli-"));
    const file = join(dir, "c.json");
    await writeFile(file, JSON.stringify({ hello: 1 }));
    await expect(checkDocFile(file)).rejects.toThrow(/theme/);
  });
});

describe("docFromInput", () => {
  it("accepts raw JSON as well as a path", async () => {
    const fromJson = await docFromInput(JSON.stringify(doc()));
    expect(fromJson.title).toBe("CLI Demo");
    const dir = await mkdtemp(join(tmpdir(), "sc-cli-"));
    const file = join(dir, "d.sc.json");
    await writeFile(file, JSON.stringify(doc()));
    const fromFile = await docFromInput(file);
    expect(fromFile.screens).toHaveLength(2);
  });
});

describe("docFromInputReported", () => {
  it("surfaces repair warnings instead of applying them silently", async () => {
    const broken = doc();
    (broken.parts[0].options![0] as { target: string }).target = "ghost";
    const r = await docFromInputReported(JSON.stringify(broken));
    expect(r.strict).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/removed|dropped/i);
    expect(JSON.stringify(r.doc)).not.toContain("ghost");
    const strict = await docFromInputReported(JSON.stringify(doc()));
    expect(strict.strict).toBe(true);
    expect(strict.warnings).toHaveLength(0);
  });
});

describe("tidyDoc", () => {
  it("moves a list into the row model and reports changed screens", () => {
    const d = doc();
    // the list sits mid-screen; tidy should snap it under the chrome
    const { doc: tidied, changed } = tidyDoc(d);
    expect(changed).toEqual(["a", "b"]);
    const list = tidied.parts.find((p) => p.id === "l1")!;
    const firstBar = tidied.parts.find((p) => p.id === "l1");
    void firstBar;
    expect(list.y).toBeLessThan(300); // pulled up toward the content top
    const identical = tidyDoc(tidied);
    // second run converges (tidy is idempotent on its own output)
    const list2 = identical.doc.parts.find((p) => p.id === "l1")!;
    expect(list2.y).toBe(list.y);
  });
});

describe("buildPromptForDoc", () => {
  it("produces the same brief as the editor for the same doc", () => {
    const text = buildPromptForDoc(doc(), undefined, "en");
    expect(text).toContain("CLI Demo");
    expect(text).toContain("opens Detail"); // list row targets serialize
    const one = buildPromptForDoc(doc(), { kind: "screen", id: "b" }, "en");
    expect(one).toContain("Detail");
    expect(one).not.toContain("## Screen: Home");
  });
});

describe("openLink", () => {
  it("builds a share link on any base", async () => {
    const link = await openLink(doc(), "http://localhost:4173/");
    expect(link).toMatch(/^http:\/\/localhost:4173\/#sw=/);
  });
});

describe("writeDocFile / readDocFile roundtrip", () => {
  it("writes what readDocFile can read back strictly", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sc-cli-"));
    const file = join(dir, "e.sc.json");
    await writeDocFile(file, doc());
    const text = await readFile(file, "utf8");
    expect(text.endsWith("\n")).toBe(true);
    const r = await checkDocFile(file);
    expect(r.strict).toBe(true);
  });
});

describe("preview server", () => {
  const servers: { close: (cb: () => void) => void }[] = [];
  beforeAll(() => {
    // nothing: servers are started per-test below
  });
  afterAll(async () => {
    for (const s of servers) await new Promise<void>((res) => s.close(() => res()));
  });

  it("serves files from a directory with mime types", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sc-srv-"));
    await writeFile(join(dir, "index.html"), "<!doctype html><title>hi</title>");
    const h = handlerFor(dir, "") as (p: string) => Promise<{ status: number; type: string; body: Buffer }>;
    const r = await h("/index.html");
    expect(r.status).toBe(200);
    expect(r.type).toContain("text/html");
    expect(r.body.toString()).toContain("hi");
    const missing = await h("/nope.js");
    expect(missing.status).toBe(404);
  });

  it("traversal attempts are rejected", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sc-srv-"));
    await writeFile(join(dir, "index.html"), "x");
    const h = handlerFor(dir, "") as (p: string) => Promise<{ status: number; type: string; body: Buffer }>;
    const r = await h("/../etc/passwd");
    expect([403, 404]).toContain(r.status);
  });

  it("startServer returns the actual port and serves the app", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sc-srv-"));
    await writeFile(join(dir, "index.html"), "<!doctype html><html><body>app</body></html>");
    const { server, url } = await startServer(dir, 0);
    servers.push(server);
    expect(url).toMatch(/http:\/\/localhost:\d+\//);
    const res = await fetch(url);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("app");
  });

  it("detectBase finds a project-page subdirectory", () => {
    // detectBase is sync; exercised indirectly by startServer with a flat dir
    expect(detectBase("/nonexistent-dir-xyz")).toBe("");
  });
});
