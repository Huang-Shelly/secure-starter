import { z } from "zod";
import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { secureRoute, json } from "@/lib/route";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { Errors } from "@/lib/http";
import { audit } from "@/lib/audit";
import { createSession } from "@/lib/auth/session";
import { RegistrationResponseSchema, consumeChallenge, rp } from "@/lib/auth/webauthn";

const Body = z.strictObject({ response: RegistrationResponseSchema });

export const POST = secureRoute(
  { auth: "public", action: "auth.register_verify", rateLimit: RATE_LIMITS.auth, body: Body },
  async ({ body, req, ip }) => {
    const challenge = await consumeChallenge("register");
    if (!challenge.username || !challenge.subjectId || !challenge.displayName) throw Errors.badRequest();
    const { rpID, origin } = rp();

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body.response as unknown as RegistrationResponseJSON,
        expectedChallenge: challenge.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });
    } catch {
      await audit({ action: "auth.register", outcome: "denied", ip, meta: { reason: "verification_error" } });
      throw Errors.badRequest();
    }
    if (!verification.verified || !verification.registrationInfo) {
      await audit({ action: "auth.register", outcome: "denied", ip });
      throw Errors.badRequest();
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const userId = challenge.subjectId;
    try {
      await db().$transaction([
        db().user.create({ data: { id: userId, username: challenge.username, displayName: challenge.displayName } }),
        db().credential.create({
          data: {
            id: credential.id,
            userId,
            publicKey: Buffer.from(credential.publicKey),
            counter: BigInt(credential.counter),
            transports: credential.transports ?? [],
            deviceType: credentialDeviceType,
            backedUp: credentialBackedUp,
          },
        }),
      ]);
    } catch {
      // 例如帳號名稱在這段期間被註冊走了
      throw Errors.badRequest([{ path: "username", code: "unavailable" }]);
    }

    await createSession(userId, req.headers.get("user-agent"));
    await audit({ actorId: userId, action: "auth.register", outcome: "success", ip });
    return json({ ok: true });
  },
);
