import BottomNav from '@/components/BottomNav';
import { useSocketContext } from '@/contexts/SocketContext';
import { useTheme } from '@/contexts/ThemeContext';
import { IconDeviceAnalytics, IconFlame, IconPlus } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DevicesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { nodes, connected } = useSocketContext();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>Thiết bị</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.accent }]}
            onPress={() => router.push('/pairing')}
          >
            <IconPlus size={16} color="#fff" />
            <Text style={styles.addBtnText}>Thêm thiết bị</Text>
          </TouchableOpacity>
        </View>

        {!connected && (
          <View style={[styles.offlineBanner, { backgroundColor: theme.danger + '22' }]}>
            <Text style={{ color: theme.danger, fontSize: 12 }}>⚠ Mất kết nối máy chủ, đang thử lại...</Text>
          </View>
        )}

        {nodes.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.border }]}>
              <IconDeviceAnalytics size={40} color={theme.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Chưa có thiết bị nào</Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
              Ghép nối ESP32 đầu tiên để bắt đầu giám sát
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: theme.accent }]}
              onPress={() => router.push('/pairing')}
            >
              <IconPlus size={16} color="#fff" />
              <Text style={styles.addBtnText}>Thêm thiết bị</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {nodes.map((n) => (
              <TouchableOpacity
                key={n.id}
                style={[
                  styles.card,
                  n.status === 'fire'
                    ? { backgroundColor: theme.danger }
                    : { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 },
                ]}
                onPress={() => router.push(`/node/${n.nodeId}` as any)}
              >
                {n.status === 'fire' ? (
                  <IconFlame size={22} color="#fff" />
                ) : (
                  <IconDeviceAnalytics size={22} color={theme.accent} />
                )}
                <Text style={[styles.cardLabel, { color: n.status === 'fire' ? '#fff' : theme.text }]}>
                  {n.label}
                </Text>
                <Text style={[styles.cardPpm, { color: n.status === 'fire' ? '#fff' : theme.textSecondary }]}>
                  {Math.round(n.smoke || 0)} ppm
                </Text>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: n.connected ? theme.safe : theme.textMuted },
                  ]}
                />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.card, styles.cardAdd, { borderColor: theme.border }]}
              onPress={() => router.push('/pairing')}
            >
              <IconPlus size={22} color={theme.textMuted} />
              <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Thêm mới</Text>
            </TouchableOpacity>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  offlineBanner: { padding: 10, borderRadius: 10, marginBottom: 16 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 6 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyDesc: { fontSize: 12, textAlign: 'center', marginBottom: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', aspectRatio: 1, borderRadius: 16, padding: 14, justifyContent: 'space-between' },
  cardAdd: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
  cardLabel: { fontSize: 13, fontWeight: '600' },
  cardPpm: { fontSize: 11 },
  dot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4 },
});