import { secureRoute, json } from "@/lib/route";
import { db } from "@/lib/db";

export const GET = secureRoute(
  { auth: "required", permission: "agent:confirm", action: "agent.pending_list" },
  async ({ user }) => {
    const items = await db().pendingAction.findMany({
      where: { userId: user.id, status: "pending", expiresAt: { gt: new Date() } },
      select: { id: true, toolName: true, summary: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return json({ items });
  },
);
