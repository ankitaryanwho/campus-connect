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
];

/**
 * Fires a single /api/batch call immediately after auth is confirmed and
 * pre-populates TanStack Query's cache with the results.  Individual screens
 * will hit the cache on first mount rather than making separate network calls.
 *
 * Returns `isReady: true` once the batch completes (success or failure) or when
 * the user is not logged in.  The root layout uses this to delay hiding the
 * splash screen so that the tab screens always mount with data already cached.
 */
export function useBatchStartup(): { isReady: boolean } {
  const { apiRequest, user, token } = useAuth();
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);
  const didRunRef = useRef(false);

  useEffect(() => {
    // Not logged in — nothing to prefetch; mark ready so the splash can hide.
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
          }
        }
      } catch (err) {
        console.timeEnd("[useBatchStartup]");
        console.warn("[useBatchStartup] failed; screens will fetch independently:", err);
      } finally {
        // Always mark ready — either we pre-loaded the cache or screens fall back.
        setIsReady(true);
      }
    };

    run();
  }, [user?.id, token]);

  return { isReady };
}
