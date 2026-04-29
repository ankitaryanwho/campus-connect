import { LRUCache } from "lru-cache";

const IS_DEV = process.env.NODE_ENV === "development";

function makeCache<V extends object>(
  name: string,
  max: number,
  ttlSeconds: number,
): LRUCache<string, V> {
  const cache = new LRUCache<string, V>({
    max,
    ttl: ttlSeconds * 1000,
  });

  if (IS_DEV) {
    const original = cache.get.bind(cache);
    (cache as any).get = (key: string) => {
      const val = original(key);
      console.log(`[cache:${name}] ${val ? "HIT" : "MISS"} key="${key}" size=${cache.size}/${max}`);
      return val;
    };
  }

  return cache;
}

export const postsCache = makeCache<object>("posts", 200, 30);

export const chatroomsCache = makeCache<object>("chatrooms", 50, 60);

export const usersCache = makeCache<object>("users", 500, 60);
