import { secureRoute, json } from "@/lib/route";
import { destroyCurrentSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export const POST = secureRoute({ auth: "public", action: "auth.logout" }, async ({ ip }) => {
  await destroyCurrentSession();
  await audit({ action: "auth.logout", outcome: "success", ip });
  return json({ ok: true });
});
