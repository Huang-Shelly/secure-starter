/**
 * 速率限制（固定視窗 + 滑動近似）。
 *
 * 預設使用記憶體儲存，適合單一執行個體與開發環境。
 * 多執行個體部署時，請實作 RateLimitStore 介面接 Redis / Upstash / Postgres，
 * 否則每台機器各自計數，限制會被放大。
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // epoch ms
}

export interface RateLimitStore {
  hit(key: string, windowMs: number, now: number): Promise<{ count: number; resetAt: number }>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  private readonly maxKeys: number;

  constructor(maxKeys = 50_000) {
    this.maxKeys = maxKeys;
  }

  async hit(key: string, windowMs: number, now: number) {
    let b = this.buckets.get(key);
    if (!b || b.resetAt <= now) {
      if (this.buckets.size >= this.maxKeys) this.sweep(now);
      b = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, b);
    }
    b.count += 1;
    return { count: b.count, resetAt: b.resetAt };
  }

  private sweep(now: number) {
    for (const [k, v] of this.buckets) if (v.resetAt <= now) this.buckets.delete(k);
    // 仍然太大時，丟掉最舊的一半，避免記憶體被灌爆（DoS）
    if (this.buckets.size >= this.maxKeys) {
      let i = 0;
      const half = this.buckets.size / 2;
      for (const k of this.buckets.keys()) {
        if (i++ > half) break;
        this.buckets.delete(k);
      }
    }
  }
}

export interface RateLimitRule {
  /** 視窗內允許的請求數 */
  limit: number;
  /** 視窗長度（毫秒） */
  windowMs: number;
}

let defaultStore: RateLimitStore = new MemoryRateLimitStore();

export function setRateLimitStore(store: RateLimitStore) {
  defaultStore = store;
}

export async function rateLimit(
  key: string,
  rule: RateLimitRule,
  store: RateLimitStore = defaultStore,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  const { count, resetAt } = await store.hit(key, rule.windowMs, now);
  return {
    allowed: count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetAt,
  };
}

/** 常用規則：依端點風險調整 */
export const RATE_LIMITS = {
  auth: { limit: 10, windowMs: 60_000 }, // 登入 / 註冊：每分鐘 10 次
  api: { limit: 120, windowMs: 60_000 }, // 一般 API
  agent: { limit: 20, windowMs: 60_000 }, // AI Agent（成本高）
  sensitive: { limit: 5, windowMs: 60_000 }, // 高風險操作確認
} satisfies Record<string, RateLimitRule>;
