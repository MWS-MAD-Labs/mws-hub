import { createPublicKey, createVerify } from "node:crypto";

// Every token Hub signs goes through here: the 30-second relay handoff, the
// access tokens satellites verify, and the logout tokens sent back-channel.
// One key, one algorithm, one place to rotate.

export const ISSUER = "mws-hub";

const TEXT_ENCODER = new TextEncoder();

export type HubSsoJwk = {
  kty?: string;
  n?: string;
  e?: string;
  kid: string;
  alg: "RS256";
  use: "sig";
};

let signingKeyPromise: Promise<CryptoKey> | null = null;
let jwksCache: { keys: HubSsoJwk[] } | null = null;

export function base64UrlEncode(input: string | ArrayBuffer): string {
  const buffer =
    typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input);

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

  if (privateKey.includes("BEGIN RSA PRIVATE KEY")) {
    throw new Error("HUB_SSO_PRIVATE_KEY must be a PKCS#8 private key, not PKCS#1");
  }

  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    throw new Error("HUB_SSO_PRIVATE_KEY must be a PKCS#8 PEM private key");
  }

  return privateKey;
}

export function keyId(): string {
  return process.env.HUB_SSO_KEY_ID || "mws-hub-sso-current";
}

async function importSigningKey(): Promise<CryptoKey> {
  if (signingKeyPromise) return signingKeyPromise;

  const body = pemBody(privateKeyPem(), "PRIVATE KEY");
  if (!/^[A-Za-z0-9+/=]+$/.test(body)) {
    throw new Error("HUB_SSO_PRIVATE_KEY body is not valid base64");
  }

  signingKeyPromise = crypto.subtle
    .importKey(
      "pkcs8",
      Buffer.from(body, "base64"),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
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

  jwksCache = { keys: [{ ...jwk, kid: keyId(), alg: "RS256", use: "sig" }] };

  return jwksCache;
}

// Callers supply the claims that describe the token's purpose. `iss`, `iat`
// and `exp` are added here so no call site can forget an expiry.
export async function signJwt(
  claims: Record<string, unknown>,
  ttlSeconds: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: keyId() };
  const payload = { iss: ISSUER, ...claims, iat: now, exp: now + ttlSeconds };

  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload),
  )}`;

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    await importSigningKey(),
    TEXT_ENCODER.encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

// Hub verifies its own relay tokens when a satellite redeems one. Same key,
// so no configuration - the public half is derived from the private one.
export function verifyOwnToken(token: string): Record<string, unknown> | null {
  const [headerB64, payloadB64, signatureB64] = token.split(".");
  if (!headerB64 || !payloadB64 || !signatureB64) return null;

  try {
    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString());
    // Pinned, for the same reason the satellites pin theirs: without this a
    // token signed HS256 with the public key would sail through.
    if (header.alg !== "RS256") return null;

    const valid = createVerify("RSA-SHA256")
      .update(`${headerB64}.${payloadB64}`)
      .end()
      .verify(createPublicKey(privateKeyPem()), Buffer.from(signatureB64, "base64url"));

    if (!valid) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    const now = Math.floor(Date.now() / 1000);

    if (payload.iss !== ISSUER) return null;
    if (typeof payload.exp !== "number" || payload.exp <= now) return null;

    return payload;
  } catch {
    return null;
  }
}
