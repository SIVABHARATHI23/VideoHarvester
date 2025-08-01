import { useEffect, useRef, useState } from "react";
import type { WebSocketMessage } from "@shared/schema";

export function useWebSocket(onMessage?: (message: WebSocketMessage) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  const connect = () => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // Ensure we use the correct host and port
      const host = window.location.hostname || 'localhost';
      const port = window.location.port || '5000';
      const wsUrl = `${protocol}//${host}:${port}/ws`;
      console.log('Connecting to WebSocket:', wsUrl);
      ws.current = new WebSocket(wsUrl);
      ws.current.onopen = () => {
        setIsConnected(true);
        console.log("WebSocket connected");
      };
      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };
      ws.current.onclose = (event) => {
        setIsConnected(false);
        console.log("WebSocket disconnected", event.code, event.reason);
        // Reconnect after 3 seconds, but only if it wasn't a normal closure
        if (event.code !== 1000) {
          reconnectTimeout.current = setTimeout(() => {
            console.log("Attempting to reconnect WebSocket...");
            connect();
          }, 3000);
        }
      };
      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
    }
  };

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return { isConnected };
}
