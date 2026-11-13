import { createHash, randomBytes } from "node:crypto";
import { frontendOrigin } from "./frontend-origin";
import { sameSecret } from "./hub-app-secret";
import { signHubJwt } from "./sso-relay";

// Hub as a standard OpenID Connect provider, for applications that cannot
// speak Hub's own relay handoff (code + /sso/exchange + X-Hub-Internal-Secret)
// but do speak OIDC out of the box - BookStack being the first. Nothing here
// replaces the relay: it is the same authorization (Hub session, fresh Central
// lookup, the card's own access verdict), the same single-use code store and
// the same RS256 key behind /.well-known/jwks.json, wrapped in the protocol
// such an application already knows.
//
// Everything lives under /sso/oidc so it rides the /sso/ prefix nginx, the
// Vite dev proxy and the service worker already send to the backend - no
// gateway change is needed to put it online.

const ID_TOKEN_TTL_SECONDS = 300;
const CODE_PREFIX = "oidc:";
const STATE_MAX = 1024;
const NONCE_MAX = 512;
const PKCE_CHALLENGE = /^[A-Za-z0-9_-]{43}$/;
const PKCE_VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;

export type OidcClient = {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  // The catalog card (Central application id or Hub sso appId) whose access
  // verdict decides who may sign in. Required: a client nobody tied to a card
  // would otherwise admit every Hub user.
  appId: string;
  // Shown on Hub's support page when sign-in is refused and the card itself
  // is not in the person's catalog to read a name from.
  name?: string;
};

// The configured clients, from HUB_OIDC_CLIENTS (a JSON array). Read on each
// call so a test - or a restart with a new env - sees the current value; the
// list is a handful of entries, parsing it is not worth caching.
export function oidcClients(): OidcClient[] {
  const raw = process.env.HUB_OIDC_CLIENTS?.trim();
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("HUB_OIDC_CLIENTS must be a JSON array");
  }
  if (!Array.isArray(parsed)) throw new Error("HUB_OIDC_CLIENTS must be a JSON array");

  return parsed.map((item, index) => {
    const entry = (item ?? {}) as Record<string, unknown>;
    const clientId = typeof entry.client_id === "string" ? entry.client_id.trim() : "";
    const clientSecret = typeof entry.client_secret === "string" ? entry.client_secret : "";
    const appId = typeof entry.app_id === "string" ? entry.app_id.trim() : "";
    const redirectUris = Array.isArray(entry.redirect_uris)
      ? entry.redirect_uris.filter((uri): uri is string => typeof uri === "string" && uri.length > 0)
      : [];

    if (!clientId || !appId || redirectUris.length === 0) {
      throw new Error(`HUB_OIDC_CLIENTS[${index}] needs client_id, app_id and redirect_uris`);
    }
    // A short secret is guessable; the token endpoint is on the public internet.
    if (clientSecret.length < 32) {
      throw new Error(`HUB_OIDC_CLIENTS[${index}] client_secret must be at least 32 characters`);
    }
    for (const uri of redirectUris) {
      let url: URL;
      try {
        url = new URL(uri);
      } catch {
        throw new Error(`HUB_OIDC_CLIENTS[${index}] redirect_uri is not a URL: ${uri}`);
      }
      // http only for localhost, which is how a staging copy is reached through an SSH tunnel.
      const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
        throw new Error(`HUB_OIDC_CLIENTS[${index}] redirect_uri must be https: ${uri}`);
      }
      if (url.hash) throw new Error(`HUB_OIDC_CLIENTS[${index}] redirect_uri must not have a fragment`);
    }

    return {
      clientId,
      clientSecret,
      redirectUris,
      appId,
      ...(typeof entry.name === "string" && entry.name.trim() ? { name: entry.name.trim() } : {}),
    };
  });
}

export function findOidcClient(clientId: string | null | undefined): OidcClient | null {
  if (!clientId) return null;
  return oidcClients().find((client) => client.clientId === clientId) ?? null;
}

