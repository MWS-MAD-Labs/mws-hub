import { prisma } from "./prisma";

// The last time a code was traded for an application, kept so Central can see that the application signs in the
// code and token way. Written at most once a minute per application.
export interface ExchangeSeenStore {
  save(appId: string, at: Date): Promise<void>;
  find(appId: string): Promise<Date | null>;
}

const databaseStore: ExchangeSeenStore = {
  save: async (appId, at) => {
    await prisma.ssoExchangeSeen.upsert({ where: { app_id: appId }, create: { app_id: appId, seen_at: at }, update: { seen_at: at } });
  },
  find: async (appId) => (await prisma.ssoExchangeSeen.findUnique({ where: { app_id: appId } }))?.seen_at ?? null,
};

let store: ExchangeSeenStore = databaseStore;
export function useExchangeSeenStoreForTest(replacement: ExchangeSeenStore | null) {
  store = replacement ?? databaseStore;
  lastWrite.clear();
}

const WRITE_EVERY_MS = 60_000;
const lastWrite = new Map<string, number>();

// A failure here must never fail the sign-in.
export async function noteExchange(appId: string, now: Date = new Date()): Promise<void> {
  const before = lastWrite.get(appId);
  if (before !== undefined && now.getTime() - before < WRITE_EVERY_MS) return;
  lastWrite.set(appId, now.getTime());
  await store.save(appId, now).catch(() => lastWrite.delete(appId));
}

export async function lastExchange(appId: string): Promise<Date | null> {
  return store.find(appId);
}
