import { useEffect, useRef } from "react";
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

export function useBatchStartup(): void {
  const { apiRequest, user, token } = useAuth();
  const queryClient = useQueryClient();
  const didRunRef = useRef(false);

  useEffect(() => {
    if (!user || !token || didRunRef.current) return;
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
          console.warn("[useBatchStartup] batch request failed with status", res.status);
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
        console.warn("[useBatchStartup] failed, screens will fetch independently:", err);
      }
    };

    run();
  }, [user?.id, token]);
}
