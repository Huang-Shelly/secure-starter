import { z } from "zod";
import { secureRoute, json } from "@/lib/route";
import { db } from "@/lib/db";
import { ownedBy } from "@/lib/authz";
import { audit } from "@/lib/audit";

/** 範例：受保護的 CRUD API。查詢永遠以登入使用者的 ownerId 範圍化。 */
export const GET = secureRoute({ auth: "required", permission: "note:read", action: "note.list" }, async ({ user }) => {
  const notes = await db().note.findMany({
    where: ownedBy(user),
    select: { id: true, title: true, body: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return json({ notes });
});

const CreateNote = z.strictObject({
  title: z.string().trim().min(1).max(200),
  body: z.string().max(10_000),
});

export const POST = secureRoute(
  { auth: "required", permission: "note:create", action: "note.create", body: CreateNote },
  async ({ user, body, ip }) => {
    // ownerId 來自 session，不接受用戶端傳入（strictObject 會拒絕多餘欄位）
    const note = await db().note.create({
      data: { ownerId: user.id, title: body.title, body: body.body },
      select: { id: true, title: true, body: true, updatedAt: true },
    });
    await audit({ actorId: user.id, action: "note.create", target: note.id, outcome: "success", ip });
    return json({ note }, { status: 201 });
  },
);
