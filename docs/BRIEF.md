# 💡 BRIEF: Bulk Email Sender (Ứng Dụng Web Gửi Mail Hàng Loạt)

**Ngày tạo:** 2026-08-14  
**Trạng thái:** 💡 Brainstorming & Concept  

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
Người dùng/Doanh nghiệp cần một công cụ đơn giản, trực quan trên giao diện Web để gửi email thông báo, marketing hoặc chăm sóc hàng loạt từ danh sách khách hàng lưu trong file Excel mà không phải nhập thủ công từng email.

## 2. GIẢI PHÁP ĐỀ XUẤT
Một Web App hiện đại, giao diện tinh tế (phong cách Notion/Linear/Stripe), cho phép:
1. Nhập cấu hình Sender (Cấu hình Gmail SMTP / App Password / Custom Mail Server).
2. Nhập Tiêu đề (Subject) và Soạn nội dung (HTML / Rich Text Editor / Template).
3. Tải lên file Excel (.xlsx / .xls / .csv) chứa danh sách email.
4. Đọc danh sách, cho phép xem trước (Preview) data trước khi bấm gửi.
5. Tiến hành gửi mail hàng loạt theo hàng đợi (Queue) kèm thanh tiến trình realtime.

## 3. ĐỐI TƯỢNG SỬ DỤNG
- **Chính:** Nhân viên Marketing, Sales, CSKH hoặc Cá nhân cần gửi mail nhóm/hàng loạt.
- **Phụ:** Quản trị viên cần phát tin thông báo nội bộ.

## 4. PHÂN TÍCH TÍNH NĂNG (MVP VS PHASE 2)

### 🚀 MVP (Phiên bản đầu tiên - Bắt buộc có):
- [ ] **1. Form Cấu hình Người Gửi:** Email người gửi, Mật khẩu ứng dụng (App Password) / Cấu hình SMTP.
- [ ] **2. Form Soạn Thảo Mail:** Ô nhập Tiêu đề (Subject) & Khung soạn thảo nội dung (Rich Text Editor).
- [ ] **3. Import & Parser Excel:** Đọc file Excel client-side (`xlsx.js`), hiển thị xem trước danh sách email khách hàng và tự động phát hiện cột `Email`.
- [ ] **4. Tiến Trình Gửi Realtime:** Bấm "Gửi Hàng Loạt", hiển thị Progress Bar %, trạng thái Thành công / Thất bại cho từng email.

### 🎁 Phase 2 (Nâng cấp sau):
- [ ] **Cá nhân hóa nội dung mail:** Chèn biến `{{Tên}}`, `{{CôngTy}}` từ các cột trong file Excel.
- [ ] **Quản lý Template Mail:** Lưu và xem trước nhiều mẫu email.
- [ ] **Lịch sử gửi:** Xem nhật ký các đợt gửi mail đã thực hiện.

---

## 5. ĐÁNH GIÁ KỸ THUẬT & TÙY CHỌN KIẾN TRÚC

| Tùy chọn | Ưu điểm | Nhược điểm | Đánh giá |
|---|---|---|---|
| **Option A: Web App Thuần Client (Vite + React + EmailJS/SMTP API)** | Giao diện đẹp, chạy siêu nhanh, cài đặt đơn giản | Cần EmailJS hoặc SMTP Relay API | 🌟 Rất mượt, dễ dùng |
| **Option B: Web App Fullstack (Node.js + Express + Nodemailer)** | Gửi qua Gmail SMTP trực tiếp, không qua trung gian | Cần chạy server Node.js đằng sau | ⚡ Mạnh mẽ, tự chủ 100% |

---

## 6. BƯỚC TIẾP THEO
→ Chuyển sang lệnh `/plan` để lập kế hoạch triển khai kiến trúc chi tiết.
