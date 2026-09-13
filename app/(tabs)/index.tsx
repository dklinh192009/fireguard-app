import Colors from '@/constants/Colors';
import { IconFlame, IconHome, IconShieldCheck, IconWifi } from '@tabler/icons-react-native';
import { StyleSheet, Text, View } from 'react-native';

export default function WelcomeScreen() {
  const theme = Colors.light; // tạm cố định sáng, làm dark mode động sau

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.skip, { color: theme.textMuted }]}>Bỏ qua</Text>

      <View style={styles.middle}>
        <View style={[styles.blob, { backgroundColor: theme.accent }]}>
          <View style={[styles.miniCircle, styles.topLeft, { backgroundColor: theme.background }]}>
            <IconHome size={20} color={theme.accent} />
          </View>
          <View style={[styles.miniCircle, styles.topRight, { backgroundColor: theme.danger }]}>
            <IconFlame size={20} color="#fff" />
          </View>
          <View style={styles.shieldWrap}>
            <IconShieldCheck size={48} color="#fff" strokeWidth={1.5} />
          </View>
          <View style={[styles.miniCircle, styles.bottomRight, { backgroundColor: theme.background }]}>
            <IconWifi size={18} color={theme.accent} />
          </View>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Xin chào!</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          FireGuard Pro đồng hành bảo vệ ngôi nhà và không gian làm việc của bạn
        </Text>

        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive, { backgroundColor: theme.accent }]} />
          <View style={[styles.dot, { backgroundColor: theme.border }]} />
          <View style={[styles.dot, { backgroundColor: theme.border }]} />
        </View>
      </View>

      <View style={[styles.button, { backgroundColor: theme.accent }]}>
        <Text style={styles.buttonText}>Bắt đầu khám phá</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingTop: 80, paddingBottom: 40, paddingHorizontal: 24 },
  skip: { position: 'absolute', top: 60, right: 24, fontSize: 13 },
  middle: { alignItems: 'center' },
  blob: { width: 220, height: 260, borderRadius: 110, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  miniCircle: { position: 'absolute', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  topLeft: { top: 10, left: -10 },
  topRight: { top: -6, right: -6 },
  bottomRight: { bottom: 10, right: -6 },
  shieldWrap: { width: 76, height: 76, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 24 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 18 },
  button: { width: '100%', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});