import { useEffect, useRef, useState } from "react";

const INITIAL_DELAY   = 1_000;
const MAX_DELAY       = 30_000;
const STABLE_THRESHOLD = 10_000;
const HEARTBEAT_TIMEOUT = 35_000;

/**
 * Lightweight SSE client for React Native using XMLHttpRequest.
 *
 * Features:
 *  - Exponential backoff: 1 s → 2 s → 4 s → … → 30 s max.
 *  - Stable-connection reset: delay resets to 1 s if the connection lasted > 10 s.
 *  - Heartbeat watchdog: if no bytes arrive for 35 s the stream is considered
 *    stale and a reconnect is triggered (catches silently-dropped TCP streams).
 *  - Missed-message recovery: the ID of the last received message is tracked
 *    and appended as `?since=<id>` on every reconnect so the server can replay
 *    any frames that arrived while the client was disconnected.
 *
 * Returns `{ attempt, nextDelay }` for displaying a reconnecting banner.
 * `attempt` resets to 0 as soon as a new connection starts delivering data.
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

    let delay          = INITIAL_DELAY;
    let attemptCount   = 0;
    let connectedAt    = 0;
    let lastMessageId: string | null = null;

    function clearHeartbeat() {
      if (heartbeatTimer !== null) { clearTimeout(heartbeatTimer); heartbeatTimer = null; }
    }

    function resetHeartbeat() {
      clearHeartbeat();
      heartbeatTimer = setTimeout(() => {
        // No bytes for 35 s — stream is stale; force a reconnect.
        xhr?.abort();
        onDisconnect(false);
      }, HEARTBEAT_TIMEOUT);
    }

    function onDisconnect(fromError: boolean) {
      clearHeartbeat();
      if (aborted) return;
      const age = connectedAt ? Date.now() - connectedAt : 0;
      const wasStable = age > STABLE_THRESHOLD;
      if (wasStable) delay = INITIAL_DELAY;
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
      let firstData = true;
      connectedAt = 0;

      xhr.open("GET", buildUrl(), true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("Accept", "text/event-stream");
      xhr.setRequestHeader("Cache-Control", "no-cache");

      // `receiveBuffer` persists across onprogress calls so split frames are reassembled.
      // SSE frames are separated by "\n\n"; lines within a frame start with "data: ".
      // Comment frames (e.g. `: ping`) still trigger onprogress — enough to reset the watchdog.
      xhr.onprogress = () => {
        // Reset the silence watchdog on every byte arrival (data OR ping comment).
        resetHeartbeat();

        if (firstData) {
          firstData = false;
          connectedAt = Date.now();
          // Connection (re-)established — hide the retrying banner.
          if (!aborted) { setAttempt(0); }
          // Delay resets on the NEXT disconnect based on connection age (handled in onDisconnect).
          delay = INITIAL_DELAY;
          attemptCount = 0;
        }

        receiveBuffer += xhr!.responseText.slice(lastLen);
        lastLen = xhr!.responseText.length;

        // Split on frame boundaries (double newline)
        const frames = receiveBuffer.split("\n\n");
        // The last element may be incomplete — keep it in the buffer
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

      xhr.onerror   = () => onDisconnect(true);
      xhr.ontimeout = () => onDisconnect(true);
      xhr.onload    = () => { clearHeartbeat(); if (!aborted) onDisconnect(false); };

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
