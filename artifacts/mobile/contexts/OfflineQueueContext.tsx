import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";

export type QueueItemType = "dm_message" | "chatroom_message" | "post";

export interface QueueItem {
  id: string;
  type: QueueItemType;
  payload: any;
  status: "pending" | "failed";
  retries: number;
}

interface OfflineQueueContextValue {
  isOnline: boolean;
  pendingPosts: QueueItem[];
  enqueue: (type: QueueItemType, payload: any) => string;
  retryItem: (id: string) => void;
  getItemStatus: (id: string) => "pending" | "failed" | null;
  getQueuedMessages: (
    targetId: string,
    type: "dm_message" | "chatroom_message",
  ) => QueueItem[];
}

const OfflineQueueContext = createContext<OfflineQueueContextValue | null>(null);

const STORAGE_KEY = "@offline_queue";
const MAX_RETRIES = 3;

// Exponential backoff delays between per-item retry attempts (ms)
const RETRY_DELAYS = [1000, 2000, 4000];

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

export function OfflineQueueProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const isOnlineRef = useRef(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const { apiRequest } = useAuth();
  const queryClient = useQueryClient();
  const processingRef = useRef(false);
  const queueRef = useRef<QueueItem[]>([]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  const persistQueue = useCallback((items: QueueItem[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {});
  }, []);

  const updateQueue = useCallback(
    (updater: (prev: QueueItem[]) => QueueItem[]) => {
      setQueue(prev => {
        const next = updater(prev);
        persistQueue(next);
        queueRef.current = next;
        return next;
      });
    },
    [persistQueue],
  );

  // ─── Core send helpers ───────────────────────────────────────────────────────

  /** Send one queue item; throws on failure so caller can retry. */
  const sendItem = useCallback(
    async (item: QueueItem) => {
      if (item.type === "dm_message") {
        const { conversationId, content } = item.payload;
        const res = await apiRequest(
          `/chat/conversations/${conversationId}/messages`,
          { method: "POST", body: JSON.stringify({ content }) },
        );
        if (!res.ok) throw new Error("send failed");
        const newMsg = await res.json();
        queryClient.setQueryData(["messages", conversationId], (old: any) => {
          if (!old?.pages) return old;
          const fp = old.pages[0] ?? { messages: [], nextCursor: null };
          const existing: any[] = fp.messages ?? [];
          const without = existing.filter(m => m.id !== item.id);
          const already = without.some(m => m.id === newMsg.id);
          const updated = already
            ? without
            : [{ ...newMsg, isSelf: true }, ...without];
          return { ...old, pages: [{ ...fp, messages: updated }, ...old.pages.slice(1)] };
        });
      } else if (item.type === "chatroom_message") {
        const { roomId, content } = item.payload;
        const res = await apiRequest(`/chat/chatrooms/${roomId}/messages`, {
          method: "POST",
          body: JSON.stringify({ content }),
        });
        if (!res.ok) throw new Error("send failed");
        const newMsg = await res.json();
        queryClient.setQueryData(["chatroom-messages", roomId], (old: any) => {
          if (!old?.pages) return old;
          const fp = old.pages[0] ?? { messages: [], nextCursor: null };
          const existing: any[] = fp.messages ?? [];
          const without = existing.filter(m => m.id !== item.id);
          const already = without.some(m => m.id === newMsg.id);
          const updated = already
            ? without
            : [{ ...newMsg, isSelf: true }, ...without];
          return { ...old, pages: [{ ...fp, messages: updated }, ...old.pages.slice(1)] };
        });
      } else if (item.type === "post") {
        const { content, mediaUrls, isAnonymous, category } = item.payload;
        const res = await apiRequest("/posts", {
          method: "POST",
          body: JSON.stringify({
            content,
            mediaUrls: mediaUrls ?? [],
            isAnonymous,
            category,
          }),
        });
        if (!res.ok) throw new Error("post failed");
        await res.json();
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      }
    },
    [apiRequest, queryClient],
  );

  /** Mark a cache message as failed so the UI reflects it. */
  const markCacheFailed = useCallback(
    (item: QueueItem) => {
      if (item.type === "dm_message") {
        const { conversationId } = item.payload;
        queryClient.setQueryData(["messages", conversationId], (old: any) => {
          if (!old?.pages) return old;
          const fp = old.pages[0];
          if (!fp) return old;
          const messages = (fp.messages ?? []).map((m: any) =>
            m.id === item.id ? { ...m, status: "failed" } : m,
          );
          return { ...old, pages: [{ ...fp, messages }, ...old.pages.slice(1)] };
        });
      } else if (item.type === "chatroom_message") {
        const { roomId } = item.payload;
        queryClient.setQueryData(["chatroom-messages", roomId], (old: any) => {
          if (!old?.pages) return old;
          const fp = old.pages[0];
          if (!fp) return old;
          const messages = (fp.messages ?? []).map((m: any) =>
            m.id === item.id ? { ...m, status: "failed" } : m,
          );
          return { ...old, pages: [{ ...fp, messages }, ...old.pages.slice(1)] };
        });
      }
    },
    [queryClient],
  );

  // ─── Process queue ───────────────────────────────────────────────────────────

  /**
   * Iterate all pending items and attempt to send each one, retrying up to
   * MAX_RETRIES times with exponential back-off within a single invocation.
   * If the device goes offline mid-loop we stop early and leave items pending.
   */
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      const pending = queueRef.current.filter(i => i.status === "pending");
      for (const item of pending) {
        let attempt = 0;
        let succeeded = false;
        while (attempt < MAX_RETRIES) {
          // Bail out if we've lost connectivity mid-loop
          if (!isOnlineRef.current) break;
          try {
            await sendItem(item);
            updateQueue(prev => prev.filter(i => i.id !== item.id));
            succeeded = true;
            break;
          } catch {
            attempt += 1;
            if (attempt < MAX_RETRIES) {
              await sleep(RETRY_DELAYS[attempt - 1] ?? 4000);
            }
          }
        }
        if (!succeeded && isOnlineRef.current) {
          // Exhausted all attempts while online → permanently failed
          updateQueue(prev =>
            prev.map(i =>
              i.id === item.id
                ? { ...i, status: "failed", retries: MAX_RETRIES }
                : i,
            ),
          );
          markCacheFailed(item);
        } else if (!succeeded) {
          // Went offline mid-retry; increment retries and leave as pending for
          // next reconnect
          updateQueue(prev =>
            prev.map(i =>
              i.id === item.id
                ? { ...i, retries: Math.min(i.retries + attempt, MAX_RETRIES - 1) }
                : i,
            ),
          );
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, [sendItem, markCacheFailed, updateQueue]);

  // ─── Load persisted queue & process if already online ───────────────────────

  const processQueueRef = useRef(processQueue);
  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) return;
      try {
        const items: QueueItem[] = JSON.parse(raw);
        // Reset any stuck "failed" items so they get one more automatic attempt
        const reset = items.map(i =>
          i.status === "failed" && i.retries < MAX_RETRIES
            ? { ...i, status: "pending" as const }
            : i,
        );
        setQueue(reset);
        queueRef.current = reset;
        // If we're already online and have pending items, process them
        if (reset.some(i => i.status === "pending")) {
          NetInfo.fetch().then(state => {
            const online =
              state.isConnected === true && state.isInternetReachable !== false;
            if (online) {
              setTimeout(() => processQueueRef.current(), 1000);
            }
          });
        }
      } catch {}
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── NetInfo listener ────────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const online =
        state.isConnected === true && state.isInternetReachable !== false;
      isOnlineRef.current = online;
      setIsOnline(prev => {
        if (!prev && online) {
          setTimeout(() => processQueue(), 500);
        }
        return online;
      });
    });
    return () => unsub();
  }, [processQueue]);

  // ─── Public API ──────────────────────────────────────────────────────────────

  const enqueue = useCallback(
    (type: QueueItemType, payload: any): string => {
      const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item: QueueItem = { id, type, payload, status: "pending", retries: 0 };
      updateQueue(prev => [...prev, item]);
      // Send immediately if already online
      if (isOnlineRef.current) {
        setTimeout(() => processQueue(), 100);
      }
      return id;
    },
    [updateQueue, processQueue],
  );

  const retryItem = useCallback(
    (id: string) => {
      updateQueue(prev =>
        prev.map(i => (i.id === id ? { ...i, status: "pending", retries: 0 } : i)),
      );
      setTimeout(() => processQueue(), 100);
    },
    [updateQueue, processQueue],
  );

  const getItemStatus = useCallback(
    (id: string): "pending" | "failed" | null => {
      const item = queueRef.current.find(i => i.id === id);
      return item?.status ?? null;
    },
    [],
  );

  /**
   * Returns all queued messages for a given conversation/room so chat screens
   * can hydrate them into the cache after a cold start.
   */
  const getQueuedMessages = useCallback(
    (targetId: string, type: "dm_message" | "chatroom_message"): QueueItem[] => {
      return queueRef.current.filter(
        i => i.type === type &&
          (type === "dm_message"
            ? i.payload.conversationId === targetId
            : i.payload.roomId === targetId),
      );
    },
    [],
  );

  const pendingPosts = queue.filter(i => i.type === "post");

  return (
    <OfflineQueueContext.Provider
      value={{ isOnline, pendingPosts, enqueue, retryItem, getItemStatus, getQueuedMessages }}
    >
      {children}
    </OfflineQueueContext.Provider>
  );
}

export function useOfflineQueue() {
  const ctx = useContext(OfflineQueueContext);
  if (!ctx) throw new Error("useOfflineQueue must be used within OfflineQueueProvider");
  return ctx;
}
