import { describe, expect, it } from "vitest";
import { MemoryRateLimitStore, rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("超過上限後拒絕，視窗結束後恢復", async () => {
    const store = new MemoryRateLimitStore();
    const rule = { limit: 3, windowMs: 1000 };
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect((await rateLimit("k", rule, store, t0)).allowed).toBe(true);
    expect((await rateLimit("k", rule, store, t0 + 10)).allowed).toBe(false);
    expect((await rateLimit("k", rule, store, t0 + 1001)).allowed).toBe(true);
  });

  it("不同鍵互不影響", async () => {
    const store = new MemoryRateLimitStore();
    const rule = { limit: 1, windowMs: 1000 };
    expect((await rateLimit("a", rule, store, 0)).allowed).toBe(true);
    expect((await rateLimit("b", rule, store, 0)).allowed).toBe(true);
    expect((await rateLimit("a", rule, store, 1)).allowed).toBe(false);
  });

  it("鍵數量有上限，避免記憶體耗盡", async () => {
    const store = new MemoryRateLimitStore(100);
    const rule = { limit: 1, windowMs: 60_000 };
    for (let i = 0; i < 1000; i++) await rateLimit(`k${i}`, rule, store, 0);
    // @ts-expect-error 測試存取私有欄位
    expect(store.buckets.size).toBeLessThanOrEqual(100);
  });
});
