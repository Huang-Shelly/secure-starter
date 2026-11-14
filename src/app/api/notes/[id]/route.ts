import { z } from "zod";
import { secureRoute, json } from "@/lib/route";
import { db } from "@/lib/db";
import { ownedBy } from "@/lib/authz";
import { Errors } from "@/lib/http";
import { audit } from "@/lib/audit";
import { RATE_LIMITS } from "@/lib/rate-limit";

const Params = z.object({ id: z.uuid() });

export const GET = secureRoute(
  { auth: "required", permission: "note:read", action: "note.read", params: Params },
  async ({ user, params }) => {
    // IDOR 防護：id 與 ownerId 同時作為條件；別人的筆記一律 404
    const note = await db().note.findFirst({
      where: ownedBy(user, { id: params.id }),
      select: { id: true, title: true, body: true, updatedAt: true },
    });
    if (!note) throw Errors.notFound();
    return json({ note });
  },
);

export const DELETE = secureRoute(
  { auth: "required", permission: "note:delete", action: "note.delete", params: Params, rateLimit: RATE_LIMITS.sensitive },
  async ({ user, params, ip }) => {
    const res = await db().note.deleteMany({ where: ownedBy(user, { id: params.id }) });
    if (res.count === 0) {
      await audit({ actorId: user.id, action: "note.delete", target: params.id, outcome: "denied", ip });
      throw Errors.notFound();
    }
    await audit({ actorId: user.id, action: "note.delete", target: params.id, outcome: "success", ip });
    return json({ ok: true });
  },
);
