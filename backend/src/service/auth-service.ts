import { GoogleAuth } from "../lib/google-auth";
import { resolveCentralIdentity } from "../lib/central-client";
import { signSession } from "../lib/session";
import { revokeSessionsForUser } from "../lib/session-revocation";
import { ResponseError } from "../error/response-error";
import type { HubUser } from "../type/central-type";

export class AuthService {
  static async loginWithGoogle(code: string): Promise<{ token: string; user: HubUser }> {
    const payload = await GoogleAuth.verifyCode(code);
    if (!payload) {
      throw new ResponseError(401, "Google sign-in failed.");
    }

    const allowedDomain = process.env.ALLOWED_DOMAIN;
    if (allowedDomain && !payload.email.endsWith(`@${allowedDomain}`)) {
      throw new ResponseError(403, `Only @${allowedDomain} accounts can sign in.`);
    }

    const user = await resolveCentralIdentity(payload.email);
    if (!user) {
      throw new ResponseError(
        404,
        "This account isn't registered in the Central database yet.",
      );
    }

    const token = await signSession(user);
    // Single-session policy: a fresh login here also ends this person's
    // other active sessions in every connected app, not just Hub's own
    // (signSession above already did the Hub half via session_version).
    await revokeSessionsForUser(user.email);
    return { token, user };
  }
}
