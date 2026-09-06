import { describe, expect, it } from "vitest";
import { isProject, projectFileName } from "./project";
import { newDoc } from "./tokens";

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

  it("names the file after the app", () => {
    const doc = newDoc("en");
    doc.title = "Tea / Timer";
    expect(projectFileName(doc)).toBe("swiftui-canvas Tea Timer.json");
  });
});
