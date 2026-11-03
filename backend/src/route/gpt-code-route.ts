import { Hono } from "hono";
import { GptCodeUserController } from "../controller/gpt-code-user-controller";
import { sessionAuthMiddleware } from "../middleware/session-auth-middleware";
import type { SessionVariables } from "../type/hono-context";

export const gptCodeRoute = new Hono<{ Variables: SessionVariables }>();

gptCodeRoute.use("*", sessionAuthMiddleware);
gptCodeRoute.get("/account", GptCodeUserController.account);
gptCodeRoute.post("/code", GptCodeUserController.code);
