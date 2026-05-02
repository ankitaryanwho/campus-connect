import { useEffect, useRef, useState } from "react";

const INITIAL_DELAY     = 1_000;
const MAX_DELAY         = 30_000;
const STABLE_THRESHOLD  = 10_000;
const HEARTBEAT_TIMEOUT = 35_000;

/**
 * Lightweight SSE client for React Native using XMLHttpRequest.
 *
 * Features:
 *  - Exponential backoff: 1 s → 2 s → 4 s → … → 30 s max.
 *    Delay doubles on every disconnect; resets to 1 s only if the connection
 *    that just closed had been alive for > 10 s (a single received byte does
 *    NOT count — prevents backoff defeat during flapping streams).
 *  - Heartbeat watchdog: if no bytes arrive for 35 s the stream is treated as
 *    stale and a reconnect is triggered (catches silently-dropped TCP streams).
 *  - Missed-message recovery: the ID of the last received message is tracked
 *    and appended as `?since=<id>` on every reconnect so the server can replay
 *    any frames that arrived while the client was disconnected.
 *    `initialMessageId` seeds recovery from the already-loaded REST payload
 *    so that gaps are filled even before the first SSE message arrives.
 *  - Single-flight disconnect: a per-connection `closed` flag ensures that
 *    heartbeat timeout and XHR callbacks never schedule two concurrent
 *    reconnect timers, regardless of XHR abort/error interaction.
 *
 * Returns `{ attempt, nextDelay }` for displaying a reconnecting banner.
 * `attempt` resets to 0 as soon as data arrives on a new connection.
 */
export function useSSE(
  url: string | null,
  token: string | null,
  onMessage: (data: any) => void,
  initialMessageId?: string | null,
): { attempt: number; nextDelay: number } {
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; });

  // Tracks the latest seeded ID from the REST payload. Callers update this
  // as paginated data loads so reconnects always have the best possible cursor.
  const seedIdRef = useRef<string | null>(initialMessageId ?? null);
  useEffect(() => {
    seedIdRef.current = initialMessageId ?? null;
  }, [initialMessageId]);

  const [attempt, setAttempt]     = useState(0);
  const [nextDelay, setNextDelay] = useState(INITIAL_DELAY);

  useEffect(() => {
    if (!url || !token) return;

    let aborted = false;
    let xhr: XMLHttpRequest | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;

    // Backoff state — persists across reconnects; resets only after a stable conn.
    let delay        = INITIAL_DELAY;
    let attemptCount = 0;

    // Tracks the last message ID confirmed via SSE data frames. Starts null and
    // falls back to seedIdRef when building the reconnect URL.
    let lastMessageId: string | null = null;

    function clearHeartbeat() {
      if (heartbeatTimer !== null) { clearTimeout(heartbeatTimer); heartbeatTimer = null; }
    }

    function onDisconnect(connectedAt: number) {
      if (aborted) return;
      // Backoff resets only when the connection that closed was genuinely stable.
      const age = connectedAt > 0 ? Date.now() - connectedAt : 0;
      if (age > STABLE_THRESHOLD) delay = INITIAL_DELAY;

      const currentDelay = delay;
      delay = Math.min(delay * 2, MAX_DELAY);
      attemptCount += 1;
      setAttempt(attemptCount);
      setNextDelay(currentDelay);
      reconnectTimer = setTimeout(connect, currentDelay);
    }

    function buildUrl(): string {
      const base = url as string;
      // Prefer a message received over SSE; fall back to the REST-seeded cursor.
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
      let connectedAt = 0; // set on first byte; 0 = not yet received data
      let closed = false;  // single-flight guard per connection

      // disconnectOnce ensures heartbeat + XHR callbacks never race to schedule
      // two concurrent reconnect timers for the same dropped connection.
      function disconnectOnce() {
        if (closed) return;
        closed = true;
        clearHeartbeat();
        onDisconnect(connectedAt);
      }

      xhr.open("GET", buildUrl(), true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("Accept", "text/event-stream");
      xhr.setRequestHeader("Cache-Control", "no-cache");

      xhr.onprogress = () => {
        // Reset the silence watchdog on every byte arrival (data OR ping comment).
        clearHeartbeat();
        heartbeatTimer = setTimeout(disconnectOnce, HEARTBEAT_TIMEOUT);

        if (connectedAt === 0) {
          connectedAt = Date.now();
          // Hide the retrying banner — we have a live connection again.
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
            // SSE messages take priority over the REST seed for the reconnect cursor.
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

      // Start the initial heartbeat watchdog.
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
