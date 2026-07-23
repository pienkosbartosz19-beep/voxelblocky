import { createClient, type RedisClientType } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType> | null = null;

async function getClient(): Promise<RedisClientType | null> {
  if (client?.isOpen) return client;

  if (!connectPromise) {
    connectPromise = (async () => {
      const next = createClient({ url: redisUrl });
      next.on("error", (err) => {
        console.warn("[cache] Redis error:", err.message);
      });
      await next.connect();
      client = next as RedisClientType;
      return client;
    })().catch((err) => {
      connectPromise = null;
      console.warn("[cache] Redis unavailable, continuing without cache:", err);
      return null as unknown as RedisClientType;
    });
  }

  return connectPromise;
}

/** Lekki wrapper KV z graceful fallback (bez Redis aplikacja dalej działa). */
export const redis = {
  async get(key: string): Promise<string | null> {
    try {
      const c = await getClient();
      if (!c?.isOpen) return null;
      return await c.get(key);
    } catch (err) {
      console.warn("[cache] get failed:", err);
      return null;
    }
  },

  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    try {
      const c = await getClient();
      if (!c?.isOpen) return;
      await c.setEx(key, ttlSeconds, value);
    } catch (err) {
      console.warn("[cache] setex failed:", err);
    }
  },

  async ping(): Promise<string | null> {
    try {
      const c = await getClient();
      if (!c?.isOpen) return null;
      return await c.ping();
    } catch {
      return null;
    }
  },
};
