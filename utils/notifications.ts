import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getNotificationPrefs, savePushToken } from './notificationPrefs';

// Cách app phản ứng khi nhận được thông báo LÚC app đang mở (foreground).
// Đọc tuỳ chọn của người dùng để quyết định có phát âm thanh hay không —
// LƯU Ý: chỉ áp dụng được lúc app đang mở, vì Android khoá cứng cấu hình âm thanh/rung
// của channel ngay từ lúc tạo, không thể đổi động cho thông báo lúc app đã tắt hẳn.
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const prefs = await getNotificationPrefs();
    return {
      shouldShowAlert: true,
      shouldPlaySound: prefs.soundEnabled,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

// Gọi hàm này SAU KHI đăng nhập thành công — xin quyền, lấy Expo Push Token,
// trả về null nếu người dùng từ chối quyền hoặc đang chạy trên máy giả lập (push không hoạt động trên giả lập)
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[Push] Push notification chỉ hoạt động trên máy thật, không phải giả lập');
    return null;
  }

  // Android bắt buộc phải tạo "channel" trước khi gửi được thông báo có âm thanh riêng
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('fire-alerts', {
      name: 'Cảnh báo cháy',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('[Push] Người dùng từ chối quyền nhận thông báo');
    return null;
  }

  // projectId được EAS tự điền vào app.json (mục extra.eas.projectId) sau khi chạy `eas build:configure`
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn('[Push] Chưa có projectId — chạy `npx eas-cli build:configure` trước');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

  // Lưu lại token để sau này Settings có thể gọi DELETE /api/push-token
  // đúng token này khi người dùng tắt "Nhận thông báo đẩy"
  await savePushToken(tokenData.data);

  return tokenData.data; // dạng "ExponentPushToken[xxxxxxxxxxxx]"
}