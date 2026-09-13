import { API_URL } from '@/constants/api';
import { useSocketContext } from '@/contexts/SocketContext';
import { useTheme } from '@/contexts/ThemeContext';
import { apiFetch } from '@/utils/auth';
import { IconX } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PairingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { nodes } = useSocketContext();

  const [code, setCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const nodeCountAtStart = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${API_URL}/api/pairing-code`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Không tạo được mã'); return; }
        setCode(data.code);
        setSecondsLeft(data.expiresInSeconds);
        nodeCountAtStart.current = nodes.length;
      } catch (e) {
        setError('Lỗi kết nối server');
      }
    })();
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  useEffect(() => {
    if (nodeCountAtStart.current !== null && nodes.length > nodeCountAtStart.current) {
      router.replace('/devices');
    }
  }, [nodes.length]);

  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]}>Ghép nối thiết bị mới</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <IconX size={22} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Nhập mã 6 số này vào form WiFi trên ESP32
      </Text>

      {error ? (
        <Text style={{ color: theme.danger, marginTop: 20 }}>{error}</Text>
      ) : !code ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.accent} />
      ) : (
        <>
          <View style={styles.otpRow}>
            {code.split('').map((digit, i) => (
              <View
                key={i}
                style={[
                  styles.otpBox,
                  { borderColor: secondsLeft > 0 ? theme.accent : theme.danger, backgroundColor: theme.background },
                ]}
              >
                <Text style={[styles.otpDigit, { color: theme.text }]}>{digit}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.timer, { color: secondsLeft > 0 ? theme.accentOrange : theme.danger }]}>
            {secondsLeft > 0 ? `Hết hạn sau ${mm}:${ss}` : 'Mã đã hết hạn'}
          </Text>

          {secondsLeft > 0 ? (
            <View style={styles.steps}>
              {[
                'Cấp nguồn, kết nối WiFi cấu hình',
                'Nhập mã 6 số phía trên vào form',
                'Thiết bị tự xuất hiện trong danh sách',
              ].map((s, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={[styles.stepNum, { backgroundColor: theme.border }]}>
                    <Text style={{ fontSize: 11, color: theme.text }}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: theme.textSecondary }]}>{s}</Text>
                </View>
              ))}
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: theme.accent }]}
              onPress={() => {
                setCode(null);
                setError(null);
                (async () => {
                  const res = await apiFetch(`${API_URL}/api/pairing-code`, { method: 'POST' });
                  const data = await res.json();
                  if (res.ok) { setCode(data.code); setSecondsLeft(data.expiresInSeconds); }
                  else setError(data.error);
                })();
              }}
            >
              <Text style={styles.retryText}>Tạo mã mới</Text>
            </TouchableOpacity>
          )}

          <View style={[styles.waiting, { backgroundColor: theme.safe + '18' }]}>
            <ActivityIndicator size="small" color={theme.safe} />
            <Text style={[styles.waitingText, { color: theme.safe }]}>Đang chờ thiết bị kết nối...</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 8, marginBottom: 32 },
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  otpBox: { width: 44, height: 52, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  otpDigit: { fontSize: 20, fontWeight: '700' },
  timer: { textAlign: 'center', fontSize: 12, marginTop: 14, fontWeight: '600' },
  steps: { marginTop: 32, gap: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 13, flex: 1 },
  retryBtn: { marginTop: 32, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontWeight: '600' },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, marginTop: 40 },
  waitingText: { fontSize: 12, fontWeight: '600' },
});