// The issuer the relying party is configured with, character for character
// (BookStack compares it exactly, trailing slash included). Defaults to the
// public origin Hub is served on, which is also where the backend is.
export function oidcIssuer(): string {
  const configured = process.env.HUB_OIDC_ISSUER?.trim();
  return (configured || `${frontendOrigin()}/sso/oidc`).replace(/\/+$/, "");
}

export function oidcDiscovery() {
  const issuer = oidcIssuer();
  return {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    jwks_uri: new URL("/.well-known/jwks.json", issuer).toString(),
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "email", "profile"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    code_challenge_methods_supported: ["S256"],
    claims_supported: ["iss", "sub", "aud", "exp", "iat", "nonce", "email", "email_verified", "name", "groups"],
  };
}

export type AuthorizeRequest = {
  client: OidcClient;
  redirectUri: string;
  state: string | null;
  nonce: string | null;
  codeChallenge: string | null;
};

// What can go wrong before the request is trusted enough to redirect back to
// it. An unknown client or an unregistered redirect_uri must never be
// redirected to (that is an open redirect handing out codes), so those come
// back as `fatal`; everything else is reported to the redirect_uri, per spec.
export type AuthorizeValidation =
  | { ok: true; request: AuthorizeRequest }
  | { ok: false; fatal: true; message: string }
  | { ok: false; fatal: false; redirectUri: string; state: string | null; error: string; description: string };

export function validateAuthorizeRequest(query: URLSearchParams): AuthorizeValidation {
  for (const key of new Set(query.keys())) {
    if (query.getAll(key).length > 1) {
      return { ok: false, fatal: true, message: `Parameter "${key}" was sent more than once.` };
    }
  }

  const client = findOidcClient(query.get("client_id"));
  if (!client) return { ok: false, fatal: true, message: "Unknown client_id." };

  const redirectUri = query.get("redirect_uri") ?? "";
  if (!client.redirectUris.includes(redirectUri)) {
    return { ok: false, fatal: true, message: "redirect_uri is not registered for this client." };
  }

  const rawState = query.get("state");
  if (rawState !== null && (rawState.length === 0 || rawState.length > STATE_MAX)) {
    return { ok: false, fatal: true, message: "state is empty or too long." };
  }
  const state = rawState;
  const fail = (error: string, description: string): AuthorizeValidation => ({
    ok: false,
    fatal: false,
    redirectUri,
    state,
    error,
    description,
  });

  if (query.get("response_type") !== "code") {
    return fail("unsupported_response_type", "Only response_type=code is supported.");
  }
  const scopes = (query.get("scope") ?? "").split(" ").filter(Boolean);
  if (!scopes.includes("openid")) {
    return fail("invalid_scope", "The openid scope is required.");
  }

  const nonce = query.get("nonce");
  if (nonce !== null && (nonce.length === 0 || nonce.length > NONCE_MAX)) {
    return fail("invalid_request", "nonce is empty or too long.");
  }

  const codeChallenge = query.get("code_challenge");
  const challengeMethod = query.get("code_challenge_method");
  if (codeChallenge !== null) {
    // "plain" (and an absent method, which defaults to it) gives no protection over no PKCE at all.
    if (challengeMethod !== "S256") {
      return fail("invalid_request", "code_challenge_method must be S256.");
    }
    if (!PKCE_CHALLENGE.test(codeChallenge)) {
      return fail("invalid_request", "code_challenge is not a valid S256 challenge.");
    }
  } else if (challengeMethod !== null) {
    return fail("invalid_request", "code_challenge_method was sent without code_challenge.");
  }

  return { ok: true, request: { client, redirectUri, state, nonce, codeChallenge } };
}

export function authorizeErrorRedirect(redirectUri: string, error: string, description: string, state: string | null) {
  const target = new URL(redirectUri);
  target.searchParams.set("error", error);
  target.searchParams.set("error_description", description);
  if (state !== null) target.searchParams.set("state", state);
  return target.toString();
}

export type OidcIdentityClaims = {
  sub: string;
  email: string;
  email_verified: true;
  name: string;
  groups: string[];
};

