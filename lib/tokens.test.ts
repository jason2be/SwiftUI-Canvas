import { describe, expect, it } from "vitest";
import { KIND_ORDER, KIND_VARIANTS, defaultPart, partSize, type Kind } from "./tokens";
import { isProject } from "./project";

/** every kind must size safely with no part, with its default part, and with
 *  every variant — a bad field reference here crashes the whole canvas */
describe("partSize covers every kind", () => {
  it("works with no part", () => {
    for (const k of KIND_ORDER) {
      const { w, h } = partSize(k);
      expect(Number.isFinite(w)).toBe(true);
      expect(Number.isFinite(h)).toBe(true);
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
    }
  });

  it("works with the default part of every kind", () => {
    for (const k of KIND_ORDER) {
      const p = defaultPart("en", "s", k, 0, 0);
      const { w, h } = partSize(k, p);
      expect(Number.isFinite(w)).toBe(true);
      expect(Number.isFinite(h)).toBe(true);
    }
  });

  it("works with every variant of every kind", () => {
    for (const k of KIND_ORDER) {
      for (const v of KIND_VARIANTS[k]) {
        const p = { ...defaultPart("en", "s", k, 0, 0), variant: v };
        const { w, h } = partSize(k, p);
        expect(Number.isFinite(w)).toBe(true);
        expect(Number.isFinite(h)).toBe(true);
      }
    }
  });

  it("accepts a document holding one default part of every kind", () => {
    const doc = {
      title: "All kinds",
      lang: "en",
      platform: "ios",
      theme: { accent: "systemBlue", scheme: "light", shape: "default", font: "system" },
      screens: [{ id: "s", name: "A", x: 0, y: 0 }],
      parts: KIND_ORDER.map((k) => defaultPart("en", "s", k as Kind, 16, 100 + 70 * KIND_ORDER.indexOf(k))),
    };
    expect(isProject(doc)).toBe(true);
  });
});
