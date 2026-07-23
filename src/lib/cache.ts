import { createClient, type RedisClientType } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const CONNECT_TIMEOUT_MS = Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 1500);

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;
let redisDisabled = false;

async function getClient(): Promise<RedisClientType | null> {
  if (redisDisabled) return null;
  if (client?.isOpen) return client;

  if (!connectPromise) {
    connectPromise = (async () => {
      const next = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: CONNECT_TIMEOUT_MS,
          reconnectStrategy: false,
        },
      });

      next.on("error", (err) => {
        console.warn("[cache] Redis error:", err.message);
      });

      const timeout = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), CONNECT_TIMEOUT_MS + 200);
      });

      const connected = next
        .connect()
        .then(() => next as RedisClientType)
        .catch((err) => {
          console.warn("[cache] Redis connect failed:", err?.message || err);
          return null;
        });

      const result = await Promise.race([connected, timeout]);
      if (!result) {
        redisDisabled = true;
        try {
          await next.disconnect().catch(() => undefined);
        } catch {
          /* ignore */
        }
        return null;
      }

      client = result;
      return client;
    })().finally(() => {
      // allow retry later only if we never disabled permanently for this process cycle
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
