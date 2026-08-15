# Phase 02: Backend API & Cron Scheduler
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Xây dựng Express API xử lý gửi email qua Nodemailer và bộ quản lý Hẹn Giờ Gửi Mail (Cron Scheduler).

## Implementation Steps
1. [x] Xây dựng API `/api/smtp/verify`: Kiểm tra tính hợp lệ của Email & App Password.
2. [x] Xây dựng API `/api/email/send-now`: Nhận danh sách mail khách hàng, tiêu đề, nội dung và thực hiện gửi mail theo hàng đợi (batch queue).
3. [x] Xây dựng Bộ Hẹn Giờ `node-cron` (`/api/email/schedule`): Đặt lịch gửi mail theo Ngày & Giờ chỉ định.
4. [x] Xây dựng API `/api/email/schedules`: Truy vấn danh sách và hủy lịch gửi mail chưa chạy (`DELETE /api/email/schedules/:id`).

