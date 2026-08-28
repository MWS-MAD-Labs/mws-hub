import type { Context } from "hono";
import { ApplicationService, type ApplicationInput } from "../service/application-service";
import { ResponseError } from "../error/response-error";
import type { SessionVariables } from "../type/hono-context";

// Hono types a route param as possibly undefined even when the pattern
// requires it. Failing loudly here beats passing undefined into a lookup
// that would then report "unknown application" for a routing bug.
function requireId(c: Context): string {
  const id = c.req.param("id");
  if (!id) throw new ResponseError(400, "Application id is required.");
  return id;
}

export class ApplicationController {
  static async list(c: Context<{ Variables: SessionVariables }>) {
    return c.json({ data: await ApplicationService.listForAdmin() });
  }

  static async create(c: Context<{ Variables: SessionVariables }>) {
    const body = await c.req.json<ApplicationInput>();
    return c.json({ data: await ApplicationService.create(body) }, 201);
  }

  static async update(c: Context<{ Variables: SessionVariables }>) {
    const body = await c.req.json<ApplicationInput>();
    return c.json({ data: await ApplicationService.update(requireId(c), body) });
  }

  static async remove(c: Context<{ Variables: SessionVariables }>) {
    await ApplicationService.remove(requireId(c));
    return c.json({ data: "Application removed" });
  }
}
