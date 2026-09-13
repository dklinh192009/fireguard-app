import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'fireguard_token';

// Lưu token vào bộ nhớ an toàn của điện thoại (mã hoá, không ai đọc được kể cả root máy)
export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// Gọi API kèm sẵn token — dùng hàm này thay cho fetch() thường ở MỌI nơi cần đăng nhập
export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = await getToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
  });
}