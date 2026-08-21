import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoute } from "./route/auth-route";
import { appsRoute } from "./route/apps-route";
import { ResponseError } from "./error/response-error";
import { logger } from "./lib/logger";
import { hubSsoJwks } from "./lib/sso-relay";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5175",
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
