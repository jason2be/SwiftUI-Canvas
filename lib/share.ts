import type { Doc } from "./tokens";

/* Share links carry the whole document in the URL hash, deflated and
 * base64url-encoded. No server, no database: the design lives in the link.
 * The prefix "#sw=" is SwiftUI-Canvas's own; it must match public/agent.md. */

const PREFIX = "#sw=";

function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function deflate(text: string): Promise<Uint8Array> {
  if (typeof CompressionStream === "undefined") return new TextEncoder().encode(text);
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === "undefined") return new TextDecoder().decode(bytes);
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return await new Response(stream).text();
}

export async function encodeDoc(doc: Doc): Promise<string> {
  const json = JSON.stringify(doc);
  const bytes = await deflate(json);
  return toBase64Url(bytes);
}

export async function decodeDoc(payload: string): Promise<Doc | null> {
  try {
    const bytes = fromBase64Url(payload);
    const json = await inflate(bytes);
    const parsed: unknown = JSON.parse(json);
    const { isProject } = await import("./project");
    return isProject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function shareLink(doc: Doc, base?: string): Promise<string> {
  // Node/CLI callers pass the deployed (or local) URL; in the browser the
  // current location is the default
  const origin = base ?? (typeof location === "undefined" ? "https://jason2be.github.io/SwiftUI-Canvas/" : `${location.origin}${location.pathname}`);
  return `${origin}${PREFIX}${await encodeDoc(doc)}`;
}

export async function readShareLink(): Promise<Doc | null> {
  if (typeof location === "undefined") return null;
  if (!location.hash.startsWith(PREFIX)) return null;
  return decodeDoc(location.hash.slice(PREFIX.length));
}
