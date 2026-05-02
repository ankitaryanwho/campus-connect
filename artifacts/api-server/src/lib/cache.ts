import { LRUCache } from "lru-cache";

const IS_DEV = process.env.NODE_ENV === "development";

class TrackedCache<V extends object> {
  private readonly inner: LRUCache<string, V>;
  private hits = 0;
  private misses = 0;
  private readonly name: string;

  constructor(name: string, max: number, ttlSeconds: number) {
    this.name = name;
    this.inner = new LRUCache<string, V>({ max, ttl: ttlSeconds * 1000 });
  }

  get(key: string): V | undefined {
    const val = this.inner.get(key);
    if (IS_DEV) {
      val !== undefined ? this.hits++ : this.misses++;
      const total = this.hits + this.misses;
      const hitRate  = total ? ((this.hits   / total) * 100).toFixed(1) : "0.0";
      const missRate = total ? ((this.misses / total) * 100).toFixed(1) : "0.0";
      console.log(
        `[cache:${this.name}] ${val !== undefined ? "HIT" : "MISS"} ` +
        `key="${key}" hitRate=${hitRate}% missRate=${missRate}% (${this.hits}h/${this.misses}m/${total}t) size=${this.inner.size}`,
      );
    }
    return val;
  }

  set(key: string, value: V): this {
    this.inner.set(key, value);
    return this;
  }

  delete(key: string): boolean {
    return this.inner.delete(key);
  }

  /** Delete all entries whose key starts with the given prefix. */
  deleteByPrefix(prefix: string): void {
    for (const key of this.inner.keys()) {
      if (key.startsWith(prefix)) this.inner.delete(key);
    }
  }

  clear(): void {
    this.inner.clear();
  }

  get size(): number {
    return this.inner.size;
  }
}

export const postsCache     = new TrackedCache<object>("posts",     200, 120);
export const chatroomsCache = new TrackedCache<object>("chatrooms",  50, 180);
export const usersCache     = new TrackedCache<object>("users",     500, 300);

// Paginated message pages keyed by `{conversationId|chatroomId}|{cursor}|{limit}`.
// 60-second TTL — fresh enough to avoid stale reads, old enough to serve repeated
// scroll-ups without hitting the database.
export const messagesPageCache = new TrackedCache<object>("messages", 500, 60);

/** Build the cache key for a paginated message page. */
export function messagePageKey(channelId: string, cursor: string | undefined, limit: number): string {
  return `${channelId}|${cursor ?? ""}|${limit}`;
}
