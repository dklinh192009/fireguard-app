import BottomNav from '@/components/BottomNav';
import { API_URL } from '@/constants/api';
import { useSocketContext } from '@/contexts/SocketContext';
import { useTheme } from '@/contexts/ThemeContext';
import { apiFetch, clearToken } from '@/utils/auth';
import { getNotificationPrefs, getSavedPushToken, NotificationPrefs, saveNotificationPrefs } from '@/utils/notificationPrefs';
import { registerForPushNotificationsAsync } from '@/utils/notifications';
import { IconCopy, IconDeviceDesktop, IconDoorExit, IconLogout, IconMoon, IconRefresh, IconSun, IconUserPlus, IconUserX } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Member = { _id: string; name: string; email: string; role: string; avatar?: string };

type Me = {
  name: string; email: string; role: string;
  alertThresholds: { warn: number; danger: number };
  belongsToOwnerId: string | null;
};

export default function SettingsScreen() {
  const { theme, mode, setMode } = useTheme();
  const router = useRouter();
  const { sendCommand } = useSocketContext();
  const [me, setMe] = useState<Me | null>(null);
  const [warn, setWarn] = useState('150');
  const [danger, setDanger] = useState('400');
  const [inviteCode, setInviteCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Tạo mã mời — cho phép người khác vào xem chung hệ thống của mình
  const [generatingCode, setGeneratingCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<'viewer' | 'operator'>('viewer');

  // Danh sách thành viên đã mời — chỉ tải khi mình là chủ hộ
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Tuỳ chọn thông báo — lưu cục bộ trên máy bằng SecureStore
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    soundEnabled: true, vibrationEnabled: true, pushEnabled: true,
  });

  useEffect(() => { loadMe(); loadNotifPrefs(); }, []);

  async function loadNotifPrefs() {
    setNotifPrefs(await getNotificationPrefs());
  }

  async function updateNotifPref(key: keyof NotificationPrefs, value: boolean) {
    const next = { ...notifPrefs, [key]: value };
    setNotifPrefs(next);
    await saveNotificationPrefs(next);

    // Riêng "Nhận thông báo đẩy" cần đăng ký/huỷ token thật với server,
    // không chỉ lưu tuỳ chọn cục bộ
    if (key === 'pushEnabled') {
      if (value) {
        const token = await registerForPushNotificationsAsync();
        if (token) await apiFetch(`${API_URL}/api/push-token`, { method: 'POST', body: JSON.stringify({ token }) });
      } else {
        const token = await getSavedPushToken();
        if (token) await apiFetch(`${API_URL}/api/push-token`, { method: 'DELETE', body: JSON.stringify({ token }) });
      }
    }
  }

  async function loadMe() {
    const res = await apiFetch(`${API_URL}/api/me`);
    const data = await res.json();
    if (data.authenticated) {
      setMe(data);
      setWarn(String(data.alertThresholds?.warn ?? 150));
      setDanger(String(data.alertThresholds?.danger ?? 400));
      if (!data.belongsToOwnerId) loadMembers(); // chỉ chủ hộ mới cần tải danh sách này
    }
  }

  async function loadMembers() {
    setLoadingMembers(true);
    try {
      const res = await apiFetch(`${API_URL}/api/household-members`);
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch { /* im lặng bỏ qua nếu lỗi mạng, không chặn màn hình chính */ }
    setLoadingMembers(false);
  }

  function removeMember(member: Member) {
    Alert.alert('Gỡ thành viên', `Gỡ ${member.name} khỏi hệ thống của bạn?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Gỡ', style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiFetch(`${API_URL}/api/household-members/${member._id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            setMembers((prev) => prev.filter((m) => m._id !== member._id));
          } catch {
            Alert.alert('Lỗi', 'Không gỡ được, thử lại sau');
          }
        },
      },
    ]);
  }

  async function saveThresholds() {
    const w = Number(warn), d = Number(danger);
    if (!w || !d || w >= d) {
      Alert.alert('Không hợp lệ', 'Ngưỡng cảnh báo sớm phải nhỏ hơn ngưỡng nguy hiểm');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/api/settings/thresholds`, {
        method: 'PATCH',
        body: JSON.stringify({ warn: w, danger: d }),
      });
      if (!res.ok) throw new Error();
      Alert.alert('Đã lưu', 'Ngưỡng cảnh báo đã được cập nhật');
    } catch {
      Alert.alert('Lỗi', 'Không lưu được, thử lại sau');
    } finally {
      setSaving(false);
    }
  }

  async function joinHousehold() {
    if (inviteCode.length !== 6) return;
    try {
      const res = await apiFetch(`${API_URL}/api/join-household`, {
        method: 'POST',
        body: JSON.stringify({ code: inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      Alert.alert('Thành công', 'Bạn đã tham gia xem chung hệ thống');
      setInviteCode('');
      loadMe();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Mã mời không hợp lệ');
    }
  }

  // Tạo mã mời 6 số cho người khác dùng — dùng endpoint có sẵn ở backend: POST /api/invite-code
  // Lưu ý: endpoint này yêu cầu role 'admin' hoặc 'operator', không phải mọi chủ hệ thống đều có sẵn quyền này
  async function createInviteCode() {
    setGeneratingCode(true);
    setGeneratedCode(null);
    try {
      const res = await apiFetch(`${API_URL}/api/invite-code`, {
        method: 'POST',
        body: JSON.stringify({ role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGeneratedCode(data.code);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không tạo được mã mời');
    } finally {
      setGeneratingCode(false);
    }
  }

  function shareInviteCode() {
    if (!generatedCode) return;
    Share.share({ message: `Mã mời xem chung hệ thống FireGuard: ${generatedCode}` });
  }

  async function leaveHousehold() {
    Alert.alert('Xác nhận', 'Rời khỏi hệ thống đang xem chung?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Rời nhóm', style: 'destructive',
        onPress: async () => {
          await apiFetch(`${API_URL}/api/leave-household`, { method: 'POST' });
          loadMe();
        },
      },
    ]);
  }

  // Giống hệt nút "Reset All" ở topbar bên web — reset toàn bộ node về bình thường + tắt còi
  function handleResetAll() {
    Alert.alert('Xác nhận', 'Reset tất cả node về trạng thái bình thường?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Reset All',
        style: 'destructive',
        onPress: () => {
          setResetting(true);
          sendCommand({ type: 'reset_all' });
          setTimeout(() => setResetting(false), 800);
        },
      },
    ]);
  }

  async function handleLogout() {
    await clearToken();
    router.replace('/two');
  }

  const initials = (me?.name || '?').split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.pageTitle, { color: theme.text }]}>Cài đặt</Text>

        <View style={styles.accountRow}>
          <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={[styles.accountName, { color: theme.text }]}>{me?.name}</Text>
            <Text style={[styles.accountEmail, { color: theme.textSecondary }]}>{me?.email}</Text>
          </View>
        </View>

        {me?.belongsToOwnerId ? (
          <View style={[styles.section, { borderColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>THÀNH VIÊN ĐƯỢC MỜI</Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
              Bạn đang xem hệ thống của người khác (vai trò: {me.role === 'operator' ? 'Được điều khiển' : 'Chỉ xem'})
            </Text>
            <TouchableOpacity style={styles.leaveBtn} onPress={leaveHousehold}>
              <IconDoorExit size={16} color={theme.danger} />
              <Text style={{ color: theme.danger, fontSize: 13, fontWeight: '600' }}>Rời nhóm</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.section, { borderColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>NHẬP MÃ MỜI</Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
              Được chủ nhà khác mời xem hệ thống của họ? Nhập mã 6 số họ cung cấp.
            </Text>
            <View style={styles.inviteRow}>
              <TextInput
                style={[styles.inviteInput, { borderColor: theme.border, color: theme.text }]}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                value={inviteCode}
                onChangeText={setInviteCode}
              />
              <TouchableOpacity
                style={[styles.inviteBtn, { backgroundColor: theme.accent }]}
                onPress={joinHousehold}
              >
                <IconUserPlus size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!me?.belongsToOwnerId && (
          <View style={[styles.section, { borderColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>MỜI NGƯỜI KHÁC XEM CHUNG</Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
              Tạo mã mời 6 số để chia sẻ, người nhận nhập mã này ở mục "Nhập mã mời" để xem chung hệ thống của bạn.
            </Text>

            <View style={styles.roleToggleRow}>
              <TouchableOpacity
                style={[styles.roleToggleBtn, { borderColor: theme.border }, inviteRole === 'viewer' && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                onPress={() => setInviteRole('viewer')}
              >
                <Text style={{ color: inviteRole === 'viewer' ? '#fff' : theme.textSecondary, fontSize: 12, fontWeight: '600' }}>Chỉ xem</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleToggleBtn, { borderColor: theme.border }, inviteRole === 'operator' && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                onPress={() => setInviteRole('operator')}
              >
                <Text style={{ color: inviteRole === 'operator' ? '#fff' : theme.textSecondary, fontSize: 12, fontWeight: '600' }}>Được điều khiển</Text>
              </TouchableOpacity>
            </View>

            {generatedCode ? (
              <View style={[styles.generatedCodeBox, { borderColor: theme.accent }]}>
                <Text style={[styles.generatedCodeText, { color: theme.text }]}>{generatedCode}</Text>
                <TouchableOpacity onPress={shareInviteCode} style={styles.copyBtn}>
                  <IconCopy size={16} color={theme.accent} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.accent }]}
                onPress={createInviteCode}
                disabled={generatingCode}
              >
                <Text style={styles.saveBtnText}>{generatingCode ? 'Đang tạo...' : 'Tạo mã mời'}</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.hint, { color: theme.textMuted }]}>Mã có hiệu lực trong 1 giờ</Text>
          </View>
        )}

        {!me?.belongsToOwnerId && (
          <View style={[styles.section, { borderColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>THÀNH VIÊN ĐÃ MỜI</Text>
            {loadingMembers ? (
              <Text style={[styles.sectionDesc, { color: theme.textMuted }]}>Đang tải...</Text>
            ) : members.length === 0 ? (
              <Text style={[styles.sectionDesc, { color: theme.textMuted }]}>Chưa có ai được mời</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {members.map((m) => (
                  <View key={m._id} style={[styles.memberRow, { borderColor: theme.border }]}>
                    <View style={[styles.memberAvatar, { backgroundColor: theme.accent }]}>
                      <Text style={styles.memberAvatarText}>
                        {(m.name || '?').split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.memberName, { color: theme.text }]}>{m.name}</Text>
                      <Text style={[styles.memberMeta, { color: theme.textMuted }]}>
                        {m.email} · {m.role === 'operator' ? 'Được điều khiển' : 'Chỉ xem'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeMember(m)} style={styles.removeMemberBtn}>
                      <IconUserX size={18} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {!me?.belongsToOwnerId && (
          <View style={[styles.section, { borderColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>NGƯỠNG CẢNH BÁO PPM</Text>
            <View style={styles.thresholdRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.thresholdLabel, { color: theme.textSecondary }]}>Cảnh báo sớm</Text>
                <TextInput
                  style={[styles.thresholdInput, { borderColor: theme.border, color: theme.text }]}
                  keyboardType="number-pad"
                  value={warn}
                  onChangeText={setWarn}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.thresholdLabel, { color: theme.textSecondary }]}>Nguy hiểm</Text>
                <TextInput
                  style={[styles.thresholdInput, { borderColor: theme.border, color: theme.text }]}
                  keyboardType="number-pad"
                  value={danger}
                  onChangeText={setDanger}
                />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.accent }]}
              onPress={saveThresholds}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Đang lưu...' : 'Lưu ngưỡng mặc định'}</Text>
            </TouchableOpacity>
            <Text style={[styles.hint, { color: theme.textMuted }]}>
              Áp dụng cho mọi node, trừ node đã tự đặt ngưỡng riêng
            </Text>
          </View>
        )}

        {!me?.belongsToOwnerId && (
          <View style={[styles.section, { borderColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>HỆ THỐNG</Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
              Đưa tất cả node về trạng thái bình thường và tắt còi đang kêu trên toàn hệ thống.
            </Text>
            <TouchableOpacity
              style={[styles.resetBtn, { borderColor: theme.danger }]}
              onPress={handleResetAll}
              disabled={resetting}
            >
              <IconRefresh size={16} color={theme.danger} />
              <Text style={{ color: theme.danger, fontWeight: '600', fontSize: 13 }}>
                {resetting ? 'Đang reset...' : 'Reset toàn hệ thống'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.section, { borderColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>GIAO DIỆN</Text>
          <View style={styles.themeRow}>
            <TouchableOpacity
              style={[styles.themeBtn, { borderColor: theme.border }, mode === 'light' && { backgroundColor: theme.accent, borderColor: theme.accent }]}
              onPress={() => setMode('light')}
            >
              <IconSun size={18} color={mode === 'light' ? '#fff' : theme.textSecondary} />
              <Text style={{ color: mode === 'light' ? '#fff' : theme.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 4 }}>Sáng</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeBtn, { borderColor: theme.border }, mode === 'dark' && { backgroundColor: theme.accent, borderColor: theme.accent }]}
              onPress={() => setMode('dark')}
            >
              <IconMoon size={18} color={mode === 'dark' ? '#fff' : theme.textSecondary} />
              <Text style={{ color: mode === 'dark' ? '#fff' : theme.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 4 }}>Tối</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeBtn, { borderColor: theme.border }, mode === 'system' && { backgroundColor: theme.accent, borderColor: theme.accent }]}
              onPress={() => setMode('system')}
            >
              <IconDeviceDesktop size={18} color={mode === 'system' ? '#fff' : theme.textSecondary} />
              <Text style={{ color: mode === 'system' ? '#fff' : theme.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 4 }}>Hệ thống</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, { borderColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>THÔNG BÁO</Text>

          <View style={styles.switchRow}>
            <Text style={{ color: theme.text, fontSize: 13 }}>Nhận thông báo đẩy</Text>
            <Switch
              value={notifPrefs.pushEnabled}
              onValueChange={(v) => updateNotifPref('pushEnabled', v)}
              trackColor={{ true: theme.accent }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={{ color: theme.text, fontSize: 13 }}>Âm thanh khi có cảnh báo</Text>
            <Switch
              value={notifPrefs.soundEnabled}
              onValueChange={(v) => updateNotifPref('soundEnabled', v)}
              trackColor={{ true: theme.accent }}
            />
          </View>
          <View style={[styles.switchRow, { marginBottom: 0 }]}>
            <Text style={{ color: theme.text, fontSize: 13 }}>Rung khi có cảnh báo</Text>
            <Switch
              value={notifPrefs.vibrationEnabled}
              onValueChange={(v) => updateNotifPref('vibrationEnabled', v)}
              trackColor={{ true: theme.accent }}
            />
          </View>
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Âm thanh/rung chỉ áp dụng khi app đang mở. Khi app tắt hẳn, Android dùng cấu hình mặc định của hệ thống.
          </Text>
        </View>

        <TouchableOpacity style={[styles.logoutBtn, { borderColor: theme.danger }]} onPress={handleLogout}>
          <IconLogout size={16} color={theme.danger} />
          <Text style={{ color: theme.danger, fontWeight: '600' }}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 120 },
  pageTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  accountName: { fontSize: 16, fontWeight: '700' },
  accountEmail: { fontSize: 12, marginTop: 2 },
  section: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  sectionDesc: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  inviteRow: { flexDirection: 'row', gap: 8 },
  inviteInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 15, letterSpacing: 4 },
  inviteBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  thresholdRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  thresholdLabel: { fontSize: 11, marginBottom: 6 },
  thresholdInput: { borderWidth: 1, borderRadius: 10, height: 42, paddingHorizontal: 12, fontSize: 14 },
  saveBtn: { height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  hint: { fontSize: 10, marginTop: 8 },
  roleToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  roleToggleBtn: { flex: 1, height: 38, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  generatedCodeBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 16, height: 48,
  },
  generatedCodeText: { fontSize: 20, fontWeight: '700', letterSpacing: 6 },
  copyBtn: { padding: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeBtn: { flex: 1, height: 64, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 10 },
  memberAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  memberName: { fontSize: 13, fontWeight: '600' },
  memberMeta: { fontSize: 10, marginTop: 2 },
  removeMemberBtn: { padding: 6 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 10, borderWidth: 1.5 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 12, borderWidth: 1.5, marginTop: 12 },
});