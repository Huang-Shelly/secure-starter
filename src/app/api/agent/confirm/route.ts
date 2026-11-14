import { z } from "zod";
import { secureRoute, json } from "@/lib/route";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { Errors } from "@/lib/http";
import { audit } from "@/lib/audit";
import { hasPermission } from "@/lib/authz";
import { defaultRegistry } from "@/lib/agent/builtin-tools";

const Body = z.strictObject({ id: z.uuid(), decision: z.enum(["approve", "reject"]) });

/**
 * 人工確認高風險操作（Human-in-the-loop）。
 * - 只能確認自己的待確認請求（userId 條件 → 防 IDOR）。
 * - 以條件式更新把 pending → approved/rejected，保證只執行一次（防重放與競態）。
 * - 執行前重新驗證輸入與權限，不信任當初模型產生時的狀態。
 */
export const POST = secureRoute(
  { auth: "required", permission: "agent:confirm", action: "agent.confirm", rateLimit: RATE_LIMITS.sensitive, body: Body },
  async ({ user, body, ip }) => {
    const now = new Date();
    const status = body.decision === "approve" ? "approved" : "rejected";
    const claimed = await db().pendingAction.updateMany({
      where: { id: body.id, userId: user.id, status: "pending", expiresAt: { gt: now } },
      data: { status, decidedAt: now },
    });
    if (claimed.count !== 1) throw Errors.notFound();

    if (body.decision === "reject") {
      await audit({ actorId: user.id, action: "agent.confirm", target: body.id, outcome: "success", ip, meta: { decision: "reject" } });
      return json({ ok: true, executed: false });
    }

    const action = await db().pendingAction.findFirstOrThrow({ where: { id: body.id, userId: user.id } });
    const tool = defaultRegistry().get(action.toolName);
    if (!tool || !hasPermission(user, tool.permission)) {
      await audit({ actorId: user.id, action: "agent.confirm", target: body.id, outcome: "denied", ip });
      throw Errors.forbidden();
    }
    const parsed = tool.input.safeParse(action.input);
    if (!parsed.success) throw Errors.badRequest();

    try {
      const output = await tool.run({ userId: user.id, role: user.role }, parsed.data);
      await audit({ actorId: user.id, action: "agent.confirm", target: body.id, outcome: "success", ip, meta: { tool: tool.name } });
      return json({ ok: true, executed: true, result: output.slice(0, 2_000) });
    } catch {
      await audit({ actorId: user.id, action: "agent.confirm", target: body.id, outcome: "error", ip, meta: { tool: tool.name } });
      throw Errors.unavailable();
    }
  },
);
