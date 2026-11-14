import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { secureRoute, json } from "@/lib/route";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { rp, saveChallenge } from "@/lib/auth/webauthn";

export const POST = secureRoute(
  { auth: "public", action: "auth.login_options", rateLimit: RATE_LIMITS.auth },
  async () => {
    const { rpID } = rp();
    // allowCredentials 留空 → 使用可探索憑證，不需要先輸入帳號（也不會洩露帳號是否存在）
    const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
    await saveChallenge({ challenge: options.challenge, purpose: "login" });
    return json(options);
  },
);
