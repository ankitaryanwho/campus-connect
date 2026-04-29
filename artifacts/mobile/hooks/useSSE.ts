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

      xhr.onprogress = () => {
        const chunk = xhr.responseText.slice(lastLen);
        lastLen = xhr.responseText.length;

        const lines = chunk.split("\n");
        let buffer = "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            buffer = line.slice(6);
          } else if (line === "" && buffer) {
            try {
              onMessageRef.current(JSON.parse(buffer));
            } catch {}
            buffer = "";
          }
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
