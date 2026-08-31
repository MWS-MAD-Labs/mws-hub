import type { Context } from "hono";
import { ApplicationService, type ApplicationInput } from "../service/application-service";
import { recordAuditLog } from "../service/audit-log-service";
import { ResponseError } from "../error/response-error";
import type { SessionVariables } from "../type/hono-context";
import type { Application } from "../generated/prisma/client";

// Hono types a route param as possibly undefined even when the pattern
// requires it. Failing loudly here beats passing undefined into a lookup
// that would then report "unknown application" for a routing bug.
function requireId(c: Context): string {
  const id = c.req.param("id");
  if (!id) throw new ResponseError(400, "Application id is required.");
  return id;
}

function applicationMetadata(application: Application) {
  return {
    id: application.id,
    name: application.name,
    status: application.status,
    discoverable: application.discoverable,
    category: application.category,
    href: application.href,
    sso_app_id: application.sso_app_id,
    allowed_sources: application.allowed_sources,
  };
}

export class ApplicationController {
  static async list(c: Context<{ Variables: SessionVariables }>) {
    return c.json({ data: await ApplicationService.listForAdmin() });
  }

  static async get(c: Context<{ Variables: SessionVariables }>) {
    return c.json({ data: await ApplicationService.getForAdmin(requireId(c)) });
  }

  static async create(c: Context<{ Variables: SessionVariables }>) {
    const body = await c.req.json<ApplicationInput>();
    const application = await ApplicationService.create(body);
    await recordAuditLog({
      actor: c.var.user,
      action: "application.create",
      entity: { type: "application", id: application.id },
      summary: `Created application ${application.name}`,
      metadata: { application: applicationMetadata(application) },
    });
    return c.json({ data: application }, 201);
  }

  static async update(c: Context<{ Variables: SessionVariables }>) {
    const body = await c.req.json<ApplicationInput>();
    const application = await ApplicationService.update(requireId(c), body);
    await recordAuditLog({
      actor: c.var.user,
      action: "application.update",
      entity: { type: "application", id: application.id },
      summary: `Updated application ${application.name}`,
      metadata: { application: applicationMetadata(application) },
    });
    return c.json({ data: application });
  }

  static async remove(c: Context<{ Variables: SessionVariables }>) {
    const id = requireId(c);
    const application = await ApplicationService.getForAdmin(id);
    await ApplicationService.remove(id);
    await recordAuditLog({
      actor: c.var.user,
      action: "application.delete",
      entity: { type: "application", id },
      summary: `Removed application ${application.name}`,
      metadata: { application: applicationMetadata(application) },
    });
    return c.json({ data: "Application removed" });
  }
}
