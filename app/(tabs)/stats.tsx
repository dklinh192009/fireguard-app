import BottomNav from '@/components/BottomNav';
import { API_URL } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { apiFetch } from '@/utils/auth';
import { IconAlertTriangle, IconCheck, IconFlame, IconRefresh, IconTrash, IconX } from '@tabler/icons-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type AlertEntry = {
  id: string; type: string; label: string; location: string;
  message: string; timestamp: string;
};

const ICONS: Record<string, any> = {
  fire: IconFlame, clear: IconCheck, auto_clear: IconCheck,
  manual: IconAlertTriangle, reset: IconRefresh,
};
const LABELS: Record<string, string> = {
  fire: 'Phát hiện cháy', clear: 'Đã tắt cảnh báo', auto_clear: 'Tự động hết cảnh báo',
  manual: 'Báo động thủ công', reset: 'Reset hệ thống',
};

export default function StatsScreen() {
  const { theme } = useTheme();
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Chế độ chọn nhiều — bật lên khi người dùng nhấn giữ 1 mục,
  // selectedIds lưu id các mục đang được chọn để xoá
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_URL}/api/alerts?limit=200`);
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch { /* giữ nguyên dữ liệu cũ nếu lỗi mạng */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  function enterSelectMode(id: string) {
    setSelectMode(true);
    setSelectedIds(new Set([id]));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function cancelSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function handleDeleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    Alert.alert('Xác nhận xoá', `Xoá ${ids.length} sự kiện đã chọn?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            const res = await apiFetch(`${API_URL}/api/alerts`, {
              method: 'DELETE',
              body: JSON.stringify({ ids }),
            });
            if (!res.ok) throw new Error();
            setAlerts((prev) => prev.filter((a) => !selectedIds.has(a.id)));
            cancelSelectMode();
          } catch {
            Alert.alert('Lỗi', 'Không xoá được, thử lại sau');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.pageTitle, { color: theme.text }]}>Lịch sử cảnh báo</Text>
        {selectMode ? (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={cancelSelectMode} style={styles.headerBtn}>
              <IconX size={18} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteSelected}
              style={[styles.headerBtn, { backgroundColor: theme.danger + '18' }]}
              disabled={deleting || selectedIds.size === 0}
            >
              <IconTrash size={18} color={theme.danger} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {selectMode && (
        <Text style={[styles.selectHint, { color: theme.textMuted }]}>
          Đã chọn {selectedIds.size} · Chạm để chọn thêm
        </Text>
      )}

      <FlatList
        data={alerts}
        keyExtractor={(item, i) => item.id || String(i)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        ListEmptyComponent={
          !loading ? (
            <Text style={[styles.empty, { color: theme.textMuted }]}>Chưa có sự kiện nào</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const Icon = ICONS[item.type] || IconAlertTriangle;
          const isFire = item.type === 'fire';
          const isSelected = selectedIds.has(item.id);

          const titleText = String(LABELS[item.type] || item.type || '—');
          const locationText = String(item.location || '—');
          const labelText = String(item.label || '—');
          const timeText = item.timestamp
            ? new Date(item.timestamp).toLocaleString('vi-VN')
            : '—';

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onLongPress={() => enterSelectMode(item.id)}
              onPress={() => selectMode && toggleSelect(item.id)}
              style={[
                styles.item,
                { backgroundColor: theme.background, borderColor: isSelected ? theme.accent : theme.border },
                isSelected && { borderWidth: 2 },
              ]}
            >
              {selectMode && (
                <View style={[
                  styles.checkbox,
                  { borderColor: isSelected ? theme.accent : theme.border },
                  isSelected && { backgroundColor: theme.accent },
                ]}>
                  {isSelected && <IconCheck size={12} color="#fff" />}
                </View>
              )}
              <View style={[styles.iconWrap, { backgroundColor: isFire ? theme.danger + '18' : theme.border }]}>
                <Icon size={18} color={isFire ? theme.danger : theme.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: theme.text }]}>
                  {titleText} — {locationText}
                </Text>
                <Text style={[styles.itemMeta, { color: theme.textMuted }]}>
                  {labelText} · {timeText}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
  },
  pageTitle: { fontSize: 20, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  selectHint: { fontSize: 11, paddingHorizontal: 20, marginBottom: 8 },
  list: { paddingHorizontal: 20, paddingBottom: 120, gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 12 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 13, fontWeight: '600' },
  itemMeta: { fontSize: 11, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 13 },
});