import { secureRoute, json } from "@/lib/route";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { revokeAllSessions } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

/** 登出所有裝置（帳號疑似遭盜用時使用） */
export const POST = secureRoute(
  { auth: "required", permission: "session:revoke_all", action: "auth.revoke_all", rateLimit: RATE_LIMITS.sensitive },
  async ({ user, ip }) => {
    const count = await revokeAllSessions(user.id);
    await audit({ actorId: user.id, action: "auth.revoke_all", outcome: "success", ip, meta: { count } });
    return json({ ok: true });
  },
);
