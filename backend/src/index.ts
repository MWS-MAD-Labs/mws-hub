import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoute } from "./route/auth-route";
import { appsRoute } from "./route/apps-route";
import { adminRoute } from "./route/admin-route";
import { ResponseError } from "./error/response-error";
import { logger } from "./lib/logger";
import { frontendOrigin } from "./lib/frontend-origin";
import { hubSsoJwks } from "./lib/sso-relay";

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

app.use(
  "*",
  cors({
    origin: frontendOrigin(),
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ data: "ok" }));
app.get("/.well-known/jwks.json", (c) => {
  c.header("Cache-Control", "public, max-age=300");
  return c.json(hubSsoJwks());
});

app.route("/auth", authRoute);
app.route("/apps", appsRoute);
app.route("/admin", adminRoute);

app.onError((err, c) => {
  if (err instanceof ResponseError) {
    return c.json({ errors: err.message }, err.status as 400);
  }
  logger.error(err);
  return c.json({ errors: "Internal server error" }, 500);
});

const port = Number(process.env.PORT) || 4001;
logger.info(`listening on :${port}`);

export default {
  port,
  fetch: app.fetch,
};
