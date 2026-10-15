import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { generateKeyPairSync, verify as verifyRsaSignature } from "node:crypto";

// hubSsoJwks()/mintRelayToken() cache their signing key and JWKS in
// module-level singletons on first successful call, so once a test proves a
// valid key works the module can no longer be driven back into an
// unconfigured state. This file therefore runs the failure cases first, in a
// single sequential describe block (bun runs tests within a file in
// declaration order), and only sets a valid key afterwards.
import { hubSsoJwks, mintRelayToken, resetSsoRelayForTest } from "../lib/sso-relay";

// Other test files may have filled the cache or set a key, and bun runs them in one process.
const originalKey = process.env.HUB_SSO_PRIVATE_KEY;
const originalKeyId = process.env.HUB_SSO_KEY_ID;
afterAll(() => {
  if (originalKey === undefined) delete process.env.HUB_SSO_PRIVATE_KEY;
  else process.env.HUB_SSO_PRIVATE_KEY = originalKey;
  if (originalKeyId === undefined) delete process.env.HUB_SSO_KEY_ID;
  else process.env.HUB_SSO_KEY_ID = originalKeyId;
  resetSsoRelayForTest();
});

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const pkcs8Pem = privateKey.replace(/\n/g, "\\n");

function base64UrlDecode(segment: string): Buffer {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

describe("hubSsoJwks - misconfiguration is a loud failure, not a silent one", () => {
  beforeEach(() => resetSsoRelayForTest());

  it("throws when HUB_SSO_PRIVATE_KEY is unset", () => {
    delete process.env.HUB_SSO_PRIVATE_KEY;
    expect(() => hubSsoJwks()).toThrow("HUB_SSO_PRIVATE_KEY is not configured");
  });

  it("throws when the value isn't a PKCS#8 PEM at all", () => {
    process.env.HUB_SSO_PRIVATE_KEY = "not-a-pem-key";
    expect(() => hubSsoJwks()).toThrow("HUB_SSO_PRIVATE_KEY must be a PKCS#8 PEM private key");
  });

  it("rejects a genuine PKCS#1 key (openssl's default RSA format) as not-PKCS#8", () => {
    // A real PKCS#1 PEM ("BEGIN RSA PRIVATE KEY") never contains the
    // substring "BEGIN PRIVATE KEY", so it fails the PKCS#8 presence check
    // before the code ever gets to say the word "PKCS#1" - this is the
    // message an engineer actually sees after `openssl genrsa`.
    const { privateKey: pkcs1 } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs1", format: "pem" },
    });
    process.env.HUB_SSO_PRIVATE_KEY = pkcs1.replace(/\n/g, "\\n");

    expect(() => hubSsoJwks()).toThrow("HUB_SSO_PRIVATE_KEY must be a PKCS#8 PEM private key");
  });

  it("rejects a key carrying both PKCS#8 and PKCS#1 banners with the PKCS#1-specific message", () => {
    // The dedicated PKCS#1 message only fires once the PKCS#8 check has
    // already passed - i.e. the string contains "BEGIN PRIVATE KEY" too.
    // That combination is what a hand-edited or mislabelled key looks like.
    const { privateKey: pkcs1 } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs1", format: "pem" },
    });
    const mislabelled = `-----BEGIN PRIVATE KEY-----\n${pkcs1}`;
    process.env.HUB_SSO_PRIVATE_KEY = mislabelled.replace(/\n/g, "\\n");

    expect(() => hubSsoJwks()).toThrow(
      "HUB_SSO_PRIVATE_KEY must be a PKCS#8 private key, not PKCS#1",
    );
  });
});

describe("hubSsoJwks / mintRelayToken with a valid key", () => {
  beforeAll(() => {
    resetSsoRelayForTest();
    process.env.HUB_SSO_PRIVATE_KEY = pkcs8Pem;
    process.env.HUB_SSO_KEY_ID = "test-key-id";
  });

  it("publishes exactly one RS256 signing key with the configured kid", () => {
    const jwks = hubSsoJwks();
    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0]?.kid).toBe("test-key-id");
    expect(jwks.keys[0]?.alg).toBe("RS256");
    expect(jwks.keys[0]?.use).toBe("sig");
  });

  it("mints a relay token whose sub is the Central Person.id, not email", async () => {
    const token = await mintRelayToken(
      { id: "person-1", email: "someone@millennia21.id" },
      { appId: "daily-checkin", entryUrl: "https://app.millenniaws.sch.id/auth/sso" },
      { source: "employee", tags: ["public", "employee", "staff", "teacher"] },
    );

    const [headerPart, payloadPart] = token.split(".");
    const header = JSON.parse(base64UrlDecode(headerPart!).toString("utf8"));
    const payload = JSON.parse(base64UrlDecode(payloadPart!).toString("utf8"));

    expect(header.alg).toBe("RS256");
    expect(header.kid).toBe("test-key-id");
    expect(payload.iss).toBe("mws-hub");
    expect(payload.aud).toBe("daily-checkin");
    // sub is the stable Person.id - a receiving app's actual identity
    // anchor. email is still carried, but only as a display attribute.
    expect(payload.sub).toBe("person-1");
    expect(payload.email).toBe("someone@millennia21.id");
    expect(payload.exp - payload.iat).toBe(30);
    expect(payload.source).toBe("employee");
    expect(payload.tags).toEqual(["public", "employee", "staff", "teacher"]);
  });

  it("produces a signature the published public key actually verifies", async () => {
    const token = await mintRelayToken(
      { id: "person-1", email: "someone@millennia21.id" },
      { appId: "daily-checkin", entryUrl: "https://app.millenniaws.sch.id/auth/sso" },
      { source: "employee", tags: ["public", "employee", "staff"] },
    );
    const [headerPart, payloadPart, signaturePart] = token.split(".");
    const signingInput = `${headerPart}.${payloadPart}`;

    const isValid = verifyRsaSignature(
      "RSA-SHA256",
      Buffer.from(signingInput, "utf8"),
      publicKey,
      base64UrlDecode(signaturePart!),
    );

    expect(isValid).toBe(true);
  });

  it("includes the optional Central entitlement snapshot", async () => {
    const entitlement = {
      id: "ent-1",
      application_id: "exima",
      organization_id: "org-1",
      role: "resource-admin",
      permissions: ["inventory:read"],
      version: 2,
    };
    const token = await mintRelayToken(
      { id: "person-1", email: "someone@millennia21.id" },
      { appId: "exima", entryUrl: "https://exima.mws.web.id/auth/sso" },
      { source: "employee", tags: ["employee", "resource"] },
      entitlement,
    );
    const payload = JSON.parse(
      base64UrlDecode(token.split(".")[1]!).toString("utf8"),
    );
    expect(payload.entitlement).toEqual(entitlement);
  });
});
