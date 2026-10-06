import { randomUUID } from "node:crypto";

const CODE_TTL_MS = 25_000;

type StoredExchange = {
  token: string;
  appId: string;
  state: string | null;
  expiresAt: Date;
};

export interface SsoCodeStore {
  create(token: string, appId: string, state?: string | null): Promise<string>;
  consume(code: string, appId: string, state?: string | null): Promise<string | null>;
}

export class MemorySsoCodeStore implements SsoCodeStore {
  private readonly pending = new Map<string, StoredExchange>();

  private sweep() {
    const now = Date.now();
    for (const [code, entry] of this.pending) {
      if (entry.expiresAt.getTime() <= now) this.pending.delete(code);
    }
  }

  async create(token: string, appId: string, state: string | null = null) {
    this.sweep();
    const code = randomUUID();
    this.pending.set(code, {
      token,
      appId,
      state,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });
    return code;
  }

  async consume(code: string, appId: string, state: string | null = null) {
    this.sweep();
    const entry = this.pending.get(code);
    this.pending.delete(code);

    if (!entry || entry.appId !== appId || entry.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    if (entry.state !== null && entry.state !== state) return null;
    return entry.token;
  }
}

export class PostgresSsoCodeStore implements SsoCodeStore {
  async create(token: string, appId: string, state: string | null = null) {
    const { prisma } = await import("./prisma");
    const code = randomUUID();
    await prisma.ssoCode.deleteMany({ where: { expires_at: { lte: new Date() } } });
    await prisma.ssoCode.create({
      data: {
        code,
        token,
        app_id: appId,
        state,
        expires_at: new Date(Date.now() + CODE_TTL_MS),
      },
    });
    return code;
  }

  async consume(code: string, appId: string, state: string | null = null) {
    const { prisma } = await import("./prisma");
    const rows = await prisma.$queryRaw<StoredExchange[]>`
      DELETE FROM "sso_codes"
      WHERE "code" = ${code}
      RETURNING
        "token",
        "app_id" AS "appId",
        "state",
        "expires_at" AS "expiresAt"
    `;
    const entry = rows[0];
    if (!entry || entry.appId !== appId || entry.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    if (entry.state !== null && entry.state !== state) return null;
    return entry.token;
  }
}

let configuredStore: { mode: string; store: SsoCodeStore } | null = null;

export function getSsoCodeStore(): SsoCodeStore {
  const mode = process.env.SSO_CODE_STORE || "memory";
  if (configuredStore?.mode === mode) return configuredStore.store;
  if (mode !== "memory" && mode !== "postgres") {
    throw new Error('SSO_CODE_STORE must be either "memory" or "postgres"');
  }

  configuredStore = {
    mode,
    store: mode === "postgres" ? new PostgresSsoCodeStore() : new MemorySsoCodeStore(),
  };
  return configuredStore.store;
}

export function createSsoCode(token: string, appId: string, state?: string | null) {
  return getSsoCodeStore().create(token, appId, state);
}

export function consumeSsoCode(
  code: string,
  appId: string,
  state?: string | null,
) {
  return getSsoCodeStore().consume(code, appId, state);
}
