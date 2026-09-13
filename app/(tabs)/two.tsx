import { API_URL } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { apiFetch, saveToken } from '@/utils/auth';
import { IconBrandGoogle, IconFlame } from '@tabler/icons-react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      // Mở trình duyệt trong app, chạy luồng Google OAuth trên server.js
      const redirectUri = Linking.createURL('auth-callback');
      const authUrl = `${API_URL}/auth/google/mobile?redirect_uri=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      

      if (result.type === 'success' && result.url) {
        // result.url có dạng: fireguardapp://auth-callback?token=xxxxx
        const token = new URL(result.url).searchParams.get('token');
        if (!token) throw new Error('Không nhận được token từ server');

        await saveToken(token);

        // Gọi thử /api/me để xác nhận token hoạt động + lấy thông tin user
        const res = await apiFetch(`${API_URL}/api/me`);
        const data = await res.json();
        if (!data.authenticated) throw new Error('Token không hợp lệ');

        router.replace('/dashboard');
      }
    } catch (e: any) {
      Alert.alert('Đăng nhập thất bại', e.message || 'Vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.logoWrap, { backgroundColor: theme.danger }]}>
        <IconFlame size={40} color="#fff" />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>FireGuard Pro</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Giám sát cháy thời gian thực</Text>

      <TouchableOpacity
        style={[styles.googleBtn, { borderColor: theme.border }]}
        onPress={handleGoogleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.text} />
        ) : (
          <>
            <IconBrandGoogle size={18} color={theme.text} />
            <Text style={[styles.googleText, { color: theme.text }]}>Tiếp tục với Google</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={[styles.hint, { color: theme.textMuted }]}>
        Được mời xem hệ thống của người khác? Đăng nhập rồi vào Cài đặt để nhập mã mời.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logoWrap: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 40 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', height: 46, borderRadius: 12, borderWidth: 1 },
  googleText: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 11, textAlign: 'center', marginTop: 24, lineHeight: 16 },
});