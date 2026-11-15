import { z } from "zod";
import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from "@simplewebauthn/server";
import { secureRoute, json } from "@/lib/route";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { Errors } from "@/lib/http";
import { audit } from "@/lib/audit";
import { createSession } from "@/lib/auth/session";
import { AuthenticationResponseSchema, consumeChallenge, rp } from "@/lib/auth/webauthn";

const Body = z.strictObject({ response: AuthenticationResponseSchema });

export const POST = secureRoute(
  { auth: "public", action: "auth.login_verify", rateLimit: RATE_LIMITS.auth, body: Body },
  async ({ body, req, ip }) => {
    const challenge = await consumeChallenge("login");
    const cred = await db().credential.findUnique({ where: { id: body.response.id } });
    if (!cred) {
      await audit({ action: "auth.login", outcome: "denied", ip, meta: { reason: "unknown_credential" } });
      throw Errors.unauthorized();
    }
    const { rpID, origin } = rp();

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body.response as unknown as AuthenticationResponseJSON,
        expectedChallenge: challenge.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
        credential: {
          id: cred.id,
          publicKey: new Uint8Array(cred.publicKey),
          counter: Number(cred.counter),
          transports: cred.transports as AuthenticatorTransport[],
        },
      });
    } catch {
      await audit({ actorId: cred.userId, action: "auth.login", outcome: "denied", ip, meta: { reason: "verification_error" } });
      throw Errors.unauthorized();
    }
    if (!verification.verified) {
      await audit({ actorId: cred.userId, action: "auth.login", outcome: "denied", ip });
      throw Errors.unauthorized();
    }

    await db().credential.update({
      where: { id: cred.id },
      data: { counter: BigInt(verification.authenticationInfo.newCounter), lastUsedAt: new Date() },
    });
    await createSession(cred.userId, req.headers.get("user-agent"));
    await audit({ actorId: cred.userId, action: "auth.login", outcome: "success", ip });
    return json({ ok: true });
  },
);