// What a code stands for until the relying party's backend trades it in.
// The id_token is signed at trade time, not here, so its iat/exp start when
// it is actually handed over.
type PendingAuthorization = {
  claims: OidcIdentityClaims;
  redirectUri: string;
  nonce: string | null;
  codeChallenge: string | null;
  authTime: number;
};

export function codeStoreAppId(clientId: string) {
  // Namespaced so an OIDC code can never be traded at /sso/exchange for a relay app that happens to share the id.
  return `${CODE_PREFIX}${clientId}`;
}

export function packPendingAuthorization(request: AuthorizeRequest, claims: OidcIdentityClaims): string {
  const pending: PendingAuthorization = {
    claims,
    redirectUri: request.redirectUri,
    nonce: request.nonce,
    codeChallenge: request.codeChallenge,
    authTime: Math.floor(Date.now() / 1000),
  };
  return JSON.stringify(pending);
}

export function unpackPendingAuthorization(stored: string): PendingAuthorization | null {
  try {
    const value = JSON.parse(stored) as PendingAuthorization;
    return value && typeof value.redirectUri === "string" && value.claims?.sub ? value : null;
  } catch {
    return null;
  }
}

export function pkceMatches(challenge: string, verifier: string): boolean {
  if (!PKCE_VERIFIER.test(verifier)) return false;
  const computed = createHash("sha256").update(verifier).digest("base64url");
  return sameSecret(computed, challenge);
}

export type ClientCredentials = { clientId: string; clientSecret: string; via: "basic" | "post" };

// client_secret_basic or client_secret_post, never both at once (RFC 6749 2.3.1).
export function readClientCredentials(
  authorization: string | undefined,
  body: Record<string, unknown>,
): ClientCredentials | { error: string } {
  const bodyId = typeof body.client_id === "string" ? body.client_id : null;
  const bodySecret = typeof body.client_secret === "string" ? body.client_secret : null;

  if (authorization?.toLowerCase().startsWith("basic ")) {
    if (bodySecret !== null) return { error: "Use one client authentication method, not two." };
    const decoded = Buffer.from(authorization.slice(6).trim(), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator === -1) return { error: "Malformed Basic credentials." };
    try {
      // Basic credentials are form-urlencoded before base64 (RFC 6749 2.3.1).
      const clientId = decodeURIComponent(decoded.slice(0, separator).replace(/\+/g, " "));
      const clientSecret = decodeURIComponent(decoded.slice(separator + 1).replace(/\+/g, " "));
      if (bodyId !== null && bodyId !== clientId) return { error: "client_id does not match the credentials." };
      return { clientId, clientSecret, via: "basic" };
    } catch {
      return { error: "Malformed Basic credentials." };
    }
  }

  if (bodyId && bodySecret) return { clientId: bodyId, clientSecret: bodySecret, via: "post" };
  return { error: "Client authentication is required." };
}

export function authenticateClient(credentials: ClientCredentials): OidcClient | null {
  const client = findOidcClient(credentials.clientId);
  if (!client) return null;
  return sameSecret(credentials.clientSecret, client.clientSecret) ? client : null;
}

export async function issueTokens(client: OidcClient, pending: PendingAuthorization) {
  const now = Math.floor(Date.now() / 1000);
  const idToken = await signHubJwt({
    iss: oidcIssuer(),
    aud: client.clientId,
    ...pending.claims,
    ...(pending.nonce !== null ? { nonce: pending.nonce } : {}),
    auth_time: pending.authTime,
    iat: now,
    exp: now + ID_TOKEN_TTL_SECONDS,
  });

  return {
    // Every claim the relying party needs is in the id_token, so this token
    // opens nothing (there is no userinfo endpoint); OAuth still requires one.
    access_token: randomBytes(32).toString("base64url"),
    token_type: "Bearer",
    expires_in: ID_TOKEN_TTL_SECONDS,
    scope: "openid email profile",
    id_token: idToken,
  };
}
