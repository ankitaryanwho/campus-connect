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
 * Returns { isReady } which is false until the batch completes (or fails) or
 * the user is not logged in.  _layout.tsx holds the splash screen open while
 * isReady is false so screens never mount before the cache is warm.
 *
 * Session tracking: the batch re-runs when user.id changes (e.g. one user logs
 * out and another logs in).  Stale query data from the previous session is
 * removed before the new batch runs to prevent cross-account data exposure.
 */
export function useBatchStartup(): { isReady: boolean } {
  const { apiRequest, user, token, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);

  // Track which userId the last completed batch was run for.
  // Using a ref (not state) avoids triggering extra renders.
  const lastBatchUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Wait for AsyncStorage auth to finish loading before deciding anything.
    if (isLoading) return;

    if (!user || !token) {
      // Not logged in — reset the session tracker so the next login runs fresh.
      lastBatchUserIdRef.current = null;
      setIsReady(true);
      return;
    }

    // Same user, batch already completed for this session.
    if (lastBatchUserIdRef.current === user.id) return;

    // New user session — clear any stale startup data from a previous user to
    // prevent cross-account data exposure via the TanStack Query cache.
    for (const key of STARTUP_QUERY_KEYS) {
      queryClient.removeQueries({ queryKey: key });
    }

    // Mark not-ready so _layout.tsx holds the splash open while we fetch.
    setIsReady(false);
    lastBatchUserIdRef.current = user.id;

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
        setIsReady(true);
      }
    };

    run();
  }, [isLoading, user?.id, token]);

  return { isReady };
}
