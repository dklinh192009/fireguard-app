import { useTheme } from '@/contexts/ThemeContext';
import { IconCloud, IconCpu, IconDeviceMobile } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const STEPS = [
  { Icon: IconCpu, label: 'Cảm biến ESP32' },
  { Icon: IconCloud, label: 'Server trung tâm' },
  { Icon: IconDeviceMobile, label: 'Điện thoại của bạn' },
];

export default function HowItWorksScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.skip, { color: theme.textMuted }]}>Bỏ qua</Text>

      <Text style={[styles.title, { color: theme.text }]}>Cách hệ thống hoạt động</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Tổng quan luồng dữ liệu</Text>

      <View style={styles.flow}>
        {STEPS.map(({ Icon, label }, i) => (
          <View key={label} style={{ alignItems: 'center' }}>
            <View style={[styles.iconCircle, { backgroundColor: theme.accent }]}>
              <Icon size={26} color="#fff" />
            </View>
            <Text style={[styles.stepLabel, { color: theme.text }]}>{label}</Text>
            {i < STEPS.length - 1 && <Text style={{ color: theme.textMuted, fontSize: 20 }}>↓</Text>}
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.accent }]}
        onPress={() => router.push('/two')}
      >
        <Text style={styles.buttonText}>Tạo tài khoản ngay</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80, paddingHorizontal: 24, paddingBottom: 40 },
  skip: { position: 'absolute', top: 60, right: 24, fontSize: 13 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 28 },
  flow: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  iconCircle: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stepLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  button: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});