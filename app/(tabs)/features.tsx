import { useTheme } from '@/contexts/ThemeContext';
import { IconBell, IconSpeakerphone, IconWind } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const FEATURES = [
  { Icon: IconWind, title: 'Cảm biến khói thông minh', desc: 'Đo nồng độ khói liên tục' },
  { Icon: IconBell, title: 'Cảnh báo tức thời', desc: 'Nhận thông báo dù đang ở xa' },
  { Icon: IconSpeakerphone, title: 'Phát loa tự động', desc: 'Thông báo bằng giọng nói tại chỗ' },
];

export default function FeaturesScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.skip, { color: theme.textMuted }]}>Bỏ qua</Text>

      <Text style={[styles.title, { color: theme.text }]}>Giới thiệu tính năng</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Mọi thứ bạn cần để yên tâm</Text>

      <View style={styles.list}>
        {FEATURES.map(({ Icon, title, desc }) => (
          <View key={title} style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Icon size={22} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
              <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.accent }]}
        onPress={() => router.push('/how-it-works')}
      >
        <Text style={styles.buttonText}>Tiếp theo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80, paddingHorizontal: 24, paddingBottom: 40 },
  skip: { position: 'absolute', top: 60, right: 24, fontSize: 13 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 28 },
  list: { gap: 12, flex: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  cardDesc: { fontSize: 12 },
  button: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});