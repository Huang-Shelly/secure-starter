import "server-only";
import { z } from "zod";

/**
 * 伺服器端環境變數：啟動時以 schema 驗證，缺少或格式錯誤就直接失敗（fail closed）。
 * 祕密只從環境變數 / Secret Manager 注入，絕不寫進程式碼或 repo。
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // 網站對外來源，例如 https://app.example.com（用於 CSRF Origin 檢查與 WebAuthn）
  APP_ORIGIN: z.url(),
  // WebAuthn Relying Party ID，通常是網域本身，例如 app.example.com
  WEBAUTHN_RP_ID: z.string().min(1),
  WEBAUTHN_RP_NAME: z.string().min(1).default("Secure Starter"),
  SESSION_IDLE_MINUTES: z.coerce.number().int().min(5).max(240).default(30),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().int().min(1).max(72).default(12),
  // 選用：沒設定時 AI Agent 端點會回 503
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  AGENT_MODEL: z.string().min(1).default("claude-opus-5-5"),
  // 信任的反向代理層數（決定是否採用 X-Forwarded-For）；0 = 不信任
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  // 只供 DAST / 模糊測試環境放寬速率限制用；正式環境必須維持 1
  RATE_LIMIT_SCALE: z.coerce.number().int().min(1).max(1000).default(1),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // 只列出欄位名稱，不印出值，避免祕密進入日誌
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid server environment configuration: ${fields}`);
  }
  if (parsed.data.NODE_ENV === "production" && !parsed.data.APP_ORIGIN.startsWith("https://")) {
    throw new Error("APP_ORIGIN must use https in production");
  }
  if (parsed.data.RATE_LIMIT_SCALE > 1) {
    process.stderr.write(
      JSON.stringify({ level: "warn", event: "security.rate_limit_scaled", scale: parsed.data.RATE_LIMIT_SCALE }) + "\n",
    );
  }
  cached = parsed.data;
  return cached;
}

export const isProd = () => process.env.NODE_ENV === "production";
