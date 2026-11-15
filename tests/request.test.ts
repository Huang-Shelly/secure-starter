import { describe, expect, it } from "vitest";
import { clientIp, isSameOrigin } from "@/lib/request";
import { buildCsp } from "@/lib/security-headers";

const ORIGIN = "https://app.example.com";

describe("isSameOrigin (CSRF)", () => {
  it("接受同源 Origin", () => {
    expect(isSameOrigin(new Headers({ origin: ORIGIN }), ORIGIN)).toBe(true);
  });
  it("拒絕跨站 Origin 與相似網域", () => {
    expect(isSameOrigin(new Headers({ origin: "https://evil.com" }), ORIGIN)).toBe(false);
    expect(isSameOrigin(new Headers({ origin: "https://app.example.com.evil.com" }), ORIGIN)).toBe(false);
    expect(isSameOrigin(new Headers({ origin: "null" }), ORIGIN)).toBe(false);
  });
  it("沒有 Origin 時依 Sec-Fetch-Site 判斷，兩者都沒有則拒絕", () => {
    expect(isSameOrigin(new Headers({ "sec-fetch-site": "same-origin" }), ORIGIN)).toBe(true);
    expect(isSameOrigin(new Headers({ "sec-fetch-site": "cross-site" }), ORIGIN)).toBe(false);
    expect(isSameOrigin(new Headers(), ORIGIN)).toBe(false);
  });
});

describe("clientIp", () => {
  it("未設定信任代理時忽略 X-Forwarded-For（防偽造繞過限流）", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4" }), 0)).toBe("unknown");
  });
  it("未設定信任代理時也忽略 X-Real-IP", () => {
    expect(clientIp(new Headers({ "x-real-ip": "1.2.3.4" }), 0)).toBe("unknown");
  });
  it("依信任層數取代理看到的用戶端 IP，忽略攻擊者自填的前段", () => {
    const h = new Headers({ "x-forwarded-for": "6.6.6.6, 1.2.3.4" });
    expect(clientIp(h, 1)).toBe("1.2.3.4");
    expect(clientIp(h, 2)).toBe("6.6.6.6");
    expect(clientIp(new Headers({ "x-forwarded-for": "<script>" }), 1)).toBe("unknown");
  });
});

describe("buildCsp", () => {
  it("正式環境不允許 unsafe-inline / unsafe-eval，並禁止被嵌入", () => {
    const csp = buildCsp("abc", false);
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("'nonce-abc'");
    expect(csp).toContain("object-src 'none'");
  });
});
