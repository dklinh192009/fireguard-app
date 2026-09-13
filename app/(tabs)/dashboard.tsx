import BottomNav from '@/components/BottomNav';
import PpmRing from '@/components/PpmRing';
import { API_URL } from '@/constants/api';
import { useSocketContext } from '@/contexts/SocketContext';
import { useTheme } from '@/contexts/ThemeContext';
import { apiFetch } from '@/utils/auth';
import { getNotificationPrefs } from '@/utils/notificationPrefs';
import { registerForPushNotificationsAsync } from '@/utils/notifications';
import { IconCheck, IconDeviceAnalytics, IconFlame } from '@tabler/icons-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Me = { name: string; email: string; alertThresholds: { warn: number; danger: number } };

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { nodes, alerts, connected, fireAlert, dismissFireAlert } = useSocketContext();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    apiFetch(`${API_URL}/api/me`)
      .then((r) => r.json())
      .then((data) => data.authenticated && setMe(data));
  }, []);

  // Đăng ký nhận push notification — chỉ chạy 1 lần khi vào Dashboard sau đăng nhập.
  // Lưu ý: chỉ có tác dụng trên bản development build (EAS), KHÔNG hoạt động trên Expo Go
  // từ SDK 53 trở đi — registerForPushNotificationsAsync() sẽ tự trả về null nếu môi trường không hỗ trợ
  useEffect(() => {
    (async () => {
      const prefs = await getNotificationPrefs();
      if (!prefs.pushEnabled) return; // người dùng đã tắt thủ công trong Settings, tôn trọng lựa chọn đó
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await apiFetch(`${API_URL}/api/push-token`, {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        console.log('[Push] Đã đăng ký token:', token);
      }
    })();
  }, []);

  const avgPpm = nodes.length ? nodes.reduce((s, n) => s + (n.smoke || 0), 0) / nodes.length : 0;
  const fireCount = nodes.filter((n) => n.status === 'fire').length;
  const todayStr = new Date().toDateString();
  const alertsToday = alerts.filter((a) => new Date(a.timestamp).toDateString() === todayStr).length;

  const warn   = me?.alertThresholds?.warn   ?? 150;
  const danger = me?.alertThresholds?.danger ?? 400;
  const initials = (me?.name || '?').split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.hello, { color: theme.textSecondary }]}>Xin chào</Text>
            <Text style={[styles.name, { color: theme.text }]}>{me?.name || 'Đang tải...'}</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        {!connected && (
          <View style={[styles.offlineBanner, { backgroundColor: theme.danger + '22' }]}>
            <Text style={{ color: theme.danger, fontSize: 12 }}>⚠ Mất kết nối máy chủ, đang thử lại...</Text>
          </View>
        )}

        {/* Banner cảnh báo cháy đang active — cho phép người dùng xác nhận không phải cháy,
            tương đương bấm "Đã nhận thông báo" trên overlay, nhưng đặt luôn ở Dashboard
            để không cần chờ overlay che toàn màn hình mới thấy được */}
        {fireAlert && (
          <View style={[styles.fireAlertBanner, { backgroundColor: theme.danger }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fireAlertTitle}>🔥 Đang có cảnh báo cháy</Text>
              <Text style={styles.fireAlertDesc}>
                {fireAlert.location || '—'} · {fireAlert.label || '—'}
              </Text>
            </View>
            <TouchableOpacity style={styles.fireAlertBtn} onPress={dismissFireAlert}>
              <IconCheck size={16} color={theme.danger} />
              <Text style={[styles.fireAlertBtnText, { color: theme.danger }]}>Không phải cháy</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.ringWrap}>
          <PpmRing value={avgPpm} warn={warn} danger={danger} />
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <IconDeviceAnalytics size={20} color={theme.accent} />
            <Text style={[styles.statValue, { color: theme.text }]}>{nodes.length}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Thiết bị</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <IconFlame size={20} color={theme.danger} />
            <Text style={[styles.statValue, { color: theme.text }]}>{alertsToday}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Cảnh báo hôm nay</Text>
          </View>
        </View>

        {fireCount > 0 && (
          <View style={[styles.fireBanner, { backgroundColor: theme.danger }]}>
            <IconFlame size={20} color="#fff" />
            <Text style={styles.fireBannerText}>Đang có {fireCount} node báo cháy!</Text>
          </View>
        )}
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  hello: { fontSize: 12 },
  name: { fontSize: 18, fontWeight: '700' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  offlineBanner: { padding: 10, borderRadius: 10, marginBottom: 16 },
  fireAlertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, marginBottom: 16,
  },
  fireAlertTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  fireAlertDesc: { color: '#ffffffcc', fontSize: 11, marginTop: 2 },
  fireAlertBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  fireAlertBtnText: { fontSize: 11, fontWeight: '700' },
  ringWrap: { alignItems: 'center', marginVertical: 20 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'flex-start', gap: 6 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  fireBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, marginTop: 16 },
  fireBannerText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});