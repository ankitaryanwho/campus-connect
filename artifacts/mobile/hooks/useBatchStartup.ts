import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsRestoring, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  CACHE_OWNER_KEY,
  PERSISTED_CACHE_STORAGE_KEY,
  STARTUP_QUERY_KEYS,
} from "@/lib/queryCache";

interface BatchRequest {
  id: string;
  path: string;
}

interface BatchResponse {
  id: string;
  status: number;
  body: unknown;
}

const STARTUP_REQUESTS: BatchRequest[] = [
  { id: "posts",         path: "/posts" },
  { id: "notifications", path: "/notifications" },
  { id: "chatrooms",     path: "/chat/chatrooms" },
  { id: "conversations", path: "/chat/conversations" },
  { id: "marketplace",   path: "/marketplace" },
];

/**
 * Clear both the in-memory TanStack Query cache and its AsyncStorage
 * persisted snapshot, and remove the cache-owner marker.  Called on logout
 * and on any user-id mismatch detected at startup.
 */
async function clearPersistedCache(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.clear();
  await AsyncStorage.multiRemove([PERSISTED_CACHE_STORAGE_KEY, CACHE_OWNER_KEY]).catch(() => {});
}

/**
 * Fires a single /api/batch call once per user session after auth has loaded,
 * pre-populating TanStack Query's cache so tab screens mount with data.
 *
 * On repeat launches the cache is restored from AsyncStorage by
 * PersistQueryClientProvider before this hook runs.  If the restored cache
 * belongs to the currently authenticated user (verified via CACHE_OWNER_KEY)
 * the hook immediately signals isReady so screens render with stale-while-
 * revalidate data while the batch call refreshes in the background.
 *
 * If the restored cache belongs to a different user the entire cache is
 * cleared before the batch runs, preventing cross-account data exposure.
 * On logout the cache is also cleared eagerly so no data leaks to the next
 * session.
 *
 * On a true cold start (no persisted data, or mismatched owner) the original
 * behaviour is preserved: isReady waits for the batch call to complete before
 * the splash screen hides.
 *
 * isReady is derived synchronously from `readyUserId` state rather than stored
 * as separate boolean state.  This means isReady flips false the moment
 * user.id changes (before any async effect runs), eliminating the post-login
 * race where screens could mount with stale or empty cache.
 *
 * Session tracking: the batch re-runs when user.id changes (e.g. one user logs
 * out and another logs in).
 */
export function useBatchStartup(): { isReady: boolean } {
  const { apiRequest, user, token, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // True while PersistQueryClientProvider is restoring the cache from
  // AsyncStorage.  We must wait for this to finish before checking whether
  // cached data is present and verifying its ownership.
  const isRestoring = useIsRestoring();

  // Which user ID the cache was last warmed for.  null = "not yet warmed".
  // State (not a ref) so isReady is always derived synchronously from it.
  const [readyUserId, setReadyUserId] = useState<string | null>(null);

  // Ref mirror used inside the effect to guard against concurrent runs without
  // adding readyUserId to the effect dependency array.
  const readyUserIdRef = useRef<string | null>(null);

  // Synchronously derived: flips false immediately when user.id changes, before
  // the async effect fires.  Logged-out users are always considered ready.
  const isReady = !isLoading && !isRestoring && (!user || readyUserId === user.id);

  useEffect(() => {
    if (isLoading || isRestoring) return;

    if (!user || !token) {
      // Logged out — clear the persisted cache so no data leaks to the next
      // user session, then reset the ready tracker.
      clearPersistedCache(queryClient);
      readyUserIdRef.current = null;
      if (readyUserId !== null) setReadyUserId(null);
      return;
    }

    // Batch already completed or is in progress for this user.
    if (readyUserIdRef.current === user.id) return;

    // Lock immediately to prevent concurrent runs on rapid re-renders.
    readyUserIdRef.current = user.id;

    const run = async () => {
      console.time("[useBatchStartup]");

      // Verify that the restored cache (if any) belongs to the current user.
      // If the owner doesn't match, wipe everything before fetching fresh data.
      let hasCachedData = false;
      try {
        const cacheOwner = await AsyncStorage.getItem(CACHE_OWNER_KEY);
        if (cacheOwner === user.id) {
          hasCachedData = STARTUP_QUERY_KEYS.some(
            (key) => queryClient.getQueryData(key) != null,
          );
        } else if (cacheOwner !== null) {
          // Cache belongs to a different user — clear it entirely.
          await clearPersistedCache(queryClient);
        }
      } catch {
        // AsyncStorage failure: treat as cold start and proceed normally.
      }

      if (hasCachedData) {
        // Cache is verified to belong to this user: signal ready immediately
        // so the splash screen hides and screens render with cached data while
        // the batch call refreshes in the background.
        setReadyUserId(user.id);
      } else {
        // Cold start or cross-user mismatch: clear any leftover startup data
        // before populating the cache for the current user.
        for (const key of STARTUP_QUERY_KEYS) {
          queryClient.removeQueries({ queryKey: key });
        }
      }

      try {
        const res = await apiRequest("/batch", {
          method: "POST",
          body: JSON.stringify({ requests: STARTUP_REQUESTS }),
        });

        console.timeEnd("[useBatchStartup]");

        if (!res.ok) {
          console.warn("[useBatchStartup] batch responded with status", res.status);
          return;
        }

        const { responses } = (await res.json()) as { responses: BatchResponse[] };

        for (const r of responses) {
          if (r.status !== 200 || r.body == null) continue;
          switch (r.id) {
            case "posts":
              queryClient.setQueryData(["posts"], r.body);
              break;
            case "notifications":
              queryClient.setQueryData(["notifications"], r.body);
              break;
            case "chatrooms":
              queryClient.setQueryData(["chatrooms"], r.body);
              break;
            case "conversations":
              queryClient.setQueryData(["conversations"], r.body);
              break;
            case "marketplace":
              queryClient.setQueryData(["marketplace", "all"], r.body);
              break;
          }
        }

        // Record ownership so the next launch can verify this cache belongs to
        // the current user before showing it.
        await AsyncStorage.setItem(CACHE_OWNER_KEY, user.id).catch(() => {});
      } catch (err) {
        console.timeEnd("[useBatchStartup]");
        console.warn("[useBatchStartup] failed; screens will fetch independently:", err);
      } finally {
        // Mark ready whether or not the batch succeeded — screens fall back to
        // individual fetches gracefully when the cache is empty.
        // If hasCachedData was true this is a no-op state update (same value).
        setReadyUserId(user.id);
      }
    };

    run();
  }, [isLoading, isRestoring, user?.id, token]);

  return { isReady };
}
