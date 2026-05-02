import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface BatchRequest {
  id: string;
  path: string;
}

interface BatchResponse {
  id: string;
  status: number;
  body: unknown;
}

/**
 * Read-only GET endpoints fetched on startup.
 *
 * Push token registration is a mutation (POST) and is intentionally excluded.
 * It fires independently from NotificationProvider on every launch, which is
 * correct: it must always execute so the device mapping stays current even
 * when startup cache is already warm.
 *
 * These five requests replace the individual useQuery round trips that would
 * otherwise fire when each tab screen mounts.
 */
const STARTUP_REQUESTS: BatchRequest[] = [
  { id: "posts",         path: "/posts" },
  { id: "notifications", path: "/notifications" },
  { id: "chatrooms",     path: "/chat/chatrooms" },
  { id: "conversations", path: "/chat/conversations" },
  { id: "marketplace",   path: "/marketplace" },
];

const STARTUP_QUERY_KEYS = [
  ["posts"],
  ["notifications"],
  ["chatrooms"],
  ["conversations"],
  ["marketplace", "all"],
] as const;

/**
 * Fires a single /api/batch call once per user session after auth has loaded,
 * pre-populating TanStack Query's cache so tab screens mount with data.
 *
 * isReady is derived synchronously from `readyUserId` state rather than stored
 * as separate boolean state.  This means isReady flips false the moment
 * user.id changes (before any async effect runs), eliminating the post-login
 * race where screens could mount with stale or empty cache.
 *
 * Session tracking: the batch re-runs when user.id changes (e.g. one user logs
 * out and another logs in).  Stale query data from the previous session is
 * removed before the new batch runs to prevent cross-account data exposure.
 */
export function useBatchStartup(): { isReady: boolean } {
  const { apiRequest, user, token, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Which user ID the cache was last warmed for.  null = "not yet warmed".
  // State (not a ref) so isReady is always derived synchronously from it.
  const [readyUserId, setReadyUserId] = useState<string | null>(null);

  // Ref mirror used inside the effect to guard against concurrent runs without
  // adding readyUserId to the effect dependency array.
  const readyUserIdRef = useRef<string | null>(null);

  // Synchronously derived: flips false immediately when user.id changes, before
  // the async effect fires.  Logged-out users are always considered ready.
  const isReady = !isLoading && (!user || readyUserId === user.id);

  useEffect(() => {
    if (isLoading) return;

    if (!user || !token) {
      // Logged out — reset so the next login runs a fresh batch.
      readyUserIdRef.current = null;
      if (readyUserId !== null) setReadyUserId(null);
      return;
    }

    // Batch already completed or is in progress for this user.
    if (readyUserIdRef.current === user.id) return;

    // Lock immediately to prevent concurrent runs on rapid re-renders.
    readyUserIdRef.current = user.id;

    // Clear stale startup data from the previous user before populating the
    // cache for the new user (prevents cross-account data exposure).
    for (const key of STARTUP_QUERY_KEYS) {
      queryClient.removeQueries({ queryKey: key });
    }

    const run = async () => {
      console.time("[useBatchStartup]");
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
      } catch (err) {
        console.timeEnd("[useBatchStartup]");
        console.warn("[useBatchStartup] failed; screens will fetch independently:", err);
      } finally {
        // Mark ready whether or not the batch succeeded — screens fall back to
        // individual fetches gracefully when the cache is empty.
        setReadyUserId(user.id);
      }
    };

    run();
  }, [isLoading, user?.id, token]);

  return { isReady };
}
