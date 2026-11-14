import { z } from "zod";
import { secureRoute, json } from "@/lib/route";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { Errors } from "@/lib/http";
import { audit } from "@/lib/audit";
import { runAgent } from "@/lib/agent/runner";
import { agentLlm } from "@/lib/agent/server";
import { defaultRegistry, prismaPendingSink } from "@/lib/agent/builtin-tools";

const Body = z.strictObject({ message: z.string().trim().min(1).max(4_000) });

export const POST = secureRoute(
  { auth: "required", permission: "agent:run", action: "agent.run", rateLimit: RATE_LIMITS.agent, body: Body },
  async ({ user, body, ip }) => {
    const llm = agentLlm();
    if (!llm) throw Errors.unavailable();

    const result = await runAgent({
      llm,
      registry: defaultRegistry(),
      ctx: { userId: user.id, role: user.role },
      userMessage: body.message,
      pending: prismaPendingSink,
      audit: (ev) => audit({ ...ev, actorId: user.id, ip }),
    });
    await audit({
      actorId: user.id,
      action: "agent.run",
      outcome: "success",
      ip,
      meta: { toolCalls: result.toolCalls, stopReason: result.stopReason, pending: result.pendingActions.length },
    });
    return json({ reply: result.reply, pendingActions: result.pendingActions });
  },
);
