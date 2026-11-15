import { secureRoute, json } from "@/lib/route";
import { getSessionUser } from "@/lib/auth/session";

export const GET = secureRoute({ auth: "public", action: "auth.me" }, async () => {
  const user = await getSessionUser();
  if (!user) return json({ user: null });
  return json({ user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role } });
});
