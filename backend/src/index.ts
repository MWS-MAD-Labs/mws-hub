import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoute } from "./route/auth-route";
import { appsRoute } from "./route/apps-route";
import { adminRoute } from "./route/admin-route";
import { ssoRoute } from "./route/sso-route";
import { ResponseError } from "./error/response-error";
import { logger } from "./lib/logger";
import { frontendOrigin } from "./lib/frontend-origin";
import { hubSsoJwks } from "./lib/sso-relay";
import { startPermissionSync } from "./lib/permission-sync";
import { hubConfig, refreshOriginAllowed } from "./lib/shared-session";

const app = new Hono();

function loggableLocation(location: string) {
  try {
    const url = new URL(location);
    return `${url.origin}${url.pathname}`;
  } catch {
    return location.split("?")[0];
  }
}

app.use("*", async (c, next) => {
  const startedAt = Date.now();

  try {
    await next();
  } catch (error) {
    const duration = Date.now() - startedAt;
    logger.error(
      `${c.req.method} ${c.req.path} failed after ${duration}ms`,
      error,
    );
    throw error;
  }

  const duration = Date.now() - startedAt;
  const location = c.res.headers.get("location");
  const redirectTarget =
    location && c.res.status >= 300 && c.res.status < 400
      ? ` -> ${loggableLocation(location)}`
      : "";
  logger.info(
    `${c.req.method} ${c.req.path} ${c.res.status} ${duration}ms${redirectTarget}`,
  );
});

// /auth/refresh is called from the apps' pages on other hosts of the parent domain, so it answers for them itself.
app.use("/auth/refresh", async (c, next) => {
  const origin = c.req.header("origin");
  if (refreshOriginAllowed(origin)) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Vary", "Origin");
  }
  if (c.req.method === "OPTIONS") {
    c.header("Access-Control-Allow-Methods", "POST");
    c.header("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
    return c.body(null, 204);
  }
  await next();
});

const hubCors = cors({
  origin: frontendOrigin(),
  credentials: true,
});
app.use("*", (c, next) => (c.req.path === "/auth/refresh" ? next() : hubCors(c, next)));

app.get("/health", (c) => c.json({ data: "ok" }));
app.get("/.well-known/jwks.json", (c) => {
  c.header("Cache-Control", "public, max-age=300");
  return c.json(hubSsoJwks());
});

app.get("/.well-known/hub-config", (c) => {
  c.header("Cache-Control", "public, max-age=300");
  return c.json(hubConfig());
});

app.route("/auth", authRoute);
app.route("/apps", appsRoute);
app.route("/admin", adminRoute);
app.route("/sso", ssoRoute);

app.onError((err, c) => {
  if (err instanceof ResponseError) {
    return c.json({ errors: err.message }, err.status as 400);
  }
  logger.error(err);
  return c.json({ errors: "Internal server error" }, 500);
});

// Not while the tests import the app.
if (process.env.NODE_ENV !== "test") startPermissionSync();
if (process.env.NODE_ENV !== "test" && process.env.CENTRAL_API_TOKEN && !process.env.CENTRAL_ORGANIZATION_ID?.trim()) {
  logger.error("CENTRAL_ORGANIZATION_ID is not set, so Central cannot check which organization this Hub belongs to.");
}

const port = Number(process.env.PORT) || 4001;
logger.info(`listening on :${port}`);

export default {
  port,
  fetch: app.fetch,
};
