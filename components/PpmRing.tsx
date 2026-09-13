import { useTheme } from '@/contexts/ThemeContext';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  value: number;   // ppm hiện tại
  warn: number;    // ngưỡng cảnh báo sớm
  danger: number;  // ngưỡng nguy hiểm
  size?: number;
};

// Vòng đo ppm dạng ~26 chấm nhỏ trên cung ~260°, theo design-system.md mục 4
// Số chấm "sáng" tỉ lệ thuận với % giá trị hiện tại so với ngưỡng nguy hiểm
export default function PpmRing({ value, warn, danger, size = 180 }: Props) {
  const { theme } = useTheme();
  const TOTAL_DOTS = 26;
  const ARC_DEGREES = 260;
  const START_ANGLE = -220; // xoay để cung mở ở phía dưới, giống mockup

  const ratio = Math.min(value / (danger * 1.2), 1); // cap ở 120% ngưỡng nguy hiểm cho đẹp mắt
  const litCount = Math.round(ratio * TOTAL_DOTS);

  const color = value >= danger ? theme.danger : value >= warn ? theme.accentOrange : theme.safe;
  const statusText = value >= danger ? 'Nguy hiểm' : value >= warn ? 'Cảnh báo' : 'Bình thường';

  const radius = size / 2 - 8;
  const center = size / 2;

  const dots = Array.from({ length: TOTAL_DOTS }, (_, i) => {
    const angle = (START_ANGLE + (ARC_DEGREES / (TOTAL_DOTS - 1)) * i) * (Math.PI / 180);
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    const lit = i < litCount;
    return { x, y, lit };
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {dots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={3.5} fill={d.lit ? color : theme.border} />
        ))}
      </Svg>
      <Text style={[styles.value, { color: theme.text }]}>{Math.round(value)}</Text>
      <Text style={[styles.label, { color: theme.textSecondary }]}>ppm khói TB</Text>
      <View style={[styles.badge, { backgroundColor: color + '22' }]}>
        <Text style={[styles.badgeText, { color }]}>{statusText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  value: { fontSize: 30, fontWeight: '700' },
  label: { fontSize: 11, marginTop: 2 },
  badge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
});