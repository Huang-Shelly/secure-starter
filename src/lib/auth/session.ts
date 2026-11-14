import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { env, isProd } from "@/lib/env";
import { randomToken, sha256Hex } from "@/lib/crypto";
import type { Role } from "@/generated/prisma/client";

/**
 * Session 設計（ASVS V3）：
 * - Cookie 只放 256-bit 隨機 token；資料庫只存 SHA-256，資料庫外洩也無法直接冒用。
 * - HttpOnly + Secure + SameSite=Lax + __Host- 前綴（綁定網域、路徑 /、禁止子網域覆寫）。
 * - 閒置逾時 + 絕對逾時；登出、撤銷全部裝置都立即生效（伺服器端可撤銷）。
 * - 登入成功一律建立新 session（防 session fixation）。
 */
export const SESSION_COOKIE = isProd() ? "__Host-sid" : "sid";

export interface SessionUser {
  sessionId: string;
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

export async function createSession(userId: string, userAgent: string | null): Promise<void> {
  // 先作廢瀏覽器上原本的 session（若有），避免舊 token 在換身分後仍可使用
  const existing = (await cookies()).get(SESSION_COOKIE)?.value;
  if (existing && existing.length <= 128) {
    await db().session.updateMany({
      where: { tokenHash: sha256Hex(existing), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  const token = randomToken(32);
  const now = Date.now();
  const expiresAt = new Date(now + env().SESSION_ABSOLUTE_HOURS * 3600_000);
  await db().session.create({
    data: {
      tokenHash: sha256Hex(token),
      userId,
      expiresAt,
      userAgent: userAgent?.slice(0, 256) ?? null,
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 128) return null;

  const session = await db().session.findUnique({
    where: { tokenHash: sha256Hex(token) },
    include: { user: { select: { id: true, username: true, displayName: true, role: true } } },
  });
  if (!session || session.revokedAt) return null;

  const now = Date.now();
  const idleMs = env().SESSION_IDLE_MINUTES * 60_000;
  if (session.expiresAt.getTime() <= now || session.lastSeenAt.getTime() + idleMs <= now) {
    await db().session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return null;
  }
  // 降低寫入量：超過 1 分鐘才更新最後活動時間
  if (now - session.lastSeenAt.getTime() > 60_000) {
    await db().session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  }
  return { sessionId: session.id, ...session.user };
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db().session.updateMany({
      where: { tokenHash: sha256Hex(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  jar.delete(SESSION_COOKIE);
}

export async function revokeAllSessions(userId: string): Promise<number> {
  const res = await db().session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return res.count;
}
