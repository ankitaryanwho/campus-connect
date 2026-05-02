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
}

const OfflineQueueContext = createContext<OfflineQueueContextValue | null>(null);

const STORAGE_KEY = "@offline_queue";
const MAX_RETRIES = 3;

export function OfflineQueueProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const { apiRequest } = useAuth();
  const queryClient = useQueryClient();
  const processingRef = useRef(false);
  const queueRef = useRef<QueueItem[]>([]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const persistQueue = useCallback((items: QueueItem[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {});
  }, []);

  const updateQueue = useCallback(
    (updater: (prev: QueueItem[]) => QueueItem[]) => {
      setQueue(prev => {
        const next = updater(prev);
        persistQueue(next);
        return next;
      });
    },
    [persistQueue],
  );

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) return;
      try {
        const items: QueueItem[] = JSON.parse(raw);
        const reset = items.map(i =>
          i.status === "failed" && i.retries < MAX_RETRIES
            ? { ...i, status: "pending" as const }
            : i,
        );
        setQueue(reset);
      } catch {}
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      const pending = queueRef.current.filter(i => i.status === "pending");
      for (const item of pending) {
        try {
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
          updateQueue(prev => prev.filter(i => i.id !== item.id));
        } catch {
          const newRetries = item.retries + 1;
          if (newRetries >= MAX_RETRIES) {
            updateQueue(prev =>
              prev.map(i =>
                i.id === item.id ? { ...i, status: "failed", retries: newRetries } : i,
              ),
            );
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
          } else {
            updateQueue(prev =>
              prev.map(i =>
                i.id === item.id ? { ...i, retries: newRetries } : i,
              ),
            );
          }
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, [apiRequest, queryClient, updateQueue]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const online =
        state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(prev => {
        if (!prev && online) {
          setTimeout(() => processQueue(), 500);
        }
        return online;
      });
    });
    return () => unsub();
  }, [processQueue]);

  const enqueue = useCallback(
    (type: QueueItemType, payload: any): string => {
      const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item: QueueItem = { id, type, payload, status: "pending", retries: 0 };
      updateQueue(prev => [...prev, item]);
      return id;
    },
    [updateQueue],
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

  const pendingPosts = queue.filter(i => i.type === "post");

  return (
    <OfflineQueueContext.Provider
      value={{ isOnline, pendingPosts, enqueue, retryItem, getItemStatus }}
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
