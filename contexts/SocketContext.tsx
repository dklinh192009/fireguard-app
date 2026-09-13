import { WS_URL } from '@/constants/api';
import { getToken } from '@/utils/auth';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

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

type SocketContextValue = {
  nodes: FireNode[];
  alerts: AlertEntry[];
  connected: boolean;
  fireAlert: AlertEntry | null;   // cảnh báo cháy MỚI NHẤT chưa đóng, dùng để hiện overlay toàn màn hình
  dismissFireAlert: () => void;
  sendCommand: (payload: object) => void; // gửi lệnh đi (báo cháy thử, TTS...) qua ĐÚNG 1 kết nối đang mở
};

const SocketContext = createContext<SocketContextValue | null>(null);

// Provider này chỉ nên đặt DUY NHẤT 1 lần ở gốc app (app/(tabs)/_layout.tsx) —
// mọi màn hình con dùng chung 1 kết nối WebSocket qua hook useSocketContext() bên dưới,
// thay vì mỗi màn hình tự mở kết nối riêng như trước (vừa tốn tài nguyên, vừa không có
// "nơi chung" để hiện cảnh báo cháy toàn app)
export function SocketProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<FireNode[]>([]);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [fireAlert, setFireAlert] = useState<AlertEntry | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

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
          setNodes((prev) => prev.map((n) => (n.nodeId === msg.nodeId ? { ...n, smoke: msg.smoke } : n)));
          break;
        case 'fire_alert':
          setNodes(msg.nodes || []);
          setAlerts((prev) => [msg, ...prev].slice(0, 50));
          setFireAlert(msg); // -> kích hoạt overlay toàn màn hình, xem components/FireAlertOverlay.tsx
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

  const sendCommand = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const dismissFireAlert = useCallback(() => setFireAlert(null), []);

  return (
    <SocketContext.Provider value={{ nodes, alerts, connected, fireAlert, dismissFireAlert, sendCommand }}>
      {children}
    </SocketContext.Provider>
  );
}

// Dùng hook này trong MỌI màn hình thay cho useSocket() cũ
export function useSocketContext() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocketContext phải được gọi bên trong <SocketProvider>');
  return ctx;
}