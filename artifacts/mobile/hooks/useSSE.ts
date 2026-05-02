import { useEffect, useRef, useState } from "react";

const INITIAL_DELAY    = 1_000;
const MAX_DELAY        = 30_000;
const STABLE_THRESHOLD = 10_000;
const HEARTBEAT_TIMEOUT = 35_000;

/**
 * Lightweight SSE client for React Native using XMLHttpRequest.
 *
 * Features:
 *  - Exponential backoff: 1 s → 2 s → 4 s → … → 30 s max.
 *    Delay doubles on every disconnect. Only resets to 1 s if the previous
 *    connection remained alive for > 10 s — a single received byte does NOT
 *    count as "stable" (that would defeat back-off during flapping streams).
 *  - Heartbeat watchdog: if no bytes arrive for 35 s the stream is treated as
 *    stale and a reconnect is triggered (catches silently-dropped TCP streams).
 *  - Missed-message recovery: the ID of the last received message is tracked and
 *    appended as `?since=<id>` on every reconnect so the server can replay any
 *    frames that arrived while the client was disconnected.
 *
 * Returns `{ attempt, nextDelay }` for displaying a reconnecting banner.
 * `attempt` is 0 while connected (banner hidden) and > 0 while waiting to reconnect.
 */
export function useSSE(
  url: string | null,
  token: string | null,
  onMessage: (data: any) => void,
): { attempt: number; nextDelay: number } {
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; });

  const [attempt, setAttempt]     = useState(0);
  const [nextDelay, setNextDelay] = useState(INITIAL_DELAY);

  useEffect(() => {
    if (!url || !token) return;

    let aborted          = false;
    let xhr: XMLHttpRequest | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;

    // Backoff state — these persist across reconnects and are only reset when
    // a disconnect follows a stable connection (> STABLE_THRESHOLD ms of uptime).
    let delay          = INITIAL_DELAY;
    let attemptCount   = 0;

    // Per-connection tracking
    let connectedAt: number = 0;   // set on first byte; 0 means not yet connected
    let lastMessageId: string | null = null;

    function clearHeartbeat() {
      if (heartbeatTimer !== null) { clearTimeout(heartbeatTimer); heartbeatTimer = null; }
    }

    function resetHeartbeat() {
      clearHeartbeat();
      heartbeatTimer = setTimeout(() => {
        // No bytes for 35 s — stream is stale; force a reconnect.
        xhr?.abort();
        onDisconnect();
      }, HEARTBEAT_TIMEOUT);
    }

    function onDisconnect() {
      clearHeartbeat();
      if (aborted) return;

      // If the connection was stable for > STABLE_THRESHOLD, reset backoff.
      // A connectedAt of 0 means we never received a byte — do NOT reset.
      const age = connectedAt > 0 ? Date.now() - connectedAt : 0;
      if (age > STABLE_THRESHOLD) {
        delay = INITIAL_DELAY;
      }

      const currentDelay = delay;
      delay = Math.min(delay * 2, MAX_DELAY);
      attemptCount += 1;

      if (!aborted) {
        setAttempt(attemptCount);
        setNextDelay(currentDelay);
      }

      reconnectTimer = setTimeout(connect, currentDelay);
    }

    function buildUrl(): string {
      const base = url as string;
      if (!lastMessageId) return base;
      const sep = base.includes("?") ? "&" : "?";
      return `${base}${sep}since=${encodeURIComponent(lastMessageId)}`;
    }

    function connect() {
      if (aborted) return;
      xhr = new XMLHttpRequest();
      let lastLen = 0;
      let receiveBuffer = "";
      connectedAt = 0;      // reset; will be set on first byte of THIS connection

      xhr.open("GET", buildUrl(), true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("Accept", "text/event-stream");
      xhr.setRequestHeader("Cache-Control", "no-cache");

      xhr.onprogress = () => {
        // Reset the silence watchdog on every byte arrival (data OR ping comment).
        resetHeartbeat();

        // Record the time we first received data on this connection.
        // Note: we do NOT reset `delay` or `attemptCount` here — that would
        // defeat backoff for flapping connections. We only hide the banner.
        if (connectedAt === 0) {
          connectedAt = Date.now();
          if (!aborted) setAttempt(0);
        }

        receiveBuffer += xhr!.responseText.slice(lastLen);
        lastLen = xhr!.responseText.length;

        // Split on SSE frame boundaries (double newline)
        const frames = receiveBuffer.split("\n\n");
        // Last element may be an incomplete frame — keep it in the buffer
        receiveBuffer = frames.pop() ?? "";

        for (const frame of frames) {
          const dataLine = frame.split("\n").find(l => l.startsWith("data: "));
          if (!dataLine) continue;
          try {
            const parsed = JSON.parse(dataLine.slice(6));
            // Track the last received message ID for missed-message recovery on reconnect.
            if (parsed?.id && typeof parsed.id === "string") {
              lastMessageId = parsed.id;
            }
            onMessageRef.current(parsed);
          } catch {}
        }
      };

      xhr.onerror   = () => { clearHeartbeat(); if (!aborted) onDisconnect(); };
      xhr.ontimeout = () => { clearHeartbeat(); if (!aborted) onDisconnect(); };
      xhr.onload    = () => { clearHeartbeat(); if (!aborted) onDisconnect(); };

      xhr.send();
      resetHeartbeat();
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
