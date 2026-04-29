import { useEffect, useRef } from "react";

/**
 * Lightweight SSE client for React Native using XMLHttpRequest.
 * Reconnects automatically on close/error with exponential-ish backoff.
 * Safe to call with null url/token — simply does nothing until both are set.
 */
export function useSSE(
  url: string | null,
  token: string | null,
  onMessage: (data: any) => void,
) {
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; });

  useEffect(() => {
    if (!url || !token) return;

    let aborted = false;
    let xhr: XMLHttpRequest;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      if (aborted) return;
      xhr = new XMLHttpRequest();
      let lastLen = 0;

      xhr.open("GET", url as string, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("Accept", "text/event-stream");
      xhr.setRequestHeader("Cache-Control", "no-cache");

      // `receiveBuffer` persists across onprogress calls so split frames are reassembled.
      // SSE frames are separated by "\n\n"; lines within a frame start with "data: ".
      let receiveBuffer = "";

      xhr.onprogress = () => {
        receiveBuffer += xhr.responseText.slice(lastLen);
        lastLen = xhr.responseText.length;

        // Split on frame boundaries (double newline)
        const frames = receiveBuffer.split("\n\n");
        // The last element may be incomplete — keep it in the buffer
        receiveBuffer = frames.pop() ?? "";

        for (const frame of frames) {
          const dataLine = frame.split("\n").find(l => l.startsWith("data: "));
          if (!dataLine) continue;
          try {
            onMessageRef.current(JSON.parse(dataLine.slice(6)));
          } catch {}
        }
      };

      xhr.onerror = () => {
        if (!aborted) reconnectTimer = setTimeout(connect, 3000);
      };
      xhr.ontimeout = () => {
        if (!aborted) reconnectTimer = setTimeout(connect, 3000);
      };
      xhr.onload = () => {
        if (!aborted) reconnectTimer = setTimeout(connect, 1000);
      };

      xhr.send();
    }

    connect();

    return () => {
      aborted = true;
      clearTimeout(reconnectTimer);
      xhr?.abort();
    };
  }, [url, token]);
}
