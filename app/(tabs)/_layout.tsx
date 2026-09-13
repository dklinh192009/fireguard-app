import FireAlertOverlay from '@/components/FireAlertOverlay';
import { SocketProvider } from '@/contexts/SocketContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <FireAlertOverlay />
      </SocketProvider>
    </ThemeProvider>
  );
}