import { GoogleAuth } from "../lib/google-auth";
import { resolveCentralIdentity } from "../lib/central-client";
import { createSession } from "../lib/session";
import { enforceHubAccessOnLogin } from "../lib/hub-access-gate";
import { ResponseError } from "../error/response-error";
import type { HubUser } from "../type/central-type";
import type { DeviceMetadata } from "../lib/device-session";

export class AuthService {
  static async loginWithGoogle(code: string, device?: DeviceMetadata): Promise<{
    token: string;
    user: HubUser;
    sessionId: string;
    sessionVersion: number;
  }> {
    const payload = await GoogleAuth.verifyCode(code);
    if (!payload) {
      throw new ResponseError(401, "Google sign-in failed.");
    }

    const allowedDomain = process.env.ALLOWED_DOMAIN;
    if (allowedDomain && !payload.email.endsWith(`@${allowedDomain}`)) {
      throw new ResponseError(403, `Only @${allowedDomain} accounts can sign in.`);
    }

    const centralUser = await resolveCentralIdentity(payload.email);
    if (!centralUser) {
      throw new ResponseError(
        404,
        "This account isn't registered in the Central database yet.",
      );
    }

    const user =
      (centralUser.source === "employee" || centralUser.source === "intern") &&
      !centralUser.avatar_url &&
      !centralUser.photo_url &&
      payload.avatar_url
        ? { ...centralUser, avatar_url: payload.avatar_url }
        : centralUser;

    // Before a session exists, so a refused person never ends anyone else's session.
    await enforceHubAccessOnLogin(user);

    const session = await createSession(user, device);
    return {
      token: session.token,
      user,
      sessionId: session.sessionId,
      sessionVersion: session.sessionVersion,
    };
  }
}
