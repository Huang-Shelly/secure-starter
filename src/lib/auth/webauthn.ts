import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { env, isProd } from "@/lib/env";
import { Errors } from "@/lib/http";

/**
 * Passkey（WebAuthn）設定：
 * - 要求 user verification（生物辨識 / PIN），等同多因素。
 * - 可探索憑證（discoverable credential），登入免輸入帳號。
 * - challenge 存在伺服器端、一次性、5 分鐘過期，並綁定 HttpOnly cookie。
 */
export const CHALLENGE_COOKIE = isProd() ? "__Host-wa" : "wa";
const CHALLENGE_TTL_MS = 5 * 60_000;

export function rp() {
  const cfg = env();
  return { rpID: cfg.WEBAUTHN_RP_ID, rpName: cfg.WEBAUTHN_RP_NAME, origin: cfg.APP_ORIGIN };
}

export async function saveChallenge(data: {
  challenge: string;
  purpose: "register" | "login";
  username?: string;
  displayName?: string;
  subjectId?: string;
}): Promise<void> {
  const row = await db().authChallenge.create({
    data: { ...data, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) },
    select: { id: true },
  });
  const jar = await cookies();
  jar.set(CHALLENGE_COOKIE, row.id, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "strict",
    path: "/",
    maxAge: CHALLENGE_TTL_MS / 1000,
  });
  // 順手清掉過期 challenge
  await db().authChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

/** 取出並立即刪除 challenge（一次性，防重放） */
export async function consumeChallenge(purpose: "register" | "login") {
  const jar = await cookies();
  const id = jar.get(CHALLENGE_COOKIE)?.value;
  jar.delete(CHALLENGE_COOKIE);
  if (!id || !z.uuid().safeParse(id).success) throw Errors.badRequest();
  const rows = await db().authChallenge.findMany({ where: { id }, take: 1 });
  const row = rows[0];
  const deleted = await db().authChallenge.deleteMany({ where: { id } });
  if (!row || deleted.count !== 1 || row.purpose !== purpose || row.expiresAt.getTime() < Date.now()) {
    throw Errors.badRequest();
  }
  return row;
}

/** 瀏覽器回傳的 WebAuthn 回應：只做外型與大小檢查，密碼學驗證交給 @simplewebauthn/server */
const b64url = z.string().regex(/^[A-Za-z0-9_-]+$/).max(4096);
export const RegistrationResponseSchema = z.object({
  id: b64url,
  rawId: b64url,
  type: z.literal("public-key"),
  response: z.looseObject({
    clientDataJSON: b64url,
    attestationObject: z.string().max(16_384),
    transports: z.array(z.string().max(32)).max(10).optional(),
  }),
  clientExtensionResults: z.record(z.string(), z.unknown()),
  authenticatorAttachment: z.string().max(32).optional(),
});

export const AuthenticationResponseSchema = z.object({
  id: b64url,
  rawId: b64url,
  type: z.literal("public-key"),
  response: z.looseObject({
    clientDataJSON: b64url,
    authenticatorData: b64url,
    signature: b64url,
    userHandle: b64url.optional(),
  }),
  clientExtensionResults: z.record(z.string(), z.unknown()),
  authenticatorAttachment: z.string().max(32).optional(),
});
