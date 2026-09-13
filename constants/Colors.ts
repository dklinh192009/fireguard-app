// Bảng màu FireGuard Pro — lấy từ design-system.md
// Mỗi "vai trò" màu (role) có 1 tên riêng dễ nhớ, dùng chung cho toàn app
// Khi cần đổi màu, chỉ sửa 1 chỗ ở đây, không phải tìm khắp các file màn hình

export default {
  light: {
    // Nền & chữ
    background:       '#fefef3', // Kem nhạt — nền chính
    card:             '#fefef3', // Card dùng chung màu nền (theo design-system)
    text:             '#262236', // Navy đậm gần đen — chữ chính
    textSecondary:    '#6b6858', // Chữ phụ
    textMuted:        '#8a8875', // Chữ mờ / placeholder
    border:           '#ece9d9',

    // Accent (màu thương hiệu)
    accent:           '#3d4f7e', // Navy — nút chính, icon nổi bật
    accentOrange:     '#e18546', // Cam — highlight, cảnh báo nhẹ

    // Trạng thái
    danger:           '#d6483f', // Đỏ — CHỈ dùng cho lửa/cảnh báo/xoá/đăng xuất
    safe:             '#5c8a45', // Xanh lá — an toàn

    // Giữ lại 2 key gốc của Expo để các file cũ không bị lỗi thiếu biến
    tint:             '#3d4f7e',
    tabIconDefault:   '#8a8875',
    tabIconSelected:  '#3d4f7e',
  },
  dark: {
    background:       '#232228',
    card:             '#2c2b33',
    cardElevated:     '#35333d', // Card nổi: thanh nav, avatar placeholder
    text:             '#f4f3f6',
    textSecondary:    '#a5a3ad',
    textMuted:        '#6f6d78',
    border:           '#3a3942',

    accent:           '#3d4f7e',
    accentOrange:     '#e18546',

    danger:           '#d6483f',
    safe:             '#7fa06a',

    tint:             '#f4f3f6',
    tabIconDefault:   '#6f6d78',
    tabIconSelected:  '#f4f3f6',
  },
};