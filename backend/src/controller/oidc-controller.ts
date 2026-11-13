import type { Context } from "hono";
import { resolveCentralIdentityById } from "../lib/central-client";
import { frontendOrigin } from "../lib/frontend-origin";
import { logger } from "../lib/logger";
import {
  authenticateClient,
  authorizeErrorRedirect,
  codeStoreAppId,
  issueTokens,
  oidcDiscovery,
  packPendingAuthorization,
  pkceMatches,
  readClientCredentials,
  unpackPendingAuthorization,
  validateAuthorizeRequest,
  type OidcClient,
} from "../lib/oidc-provider";
import { consumeSsoCode, createSsoCode } from "../lib/sso-code-store";
import { AppsService } from "../service/apps-service";
import { recordAuditLog } from "../service/audit-log-service";
import type { HubUser } from "../type/central-type";
import type { SessionVariables } from "../type/hono-context";

// Same landing as a refused card launch (see AppsController.launch): a page a
// person can read on Hub, rather than a bare OIDC error code on the relying
// party's own error screen.
function refuse(c: Context, code: string, appName?: string) {
  const params = new URLSearchParams({ error: code });
  if (appName) params.set("app", appName);
  return c.redirect(`${frontendOrigin()}/support-hub?${params}`, 302);
}

async function audit(actor: HubUser, client: OidcClient, outcome: string) {
  await recordAuditLog({
    actor,
    action: "application.oidc_login",
    entity: { type: "application", id: client.appId },
    summary: `${actor.email} signed in to ${client.name ?? client.clientId} through Hub OIDC: ${outcome}`,
    metadata: { application_id: client.appId, client_id: client.clientId, outcome },
  });
}

function tokenError(c: Context, status: 400 | 401, error: string, description: string) {
  c.header("Cache-Control", "no-store");
  c.header("Pragma", "no-cache");
  return c.json({ error, error_description: description }, status);
}

export class OidcController {
  static discovery(c: Context) {
    c.header("Cache-Control", "public, max-age=300");
    return c.json(oidcDiscovery());
  }

  // Reached signed in only (see oidcSessionAuthMiddleware in sso-route.ts):
  // a signed-out person was already sent through Hub's login and back here.
  static async authorize(c: Context<{ Variables: SessionVariables }>) {
    const validation = validateAuthorizeRequest(new URL(c.req.url).searchParams);
    if (!validation.ok) {
      if (validation.fatal) {
        logger.info(`OIDC authorize refused: ${validation.message}`);
        return c.text(`Sign-in request rejected: ${validation.message}`, 400);
      }
      return c.redirect(
        authorizeErrorRedirect(validation.redirectUri, validation.error, validation.description, validation.state),
        302,
      );
    }
    const { request } = validation;
    const { client } = request;

    // The session is a snapshot from sign-in; handing another application a
    // credential deserves a fresh answer from Central, exactly as a card
    // launch does. Re-resolved by id, never by the (editable) email.
    let user: HubUser | null;
    try {
      user = await resolveCentralIdentityById(c.var.user.id, c.var.user.source);
    } catch (error) {
      logger.error("Central lookup failed during OIDC authorize:", error);
      await audit(c.var.user, client, "central_unavailable");
      return refuse(c, "central_unavailable");
    }
    if (!user) {
      await audit(c.var.user, client, "account_inactive");
      return refuse(c, "account_inactive");
    }

    // The card's own verdict, from the same list the Hub home page shows:
    // whoever cannot open the card on Hub cannot sign in here either.
    let card;
    try {
      card = (await AppsService.listFor(user)).find(
        (entry) => entry.id === client.appId || entry.ssoAppId === client.appId,
      );
    } catch (error) {
      logger.error("Catalog lookup failed during OIDC authorize:", error);
      await audit(user, client, "central_unavailable");
      return refuse(c, "central_unavailable");
    }
    const appName = card?.name ?? client.name;
    if (!card || card.access !== "granted") {
      await audit(user, client, "access_denied");
      return refuse(c, "app_access_denied", appName);
    }
    if (card.status === "maintenance") {
      await audit(user, client, "maintenance");
      return refuse(c, "app_maintenance", appName);
    }
    if (card.status === "coming_soon") {
      await audit(user, client, "coming_soon");
      return refuse(c, "app_coming_soon", appName);
    }

    const claims = {
      // Central's Person.id, the same subject a relay token carries. Email
      // is a contact attribute only: it is editable in Central.
      sub: user.person_id,
      email: user.email,
      email_verified: true as const,
      name: user.full_name || user.email,
      groups: AppsService.accessTagsFor(user),
    };
    const code = await createSsoCode(packPendingAuthorization(request, claims), codeStoreAppId(client.clientId));

    await audit(user, client, "code_issued");
    const target = new URL(request.redirectUri);
    target.searchParams.set("code", code);
    if (request.state !== null) target.searchParams.set("state", request.state);
    return c.redirect(target.toString(), 302);
  }

  // Server to server: the relying party's backend trades the code for the id_token.
  static async token(c: Context) {
    const body = await c.req.parseBody().catch(() => null);
    if (!body) return tokenError(c, 400, "invalid_request", "Send the request as application/x-www-form-urlencoded.");

    const credentials = readClientCredentials(c.req.header("authorization"), body);
    if ("error" in credentials) {
      return tokenError(c, 401, "invalid_client", credentials.error);
    }
    const client = authenticateClient(credentials);
    if (!client) {
      logger.info(`OIDC token refused: bad credentials for client "${credentials.clientId}"`);
      if (credentials.via === "basic") c.header("WWW-Authenticate", 'Basic realm="mws-hub"');
      return tokenError(c, 401, "invalid_client", "Client authentication failed.");
    }

    if (body.grant_type !== "authorization_code") {
      return tokenError(c, 400, "unsupported_grant_type", "Only authorization_code is supported.");
    }
    const code = typeof body.code === "string" ? body.code : "";
    if (!code) return tokenError(c, 400, "invalid_request", "code is required.");

    // Consumed before any further check: a code is spent the first time it is presented, right or wrong.
    const stored = await consumeSsoCode(code, codeStoreAppId(client.clientId));
    const pending = stored ? unpackPendingAuthorization(stored) : null;
    if (!pending) {
      logger.info(`OIDC token refused for "${client.clientId}": code missing, expired, used, or for another client.`);
      return tokenError(c, 400, "invalid_grant", "Invalid, expired, or already-used code.");
    }
    if (body.redirect_uri !== pending.redirectUri) {
      return tokenError(c, 400, "invalid_grant", "redirect_uri does not match the authorization request.");
    }
    const verifier = typeof body.code_verifier === "string" ? body.code_verifier : null;
    if (pending.codeChallenge !== null) {
      if (!verifier || !pkceMatches(pending.codeChallenge, verifier)) {
        return tokenError(c, 400, "invalid_grant", "code_verifier does not match the code_challenge.");
      }
    } else if (verifier !== null) {
      return tokenError(c, 400, "invalid_grant", "code_verifier sent for a request that had no code_challenge.");
    }

    const tokens = await issueTokens(client, pending);
    c.header("Cache-Control", "no-store");
    c.header("Pragma", "no-cache");
    return c.json(tokens);
  }
}
