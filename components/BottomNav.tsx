import { useTheme } from '@/contexts/ThemeContext';
import { IconDeviceAnalytics, IconHome, IconLayoutGrid, IconSettings } from '@tabler/icons-react-native';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

// Thanh điều hướng dưới dạng "viên thuốc nổi" — theo đúng design-system.md mục 4
// Đây KHÔNG phải Tabs Navigator của Expo Router, mà là 1 component tự vẽ,
// dùng router.push() để chuyển màn hình — vì mockup yêu cầu kiểu dáng riêng, không theo tab mặc định
const ITEMS = [
  { icon: IconHome, route: '/dashboard' },
  { icon: IconLayoutGrid, route: '/devices' },
  { icon: IconDeviceAnalytics, route: '/stats' },
  { icon: IconSettings, route: '/settings' },
] as const;

export default function BottomNav() {
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={[styles.wrap, { backgroundColor: theme.text }]}>
      {ITEMS.map(({ icon: Icon, route }) => {
        const active = pathname === route;
        return (
          <TouchableOpacity
            key={route}
            onPress={() => router.push(route as any)}
            style={[styles.item, active && { backgroundColor: theme.accent }]}
          >
            <Icon size={20} color={active ? '#fff' : theme.background} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  item: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});