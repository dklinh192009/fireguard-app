import { useSocketContext } from '@/contexts/SocketContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getNotificationPrefs } from '@/utils/notificationPrefs';
import { IconFlame } from '@tabler/icons-react-native';
import { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';

// Rung 500ms, lặp lại mỗi 800ms — tự điều khiển bằng setInterval thay vì dùng cờ
// "repeat" của Vibration API, vì cờ này hoạt động không ổn định trên nhiều dòng máy Android
// (đặc biệt Oppo/Realme/Vivo) — chỉ rung được 1 lần rồi tự dừng dù đã bật repeat.
const BUZZ_DURATION = 500;
const BUZZ_INTERVAL = 800;

// Hiện toàn màn hình MỖI KHI có sự kiện fire_alert từ WebSocket, bất kể đang ở màn hình nào —
// vì được đặt ở gốc app/(tabs)/_layout.tsx nên "phủ" lên mọi màn hình con
export default function FireAlertOverlay() {
  const { theme } = useTheme();
  const { fireAlert, nodes, dismissFireAlert } = useSocketContext();
  const lastAlertId = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // dismissed = true khi người dùng đã bấm "Đã nhận thông báo" cho đợt cháy hiện tại.
  // Tự động reset về false mỗi khi có 1 đợt fire_alert MỚI (id khác) xảy ra.
  const [dismissed, setDismissed] = useState(false);

  // Còn node nào đang cháy không — dùng để biết khi nào hệ thống TỰ ĐỘNG hết cảnh báo
  // (sau vài lần đo an toàn liên tiếp), không cần người dùng tự tắt
  const anyFireActive = nodes.some((n) => n.status === 'fire');
  const showOverlay = anyFireActive && !dismissed;

  useEffect(() => {
    if (fireAlert && fireAlert.id !== lastAlertId.current) {
      lastAlertId.current = fireAlert.id;
      setDismissed(false); // đợt cháy mới → luôn hiện lại overlay + rung, kể cả khi đợt trước đã bị tắt
    }
  }, [fireAlert]);

  function stopVibrating() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    Vibration.cancel();
  }

  // Rung LIÊN TỤC bằng cách tự gọi lại Vibration.vibrate() theo chu kỳ,
  // trong khi còn cháy và chưa bị tắt — chỉ dừng khi: (1) người dùng bấm "Đã nhận thông báo",
  // hoặc (2) hệ thống tự hết cảnh báo (anyFireActive về false).
  useEffect(() => {
    (async () => {
      const prefs = await getNotificationPrefs();

      if (showOverlay && prefs.vibrationEnabled) {
        Vibration.vibrate(BUZZ_DURATION); // rung ngay lần đầu
        intervalRef.current = setInterval(() => {
          Vibration.vibrate(BUZZ_DURATION);
        }, BUZZ_INTERVAL);
      } else {
        stopVibrating();
      }
    })();

    return () => { stopVibrating(); };
  }, [showOverlay]);

  function handleDismiss() {
    stopVibrating();
    setDismissed(true);
    dismissFireAlert();
  }

  return (
    <Modal visible={showOverlay} transparent animationType="fade">
      <View style={styles.backdrop}>
        <IconFlame size={80} color={theme.danger} style={styles.icon} />
        <Text style={styles.title}>CẢNH BÁO CHÁY</Text>
        <Text style={styles.location}>📍 {fireAlert?.location || '—'}</Text>
        <Text style={styles.time}>
          {fireAlert?.timestamp ? new Date(fireAlert.timestamp).toLocaleString('vi-VN') : ''}
        </Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.danger }]} onPress={handleDismiss}>
          <Text style={styles.btnText}>Đã nhận thông báo</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,5,5,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icon: { marginBottom: 16 },
  title: { color: '#ff4d1c', fontSize: 30, fontWeight: '800', letterSpacing: 3, marginBottom: 10 },
  location: { color: '#fff', fontSize: 16, marginBottom: 4 },
  time: { color: '#9ba3b8', fontSize: 12, marginBottom: 36 },
  btn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});