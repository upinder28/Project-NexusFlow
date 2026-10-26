import { useEffect, useRef, useState } from 'react';

// Connects to the WebSocket and returns the latest parsed message.
// Auto-reconnects every 3s on disconnect.
export default function useLiveStream(url = 'ws://localhost:5000') {
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    let timer;
    const connect = () => {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try { setLastMessage(JSON.parse(e.data)); } catch {}
      };
      ws.onclose = () => { timer = setTimeout(connect, 3000); };
    };
    connect();
    return () => { wsRef.current?.close(); clearTimeout(timer); };
  }, [url]);

  return lastMessage;
}
