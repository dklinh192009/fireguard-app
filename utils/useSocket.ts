import { WS_URL } from '@/constants/api';
import { getToken } from '@/utils/auth';
import { useCallback, useEffect, useRef, useState } from 'react';

export type FireNode = {
  id: string;
  nodeId: string;
  label: string;
  location: string;
  status: 'normal' | 'fire';
  smoke: number;
  connected: boolean;
  ownerId?: string | null;
};

type AlertEntry = {
  id: string;
  type: string;
  label: string;
  location: string;
  message: string;
  timestamp: string;
};

// Hook dùng chung: kết nối WebSocket tới server.js, tự đăng nhập bằng token,
// tự nghe các sự kiện real-time (nodes_update, fire_alert, sensor_update...)
export function useSocket() {
  const [nodes, setNodes] = useState<FireNode[]>([]);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(async () => {
    const token = await getToken();
    if (!token) return; // chưa đăng nhập -> không kết nối

    const ws = new WebSocket(`${WS_URL}/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'browser_connect' }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'nodes_update':
          setNodes(msg.nodes || []);
          break;
        case 'alert_log':
          setAlerts(msg.log || []);
          break;
        case 'sensor_update':
          setNodes((prev) =>
            prev.map((n) => (n.nodeId === msg.nodeId ? { ...n, smoke: msg.smoke } : n))
          );
          break;
        case 'fire_alert':
          setNodes(msg.nodes || []);
          setAlerts((prev) => [msg, ...prev].slice(0, 50));
          break;
        case 'fire_clear':
          setNodes(msg.nodes || []);
          break;
        default:
          break;
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Mất kết nối -> tự thử lại sau 3 giây (mạng chập chờn, server restart...)
      retryTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [connect]);

  return { nodes, alerts, connected };
}