import { useEffect, useRef, useState } from "react";
import type { WebSocketMessage } from "@shared/schema";
import { WS_URL } from "@/lib/api";


export function useWebSocket(onMessage?: (message: WebSocketMessage) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    try {
      const wsUrl = WS_URL;
      console.log('Connecting to WebSocket:', wsUrl);


      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        console.log("WebSocket connected successfully");
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message.type, 'id' in message ? message.id : 'N/A');
          onMessage?.(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        console.log("WebSocket disconnected", event.code, event.reason);

        // Reconnect logic with exponential backoff
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          reconnectAttempts.current++;

          console.log(`Attempting to reconnect WebSocket in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})...`);

          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error("Max WebSocket reconnection attempts reached");
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
