import { createServer, type Server } from "node:http";
import { stat, readFile } from "node:fs/promises";
import { readdirSync, existsSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";

/* preview: a tiny read-only server for the prebuilt static editor (out/).
 * The document itself travels in the URL hash (#sw=), exactly like a share
 * link, so the served app needs zero modifications to open it. */

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".md": "text/markdown; charset=utf-8",
};

/** find the served base path: the build may put the app under a subdirectory
 *  (GitHub Pages project sites); pick the one holding index.html */
export function detectBase(dir: string): string {
  if (existsSync(join(dir, "index.html"))) return "";
  try {
    const entries = readdirDirs(dir);
    if (entries.length === 1 && existsSync(join(dir, entries[0], "index.html"))) return `/${entries[0]}`;
  } catch {
    // fall through
  }
  return "";
}

function readdirDirs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
}

export function handlerFor(dir: string, base: string) {
  const root = resolve(dir);
  return async (path: string): Promise<{ status: number; type: string; body: Buffer }> => {
    let p = decodeURIComponent(path.split("?")[0]);
    if (p === "/" && base) p = `${base}/`;
    if (base && p.startsWith(`${base}/`)) p = p.slice(base.length);
    const file = normalize(join(root, p === "/" ? "index.html" : p));
    if (!file.startsWith(root + sep) && file !== root) return { status: 403, type: "text/plain", body: Buffer.from("forbidden") };
    let target = file;
    try {
      const st = await stat(target);
      if (st.isDirectory()) target = join(target, "index.html");
    } catch {
      // extensionless paths fall back to the app shell; missing assets 404
      const indexFile = join(root, base, "index.html");
      if (!extname(p) && existsSync(indexFile)) target = indexFile;
      else return { status: 404, type: "text/plain", body: Buffer.from("not found") };
    }
    try {
      const body = await readFile(target);
      return { status: 200, type: MIME[extname(target)] ?? "application/octet-stream", body };
    } catch {
      return { status: 404, type: "text/plain", body: Buffer.from("not found") };
    }
  };
}

/** serve the built editor; resolves the URL to open (with the doc hash) */
export function startServer(dir: string, port: number): Promise<{ server: Server; url: string; base: string }> {
  const base = detectBase(dir);
  const handler = handlerFor(dir, base);
  return new Promise((res, rej) => {
    const server = createServer((req, res) => {
      handler(req.url ?? "/")
        .then((r) => {
          res.writeHead(r.status, { "content-type": r.type });
          res.end(r.body);
        })
        .catch(() => {
          res.writeHead(500);
          res.end("server error");
        });
    });
    server.on("error", rej);
    server.listen(port, () => {
      const addr = server.address();
      const actual = typeof addr === "object" && addr ? addr.port : port;
      res({ server, url: `http://localhost:${actual}${base}/`, base });
    });
  });
}

/** long-running preview: serves, prints the URL, keeps running until killed */
export async function servePreview(docJson: string, port: number, dir = "out"): Promise<void> {
  const exists = existsSync(join(dir, "index.html")) || readdirDirsSafe(dir).length > 0;
  if (!exists) throw new Error(`no static build at "${dir}" — run "npm run build" first`);
  const { server, url } = await startServer(dir, port);
  const { shareLink } = await import("../lib/share");
  const doc = JSON.parse(docJson);
  const link = await shareLink(doc, url);
  process.stdout.write(`preview: ${link}\n(serve ${dir} on :${port} — Ctrl+C to stop)\n`);
  // keep alive until the process is terminated
  await new Promise<never>(() => {
    server.on("close", () => process.exit(0));
  });
}

function readdirDirsSafe(dir: string): string[] {
  try {
    return readdirDirs(dir);
  } catch {
    return [];
  }
}
