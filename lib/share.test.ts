import { describe, expect, it } from "vitest";
import { newDoc } from "./tokens";
import { decodeDoc, encodeDoc } from "./share";

describe("share codec", () => {
  it("round-trips a document through deflate + base64url", async () => {
    const doc = newDoc("zh");
    doc.title = "茶叶计时器";
    doc.parts.push({
      id: "x1",
      screen: doc.screens[0].id,
      kind: "button",
      x: 16,
      y: 200,
      label: "开始",
      variant: "glassProminent",
    });
    const payload = await encodeDoc(doc);
    expect(payload).not.toContain("+");
    expect(payload).not.toContain("/");
    const back = await decodeDoc(payload);
    expect(back?.title).toBe("茶叶计时器");
    expect(back?.parts).toHaveLength(3);
    expect(back?.parts[2].label).toBe("开始");
  });

  it("rejects corrupt payloads", async () => {
    expect(await decodeDoc("not-a-payload!!!")).toBeNull();
  });
});
