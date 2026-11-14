import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { redactObject } from "@/lib/redact";
import type { Prisma } from "@/generated/prisma/client";

export type AuditOutcome = "success" | "denied" | "error";

export interface AuditEvent {
  actorId?: string | null;
  action: string;
  target?: string | null;
  outcome: AuditOutcome;
  ip?: string | null;
  meta?: Record<string, unknown>;
}

/**
 * 稽核日誌：寫入資料庫（可查詢、可保存）並同步輸出到結構化日誌。
 * 寫入失敗不影響主要流程，但會記錄錯誤供告警。
 */
export async function audit(ev: AuditEvent): Promise<void> {
  const meta = ev.meta ? (redactObject(ev.meta) as Prisma.InputJsonValue) : undefined;
  logger.info("audit", { ...ev, meta });
  if (ev.outcome === "denied") logger.security(ev.action, { actorId: ev.actorId, target: ev.target, ip: ev.ip });
  try {
    await db().auditLog.create({
      data: {
        actorId: ev.actorId ?? null,
        action: ev.action,
        target: ev.target ?? null,
        outcome: ev.outcome,
        ip: ev.ip ?? null,
        meta,
      },
    });
  } catch (err) {
    logger.error("audit.write_failed", { action: ev.action, err: String(err) });
  }
}
