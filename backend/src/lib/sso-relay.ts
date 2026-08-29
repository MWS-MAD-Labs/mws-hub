import { createPublicKey } from "node:crypto";
import type { HubAccessSource, HubAppSso, IdentitySource } from "../type/catalog-type";

const ISSUER = "mws-hub";
const RELAY_TTL_SECONDS = 30;
const TEXT_ENCODER = new TextEncoder();
type HubSsoJwk = {
  kty?: string;
  n?: string;
  e?: string;
  kid: string;
  alg: "RS256";
  use: "sig";
};
let signingKeyPromise: Promise<CryptoKey> | null = null;
let jwksCache: { keys: HubSsoJwk[] } | null = null;

// The app registry used to live here as SSO_APPS. It now sits in Hub's
// database catalog alongside every other app, so which apps exist, who may
// see them and who may open them are one list instead of two that had to be
// kept in step by hand. This module keeps the one job its name promises:
// signing the handoff.

function base64UrlEncode(input: string | ArrayBuffer): string {
  const buffer = typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input);

  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function pemBody(pem: string, label: string): string {
  return pem
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "")
    .replace(`-----BEGIN ${label}-----`, "")
    .replace(`-----END ${label}-----`, "")
    .replace(/\s/g, "");
}

function privateKeyPem(): string {
  const privateKey = process.env.HUB_SSO_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!privateKey) {
    throw new Error("HUB_SSO_PRIVATE_KEY is not configured");
  }

  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    throw new Error("HUB_SSO_PRIVATE_KEY must be a PKCS#8 PEM private key");
  }

  if (privateKey.includes("BEGIN RSA PRIVATE KEY")) {
    throw new Error("HUB_SSO_PRIVATE_KEY must be a PKCS#8 private key, not PKCS#1");
  }

  return privateKey;
}

function keyId(): string {
  return process.env.HUB_SSO_KEY_ID || "mws-hub-sso-current";
}

async function importSigningKey(): Promise<CryptoKey> {
  if (signingKeyPromise) return signingKeyPromise;

  const body = pemBody(privateKeyPem(), "PRIVATE KEY");
  if (!/^[A-Za-z0-9+/=]+$/.test(body)) {
    throw new Error("HUB_SSO_PRIVATE_KEY body is not valid base64");
  }

  const keyData = Buffer.from(body, "base64");

  signingKeyPromise = crypto.subtle
    .importKey(
      "pkcs8",
      keyData,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"],
    )
    .catch((error) => {
      signingKeyPromise = null;
      throw new Error(`HUB_SSO_PRIVATE_KEY could not be imported: ${error.message}`);
    });

  return signingKeyPromise;
}

export function hubSsoJwks(): { keys: HubSsoJwk[] } {
  if (jwksCache) return jwksCache;

  const jwk = createPublicKey(privateKeyPem()).export({ format: "jwk" }) as {
    kty?: string;
    n?: string;
    e?: string;
  };
  jwksCache = {
    keys: [
      {
        ...jwk,
        kid: keyId(),
        alg: "RS256",
        use: "sig",
      },
    ],
  };

  return jwksCache;
}

// Beyond the email assertion, the token also carries the same access tags
// Hub itself just used to decide this person could open the app (see
// AppsService.accessTagsFor) - the identical interpretation of Central's
// free-text job_position/job_level/unit that gates Hub's own catalog. A
// receiving app still re-derives its own profile fields (name, unit, ...)
// from Central directly rather than trusting anything else carried through
// a redirect URL; only the access-tag verdict is meant to be shared, so
// every app that authorizes off Central data agrees on what it means -
// hard-coding a second, drifting interpretation is how mws-mtss-system's
// old job_level dictionary silently downgraded people Hub already knew how
// to place correctly.
//
// Takes a resolved sso config rather than an appId, so it cannot be called
// for an app that was never looked up, and authorization always happens at
// the call site before anything is signed.
export async function mintRelayToken(
  email: string,
  sso: HubAppSso,
  identity: { source: IdentitySource; tags: HubAccessSource[] },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: keyId(),
  };
  const payload = {
    iss: ISSUER,
    aud: sso.appId,
    sub: email,
    source: identity.source,
    tags: identity.tags,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + RELAY_TTL_SECONDS,
  };

  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload),
  )}`;
  const signingKey = await importSigningKey();
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    signingKey,
    TEXT_ENCODER.encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(signature)}`;
}
