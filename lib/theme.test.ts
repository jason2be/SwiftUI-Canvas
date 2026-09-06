import { describe, expect, it } from "vitest";
import { accentHex, paletteOf } from "./theme";
import { newDoc } from "./tokens";

describe("accentHex", () => {
  it("passes valid hex through (lowercased)", () => {
    expect(accentHex({ ...newDoc("en").theme, accent: "#00C7BE" })).toBe("#00c7be");
  });

  it("expands shorthand hex", () => {
    expect(accentHex({ ...newDoc("en").theme, accent: "#0af" })).toBe("#00aaff");
  });

  it("falls back to systemBlue on junk instead of yielding NaN", () => {
    expect(accentHex({ ...newDoc("en").theme, accent: "#zzz" })).toBe("#007AFF");
    expect(accentHex({ ...newDoc("en").theme, accent: "probably-a-color" })).toBe("#007AFF");
    expect(accentHex({ ...newDoc("en").theme, accent: "#12345" })).toBe("#007AFF");
  });

  it("resolves system color names per scheme", () => {
    const theme = { ...newDoc("en").theme, accent: "systemBlue" };
    expect(accentHex({ ...theme, scheme: "light" })).toBe("#007AFF");
    expect(accentHex({ ...theme, scheme: "dark" })).toBe("#0A84FF");
  });
});

describe("paletteOf", () => {
  it("keeps readable text on a light accent", () => {
    const pal = paletteOf({ ...newDoc("en").theme, accent: "#FFFF00" });
    expect(pal.accentText).toBe("#000000");
  });
});
