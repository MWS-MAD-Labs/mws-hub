import { timingSafeEqual } from "node:crypto";
import type { Context, Next } from "hono";
import { ResponseError } from "../error/response-error";

// Guards server-to-server endpoints only a satellite app's own backend
// should be able to call - the same shared secret revokeSessionsForUser
// already sends the other direction (Hub -> satellite), reused here for
// the reverse (satellite -> Hub) since both directions sit in the same
// trust boundary and every satellite app already has this env var deployed.
export async function internalSecretAuthMiddleware(c: Context, next: Next) {
  const expected = process.env.HUB_INTERNAL_SECRET;
  if (!expected) {
    throw new ResponseError(503, "HUB_INTERNAL_SECRET is not configured.");
  }

  const provided = c.req.header("x-hub-internal-secret") || "";
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  const isValid =
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer);

  if (!isValid) {
    throw new ResponseError(401, "Invalid or missing internal secret.");
  }

  await next();
}
