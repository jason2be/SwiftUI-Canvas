import { describe, expect, it } from "vitest";
import { isProject, projectFileName } from "./project";
import { newDoc, type Doc } from "./tokens";

describe("project files", () => {
  it("accepts the document the editor produces", () => {
    expect(isProject(newDoc("en"))).toBe(true);
  });

  it("rejects junk and wrong shapes", () => {
    expect(isProject(null)).toBe(false);
    expect(isProject({})).toBe(false);
    expect(isProject({ screens: [], parts: [] })).toBe(false);
    expect(isProject({ ...newDoc("en"), parts: [{ id: "x", screen: "s", kind: "notAKind", x: 0, y: 0, label: "", variant: "plain" }] })).toBe(false);
  });

  it("rejects a variant that the kind does not support (would crash SwiftPart)", () => {
    const bad: Doc = JSON.parse(JSON.stringify(newDoc("en")));
    const nav = bad.parts.find((p) => p.kind === "navBar")!;
    nav.variant = "filled" as never; // hostile input: a valid-looking but unsupported variant
    expect(isProject(bad)).toBe(false);
  });

  it("rejects a malformed link (would crash buildPrompt)", () => {
    const bad: Doc = JSON.parse(JSON.stringify(newDoc("en")));
    bad.parts[0].link = { target: 123 } as never;
    expect(isProject(bad)).toBe(false);
  });

  it("rejects non-finite coordinates and non-positive sizes", () => {
    const withNaN: Doc = JSON.parse(JSON.stringify(newDoc("en")));
    withNaN.parts[0].x = NaN;
    expect(isProject(withNaN)).toBe(false);
    const withZeroW: Doc = JSON.parse(JSON.stringify(newDoc("en")));
    withZeroW.parts[0].w = 0;
    expect(isProject(withZeroW)).toBe(false);
  });

  it("accepts a link with a known transition and rejects an unknown one", () => {
    const ok: Doc = JSON.parse(JSON.stringify(newDoc("en")));
    ok.parts[0].link = { target: "detail", transition: "push" };
    expect(isProject(ok)).toBe(true);
    const bad: Doc = JSON.parse(JSON.stringify(newDoc("en")));
    bad.parts[0].link = { target: "detail", transition: "explode" as never };
    expect(isProject(bad)).toBe(false);
  });

  it("names the file after the app", () => {
    const doc = newDoc("en");
    doc.title = "Tea / Timer";
    expect(projectFileName(doc)).toBe("swiftui-canvas Tea Timer.json");
  });
});
