import { describe, expect, it } from "vitest";
import { containsNul } from "@/lib/validation";

describe("containsNul", () => {
  it("偵測字串、陣列、物件鍵值中的 NUL 字元", () => {
    expect(containsNul("a\u0000b")).toBe(true);
    expect(containsNul({ a: ["x", "y\u0000"] })).toBe(true);
    expect(containsNul({ ["k\u0000"]: 1 })).toBe(true);
    expect(containsNul({ title: "正常", body: "" })).toBe(false);
  });

  it("過深的巢狀結構視為不合法", () => {
    let v: unknown = "x";
    for (let i = 0; i < 40; i++) v = [v];
    expect(containsNul(v)).toBe(true);
  });
});
