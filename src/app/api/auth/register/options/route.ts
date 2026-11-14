import { randomUUID } from "node:crypto";
import { z } from "zod";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { secureRoute, json } from "@/lib/route";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { Errors } from "@/lib/http";
import { rp, saveChallenge } from "@/lib/auth/webauthn";

const Body = z.strictObject({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.-]{3,32}$/, "username format"),
  displayName: z.string().trim().min(1).max(100),
});

export const POST = secureRoute(
  { auth: "public", action: "auth.register_options", rateLimit: RATE_LIMITS.auth, body: Body },
  async ({ body }) => {
    const exists = await db().user.findUnique({ where: { username: body.username }, select: { id: true } });
    if (exists) throw Errors.badRequest([{ path: "username", code: "unavailable" }]);

    const { rpID, rpName } = rp();
    const subjectId = randomUUID();
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: body.username,
      userDisplayName: body.displayName,
      userID: new TextEncoder().encode(subjectId),
      attestationType: "none",
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      supportedAlgorithmIDs: [-7, -257],
    });
    await saveChallenge({
      challenge: options.challenge,
      purpose: "register",
      username: body.username,
      displayName: body.displayName,
      subjectId,
    });
    return json(options);
  },
);
