import Colors from '@/constants/Colors';
import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';
type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'theme_mode';

type ThemeContextValue = {
  theme: typeof Colors.light;
  colorScheme: ColorScheme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Đặt Provider này ở gốc app (app/(tabs)/_layout.tsx), ngang hàng với SocketProvider —
// mọi màn hình con dùng chung 1 theme qua hook useTheme() bên dưới, thay vì mỗi màn hình
// tự gọi cứng Colors.light như trước (lý do toàn app không đổi được dark mode)
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme(); // 'light' | 'dark' | null | undefined
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
      setLoaded(true);
    });
  }, []);

  function setMode(m: ThemeMode) {
    setModeState(m);
    SecureStore.setItemAsync(STORAGE_KEY, m);
  }

  const colorScheme: ColorScheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const theme = Colors[colorScheme];

  // Chờ đọc xong lựa chọn đã lưu trước khi render, tránh nhấp nháy sai theme 1 khung hình đầu
  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ theme, colorScheme, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme phải được gọi bên trong <ThemeProvider>');
  return ctx;
}