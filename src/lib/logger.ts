import { redactObject } from "@/lib/redact";

type Level = "debug" | "info" | "warn" | "error";

/**
 * 結構化 JSON 日誌（輸出到 stdout，交給平台收集與告警）。
 * 所有欄位都會經過 redactObject，避免記錄密碼、token、個資。
 */
function write(level: Level, event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...(redactObject(fields) as Record<string, unknown>),
  });
  if (level === "error" || level === "warn") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

export const logger = {
  debug: (event: string, fields?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") write("debug", event, fields);
  },
  info: (event: string, fields?: Record<string, unknown>) => write("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => write("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => write("error", event, fields),
  /** 安全事件：統一 event 前綴，方便在日誌平台設定告警規則 */
  security: (event: string, fields?: Record<string, unknown>) => write("warn", `security.${event}`, fields),
};
