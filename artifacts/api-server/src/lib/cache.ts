import { LRUCache } from "lru-cache";
import Redis from "ioredis";

// The secret may be stored as the full assignment (KEY="value") or with surrounding quotes.
// Extract just the URL part in either case.
function parseRedisUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // Handle KEY="value" or KEY=value form pasted as the whole assignment
  const eqMatch = raw.match(/=["']?(.+?)["']?$/);
  if (eqMatch) raw = eqMatch[1];
  // Strip any remaining surrounding quotes
  raw = raw.replace(/^["']+|["']+$/g, "").trim();
  return raw.startsWith("redis") ? raw : undefined;
}
const REDIS_URL = parseRedisUrl(process.env["REDIS_URL"]);
const IS_DEV    = process.env.NODE_ENV === "development";

/** Which cache backend is active — exposed via GET /api/ping. */
export const cacheBackend: "redis" | "memory" = REDIS_URL ? "redis" : "memory";

const redisClient: Redis | null = REDIS_URL
  ? new Redis(REDIS_URL, { maxRetriesPerRequest: 3, enableReadyCheck: false, lazyConnect: false })
  : null;

const subClient: Redis | null = REDIS_URL
  ? new Redis(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false, lazyConnect: false })
  : null;

redisClient?.on("error", (err: Error) => {
  if (IS_DEV) console.warn("[redis] Connection error:", err.message);
});

subClient?.on("error", (err: Error) => {
  if (IS_DEV) console.warn("[redis-sub] Connection error:", err.message);
});

/** 
 * Publish a payload to a Redis channel. 
 * Falls back to no-op if Redis is absent.
 */
export async function publish(channel: string, payload: object): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.publish(channel, JSON.stringify(payload));
  } catch (err) {
    console.warn(`[redis] publish to ${channel} failed:`, (err as Error).message);
  }
}

/** 
 * Subscribe to a Redis channel and execute a callback on message.
 * Returns an unsubscribe function.
 * Falls back to no-op if Redis is absent.
 */
export function subscribe(channel: string, cb: (payload: any) => void): () => void {
  if (!subClient) return () => {};

  const onMessage = (chan: string, msg: string) => {
    if (chan === channel) {
      try {
        cb(JSON.parse(msg));
      } catch (err) {
        console.warn(`[redis] subscribe parse failed on ${channel}:`, (err as Error).message);
      }
    }
  };

  subClient.subscribe(channel).catch(err => {
    console.warn(`[redis] subscribe to ${channel} failed:`, err.message);
  });
  
  subClient.on("message", onMessage);

  return () => {
    subClient.off("message", onMessage);
    subClient.unsubscribe(channel).catch(() => {});
  };
}

// ─── Shared interface ─────────────────────────────────────────────────────────

interface AppCache {
  get(key: string): Promise<object | undefined>;
  set(key: string, value: object): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByPrefix(prefix: string): Promise<void>;
  clear(): Promise<void>;
}

// ─── In-memory backend ────────────────────────────────────────────────────────

class MemoryCache implements AppCache {
  private readonly inner: LRUCache<string, object>;
  private hits   = 0;
  private misses = 0;

  constructor(
    private readonly name: string,
    max: number,
    ttlSeconds: number,
  ) {
    this.inner = new LRUCache({ max, ttl: ttlSeconds * 1000 });
  }

  async get(key: string): Promise<object | undefined> {
    const val = this.inner.get(key);
    if (IS_DEV) {
      val !== undefined ? this.hits++ : this.misses++;
      const total   = this.hits + this.misses;
      const hitRate = total ? ((this.hits / total) * 100).toFixed(1) : "0.0";
      console.log(
        `[cache:${this.name}] ${val !== undefined ? "HIT" : "MISS"} ` +
        `key="${key}" hitRate=${hitRate}% (${this.hits}h/${this.misses}m) size=${this.inner.size}`,
      );
    }
    return val;
  }

  async set(key: string, value: object): Promise<void> {
    this.inner.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.inner.delete(key);
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    for (const key of this.inner.keys()) {
      if (key.startsWith(prefix)) this.inner.delete(key);
    }
  }

  async clear(): Promise<void> {
    this.inner.clear();
  }
}

// ─── Redis backend ────────────────────────────────────────────────────────────

class RedisCache implements AppCache {
  constructor(
    private readonly client: Redis,
    private readonly keyPrefix: string,
    private readonly ttlSeconds: number,
  ) {}

  private k(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get(key: string): Promise<object | undefined> {
    try {
      const raw = await this.client.get(this.k(key));
      return raw ? (JSON.parse(raw) as object) : undefined;
    } catch (err) {
      console.warn("[redis] get failed:", (err as Error).message);
      return undefined;
    }
  }

  async set(key: string, value: object): Promise<void> {
    try {
      await this.client.set(this.k(key), JSON.stringify(value), "EX", this.ttlSeconds);
    } catch (err) {
      console.warn("[redis] set failed:", (err as Error).message);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(this.k(key));
    } catch (err) {
      console.warn("[redis] delete failed:", (err as Error).message);
    }
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}${prefix}*`;
      let cursor = "0";
      do {
        const [next, keys] = await this.client.scan(cursor, "MATCH", pattern, "COUNT", "100");
        cursor = next;
        if (keys.length) await this.client.del(...keys);
      } while (cursor !== "0");
    } catch (err) {
      console.warn("[redis] deleteByPrefix failed:", (err as Error).message);
    }
  }

  async clear(): Promise<void> {
    await this.deleteByPrefix("");
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeCache(
  name: string,
  redisKeyPrefix: string,
  memMax: number,
  ttlSeconds: number,
): AppCache {
  if (redisClient) return new RedisCache(redisClient, redisKeyPrefix, ttlSeconds);
  return new MemoryCache(name, memMax, ttlSeconds);
}

// ─── Exported cache instances ─────────────────────────────────────────────────
// TTLs: posts 120 s, users 300 s, chatrooms 180 s, messages 60 s

export const postsCache        = makeCache("posts",     "cc:posts:",      200, 120);
export const usersCache        = makeCache("users",     "cc:users:",      500, 300);
export const chatroomsCache    = makeCache("chatrooms", "cc:chat:rooms:",  50, 180);
export const messagesPageCache = makeCache("messages",  "cc:chat:msg:",   500,  60);

// ─── Cache key helpers ────────────────────────────────────────────────────────

/** Cache key for a paginated DM conversation page (user-specific). */
export function dmPageKey(conversationId: string, userId: string, cursor: string | undefined, limit: number): string {
  return `conversation:${conversationId}|${userId}|${cursor ?? ""}|${limit}`;
}

/** Cache key for a paginated chatroom message page (shared across users). */
export function chatroomPageKey(chatroomId: string, cursor: string | undefined, limit: number): string {
  return `chatroom:${chatroomId}|${cursor ?? ""}|${limit}`;
}

/** Prefix used to invalidate all cached DM pages for a conversation (all users). */
export function dmInvalidationPrefix(conversationId: string): string {
  return `conversation:${conversationId}|`;
}

/** Prefix used to invalidate all cached chatroom message pages. */
export function chatroomInvalidationPrefix(chatroomId: string): string {
  return `chatroom:${chatroomId}|`;
}
