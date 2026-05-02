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

const STARTUP_REQUESTS: BatchRequest[] = [
  { id: "posts",         path: "/posts" },
  { id: "notifications", path: "/notifications" },
  { id: "chatrooms",     path: "/chat/chatrooms" },
  { id: "conversations", path: "/chat/conversations" },
  { id: "marketplace",   path: "/marketplace" },
];

/**
 * Fires a single /api/batch call once per auth session after auth has finished
 * loading, and pre-populates TanStack Query's cache with the results.
 *
 * Returns { isReady } which is false until either:
 *   - the batch completes (success or failure), or
 *   - auth loads and no user is logged in.
 *
 * _layout.tsx uses isReady to keep the splash screen visible while the batch
 * is in flight, ensuring tab screens mount with data already in the cache.
 */
export function useBatchStartup(): { isReady: boolean } {
  const { apiRequest, user, token, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);
  const didRunRef = useRef(false);

  useEffect(() => {
    // Wait for AsyncStorage auth to finish loading before deciding anything.
    if (isLoading) return;

    // Not logged in — nothing to prefetch.
    if (!user || !token) {
      setIsReady(true);
      return;
    }

    // Only run once per auth session.
    if (didRunRef.current) return;
    didRunRef.current = true;

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
