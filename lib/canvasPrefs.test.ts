import { describe, expect, it } from "vitest";
import { loadCanvasPrefs, saveCanvasPrefs, normalizeCanvasPrefs, DEFAULT_PREFS } from "./canvasPrefs";

function fakeStore(initial: Record<string, string> = {}): { get: (k: string) => string | null; set: (k: string, v: string) => void; data: Map<string, string> } & Pick<Storage, "getItem" | "setItem"> {
  const data = new Map(Object.entries(initial));
  return {
    data,
    get: (k) => data.get(k) ?? null,
    set: (k, v) => void data.set(k, v),
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

describe("normalizeCanvasPrefs", () => {
  it("falls back to defaults on junk", () => {
    expect(normalizeCanvasPrefs(null)).toEqual(DEFAULT_PREFS);
    expect(normalizeCanvasPrefs("x")).toEqual(DEFAULT_PREFS);
    expect(normalizeCanvasPrefs({ bg: "blue", backdrop: "yes" })).toEqual(DEFAULT_PREFS);
  });
  it("keeps valid values and coerces the rest", () => {
    expect(normalizeCanvasPrefs({ bg: "light", backdrop: true })).toEqual({ bg: "light", backdrop: true });
    expect(normalizeCanvasPrefs({ bg: "light" })).toEqual({ bg: "light", backdrop: false });
  });
});

describe("load/save roundtrip", () => {
  it("returns defaults when nothing is stored or storage is missing", () => {
    expect(loadCanvasPrefs(null)).toEqual(DEFAULT_PREFS);
    expect(loadCanvasPrefs(fakeStore())).toEqual(DEFAULT_PREFS);
  });
  it("survives corrupt json", () => {
    const store = fakeStore({ "swiftui-canvas.canvas.v1": "{not json" });
    expect(loadCanvasPrefs(store)).toEqual(DEFAULT_PREFS);
  });
  it("persists and reads back", () => {
    const store = fakeStore();
    saveCanvasPrefs({ bg: "light", backdrop: true }, store);
    expect(loadCanvasPrefs(store)).toEqual({ bg: "light", backdrop: true });
  });
  it("save failures are silent", () => {
    const throwing = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    expect(() => saveCanvasPrefs(DEFAULT_PREFS, throwing)).not.toThrow();
  });
});
