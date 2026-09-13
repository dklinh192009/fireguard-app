import { API_URL } from '@/constants/api';
import { useSocketContext } from '@/contexts/SocketContext';
import { useTheme } from '@/contexts/ThemeContext';
import { apiFetch } from '@/utils/auth';
import { IconArrowLeft, IconCheck, IconDoorExit, IconEdit, IconFlame, IconSend, IconVolume, IconX } from '@tabler/icons-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function NodeDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { nodeId } = useLocalSearchParams<{ nodeId: string }>();
  const { nodes, sendCommand } = useSocketContext();
  const [sending, setSending] = useState(false);
  const [ttsText, setTtsText] = useState('');
  const [sendingTts, setSendingTts] = useState(false);
  const [releasing, setReleasing] = useState(false);

  // Modal sửa tên/vị trí — nối vào nút bút chì ở góc phải, dùng lệnh WS update_node có sẵn ở backend
  const [editVisible, setEditVisible] = useState(false);
  const [editLabel, setEditLabel] = useState('');
  const [editLocation, setEditLocation] = useState('');

  const node = nodes.find((n) => n.nodeId === nodeId);

  if (!node) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>Không tìm thấy thiết bị này</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.accent }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isFire = node.status === 'fire';
  const fillPercent = Math.min((node.smoke || 0) / 500, 1) * 100;

  // Giống hệt web: "Báo cháy thử" (manualAlert) có hộp thoại xác nhận trước khi gửi
  function handleTestFire() {
    Alert.alert('Xác nhận', `Kích hoạt báo cháy thử cho ${node!.label}?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Báo cháy thử',
        style: 'destructive',
        onPress: () => {
          setSending(true);
          // Gửi qua ĐÚNG kết nối WebSocket dùng chung — overlay cảnh báo cháy toàn app
          // (components/FireAlertOverlay.tsx) sẽ tự hiện lên khi server phản hồi fire_alert
          sendCommand({ type: 'manual_alert', targetNodeId: node!.nodeId, source: 'mobile_app' });
          setTimeout(() => setSending(false), 800);
        },
      },
    ]);
  }

  // Bên web, nút "Chỉ bật còi buzzer" (activateBuzzer) dùng chung ĐÚNG lệnh manual_alert,
  // khác biệt duy nhất là KHÔNG có hộp thoại xác nhận trước — làm y hệt ở đây để đồng nhất hành vi
  function handleBuzzerOnly() {
    sendCommand({ type: 'manual_alert', targetNodeId: node!.nodeId, source: 'mobile_app_buzzer' });
  }

  // Mở modal sửa, điền sẵn giá trị hiện tại của node
  function openEditModal() {
    setEditLabel(node!.label || '');
    setEditLocation(node!.location || '');
    setEditVisible(true);
  }

  // Gửi lệnh update_node qua WebSocket — backend đã hỗ trợ sẵn (case 'update_node'),
  // tự cập nhật cả MongoDB (NodeConfig) lẫn broadcast realtime cho mọi client đang xem
  function saveNodeEdit() {
    const label = editLabel.trim();
    const location = editLocation.trim();
    if (!label || !location) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ tên và vị trí');
      return;
    }
    sendCommand({ type: 'update_node', nodeId: node!.nodeId, label, location });
    setEditVisible(false);
  }

  // "Nhả node" — trả node này về trạng thái vô chủ, ai cũng có thể ghép nối lại từ đầu.
  // Dùng endpoint có sẵn ở backend: POST /api/nodes/:nodeId/release
  function handleReleaseNode() {
    Alert.alert(
      'Nhả node này?',
      `${node!.label} sẽ trở về trạng thái vô chủ. Bạn sẽ không còn quản lý được node này nữa.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Nhả node', style: 'destructive',
          onPress: async () => {
            setReleasing(true);
            try {
              const res = await apiFetch(`${API_URL}/api/nodes/${node!.nodeId}/release`, { method: 'POST' });
              if (!res.ok) throw new Error();
              router.back();
            } catch {
              Alert.alert('Lỗi', 'Không nhả được node, thử lại sau');
            } finally {
              setReleasing(false);
            }
          },
        },
      ]
    );
  }

  // Giống trang "TTS / Phát loa" bên web: gửi văn bản tới đúng node này qua lệnh send_tts,
  // server sẽ tự chuyển văn bản thành giọng nói và phát qua loa ESP32 của node
  function handleSendTTS() {
    const text = ttsText.trim();
    if (!text) {
      Alert.alert('Thiếu nội dung', 'Vui lòng nhập nội dung cần phát');
      return;
    }
    setSendingTts(true);
    sendCommand({ type: 'send_tts', targetNodeId: node!.nodeId, text });
    setTtsText('');
    setTimeout(() => setSendingTts(false), 1000);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: theme.border }]}>
            <IconArrowLeft size={18} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.border }]} onPress={openEditModal}>
            <IconEdit size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>{node.label}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{node.location}</Text>

        <View style={styles.mainRow}>
          <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.barFill,
                { height: `${fillPercent}%`, backgroundColor: isFire ? theme.danger : theme.safe },
              ]}
            />
          </View>

          <View style={styles.infoCol}>
            <View style={[styles.infoCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Khói hiện tại</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{Math.round(node.smoke || 0)} ppm</Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Trạng thái</Text>
              <Text style={[styles.infoValue, { color: isFire ? theme.danger : theme.safe }]}>
                {isFire ? 'Đang cháy' : 'Bình thường'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.danger }]}
            onPress={handleTestFire}
            disabled={sending}
          >
            <IconFlame size={16} color="#fff" />
            <Text style={styles.actionBtnText}>{sending ? 'Đang gửi...' : 'Báo cháy thử'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.text }]}
            onPress={handleBuzzerOnly}
          >
            <Text style={[styles.actionBtnText, { color: theme.background }]}>Chỉ còi</Text>
          </TouchableOpacity>
        </View>

        {/* Phần TTS — tương đương trang "TTS / Phát loa" bên web, nhưng nhắm sẵn vào node này */}
        <View style={[styles.ttsSection, { borderColor: theme.border }]}>
          <View style={styles.ttsHeader}>
            <IconVolume size={16} color={theme.textSecondary} />
            <Text style={[styles.ttsTitle, { color: theme.text }]}>Phát thông báo giọng nói</Text>
          </View>
          <TextInput
            style={[styles.ttsInput, { borderColor: theme.border, color: theme.text }]}
            placeholder="Nhập nội dung cần phát qua loa node này..."
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={3}
            value={ttsText}
            onChangeText={setTtsText}
          />
          <TouchableOpacity
            style={[styles.ttsSendBtn, { backgroundColor: theme.accent }]}
            onPress={handleSendTTS}
            disabled={sendingTts}
          >
            <IconSend size={15} color="#fff" />
            <Text style={styles.ttsSendBtnText}>{sendingTts ? 'Đã gửi!' : 'Phát loa ngay'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.releaseBtn, { borderColor: theme.border }]}
          onPress={handleReleaseNode}
          disabled={releasing}
        >
          <IconDoorExit size={16} color={theme.textSecondary} />
          <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: 13 }}>
            {releasing ? 'Đang xử lý...' : 'Nhả node (về vô chủ)'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal sửa tên/vị trí node — tương đương modal "Cấu hình thiết bị" bên web */}
      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Cấu hình thiết bị</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <IconX size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Nhãn hiển thị</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: theme.border, color: theme.text }]}
              placeholder="VD: Node A - Tầng 1"
              placeholderTextColor={theme.textMuted}
              value={editLabel}
              onChangeText={setEditLabel}
            />

            <Text style={[styles.modalLabel, { color: theme.textSecondary, marginTop: 14 }]}>Vị trí / Khu vực</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: theme.border, color: theme.text }]}
              placeholder="VD: Phòng thí nghiệm A101"
              placeholderTextColor={theme.textMuted}
              value={editLocation}
              onChangeText={setEditLocation}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditVisible(false)}>
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: theme.accent }]} onPress={saveNodeEdit}>
                <IconCheck size={15} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600' }}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2, marginBottom: 24 },
  mainRow: { flexDirection: 'row', gap: 16 },
  barTrack: { width: 56, height: 220, borderRadius: 28, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 28 },
  infoCol: { flex: 1, gap: 12, justifyContent: 'flex-start' },
  infoCard: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 4 },
  infoLabel: { fontSize: 11 },
  infoValue: { fontSize: 18, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  ttsSection: { marginTop: 28, borderWidth: 1, borderRadius: 14, padding: 16 },
  ttsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  ttsTitle: { fontSize: 13, fontWeight: '700' },
  ttsInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13, minHeight: 70, textAlignVertical: 'top' },
  ttsSendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 10, marginTop: 12 },
  ttsSendBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  releaseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 46, borderRadius: 12, borderWidth: 1.5, marginTop: 16,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', borderRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalLabel: { fontSize: 12, marginBottom: 6 },
  modalInput: { borderWidth: 1, borderRadius: 10, height: 44, paddingHorizontal: 12, fontSize: 14 },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancelBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalSaveBtn: { flex: 1, flexDirection: 'row', gap: 6, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});