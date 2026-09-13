import * as SecureStore from 'expo-secure-store';

const PREFS_KEY = 'notification_prefs';

export type NotificationPrefs = {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  pushEnabled: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  soundEnabled: true,
  vibrationEnabled: true,
  pushEnabled: true,
};

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await SecureStore.getItemAsync(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(prefs));
}

// Lưu lại Expo Push Token sau khi đăng ký thành công, để sau này có thể
// gọi DELETE /api/push-token đúng token đó khi người dùng tắt thông báo đẩy
const TOKEN_KEY = 'expo_push_token';

export async function savePushToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getSavedPushToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}