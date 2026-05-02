import { useEffect, useRef, useState } from "react";

const INITIAL_DELAY     = 1_000;
const MAX_DELAY         = 30_000;
const STABLE_THRESHOLD  = 10_000;
const HEARTBEAT_TIMEOUT = 35_000;

export function useSSE(
  url: string | null,
  token: string | null,
  onMessage: (data: any) => void,
  initialMessageId?: string | null,
): { attempt: number; nextDelay: number } {
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; });

  const seedIdRef = useRef<string | null>(initialMessageId ?? null);
  useEffect(() => { seedIdRef.current = initialMessageId ?? null; }, [initialMessageId]);

  const [attempt, setAttempt]     = useState(0);
  const [nextDelay, setNextDelay] = useState(INITIAL_DELAY);

  useEffect(() => {
    if (!url || !token) return;

    let aborted = false;
    let xhr: XMLHttpRequest | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;

    let delay        = INITIAL_DELAY;
    let attemptCount = 0;
    let lastMessageId: string | null = null;

    function clearHeartbeat() {
      if (heartbeatTimer !== null) { clearTimeout(heartbeatTimer); heartbeatTimer = null; }
    }

    function onDisconnect(connectedAt: number) {
      if (aborted) return;
      const age = connectedAt > 0 ? Date.now() - connectedAt : 0;
      if (age > STABLE_THRESHOLD) {
        delay        = INITIAL_DELAY;
        attemptCount = 0;
      }
      const currentDelay = delay;
      delay = Math.min(delay * 2, MAX_DELAY);
      attemptCount += 1;
      setAttempt(attemptCount);
      setNextDelay(currentDelay);
      reconnectTimer = setTimeout(connect, currentDelay);
    }

    function buildUrl(): string {
      const base = url as string;
      const id = lastMessageId ?? seedIdRef.current;
      if (!id) return base;
      const sep = base.includes("?") ? "&" : "?";
      return `${base}${sep}since=${encodeURIComponent(id)}`;
    }

    function connect() {
      if (aborted) return;

      xhr = new XMLHttpRequest();
      let lastLen = 0;
      let receiveBuffer = "";
      let connectedAt = 0;
      let closed = false;

      function disconnectOnce() {
        if (closed) return;
        closed = true;
        clearHeartbeat();
        xhr?.abort();
        onDisconnect(connectedAt);
      }

      xhr.open("GET", buildUrl(), true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("Accept", "text/event-stream");
      xhr.setRequestHeader("Cache-Control", "no-cache");

      xhr.onprogress = () => {
        clearHeartbeat();
        heartbeatTimer = setTimeout(disconnectOnce, HEARTBEAT_TIMEOUT);

        if (connectedAt === 0) {
          connectedAt = Date.now();
          if (!aborted) setAttempt(0);
        }

        receiveBuffer += xhr!.responseText.slice(lastLen);
        lastLen = xhr!.responseText.length;

        const frames = receiveBuffer.split("\n\n");
        receiveBuffer = frames.pop() ?? "";

        for (const frame of frames) {
          const dataLine = frame.split("\n").find(l => l.startsWith("data: "));
          if (!dataLine) continue;
          try {
            const parsed = JSON.parse(dataLine.slice(6));
            if (parsed?.id && typeof parsed.id === "string") {
              lastMessageId = parsed.id;
            }
            onMessageRef.current(parsed);
          } catch {}
        }
      };

      xhr.onerror   = () => disconnectOnce();
      xhr.ontimeout = () => disconnectOnce();
      xhr.onload    = () => disconnectOnce();

      xhr.send();
      heartbeatTimer = setTimeout(disconnectOnce, HEARTBEAT_TIMEOUT);
    }

    connect();

    return () => {
      aborted = true;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      clearHeartbeat();
      xhr?.abort();
    };
  }, [url, token]);

  return { attempt, nextDelay };
}
