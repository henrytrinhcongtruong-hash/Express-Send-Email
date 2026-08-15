import streamlit as st
import pandas as pd
import smtplib
import time
import base64
import re
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

# Page Configuration
st.set_page_config(
    page_title="MailExpress Pro - Gửi Mail Hàng Loạt",
    page_icon="📧",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS Styling for Modern Dark Glassmorphism Aesthetics
st.markdown("""
<style>
    /* Global Styling */
    .stApp {
        background-color: #0a0c10;
        color: #f3f4f6;
    }
    
    /* Header Card */
    .header-card {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(67, 56, 202, 0.25) 100%);
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 24px;
        backdrop-filter: blur(12px);
    }
    
    /* Custom Card */
    .custom-card {
        background: rgba(18, 22, 31, 0.75);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 20px;
        margin-bottom: 20px;
    }
    
    /* User Profile Card */
    .profile-card {
        background: rgba(16, 185, 129, 0.08);
        border: 1px solid rgba(16, 185, 129, 0.3);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 14px;
    }
    
    /* File Chip */
    .file-chip {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 8px 12px;
        margin-top: 6px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .stButton>button {
        border-radius: 10px;
        font-weight: 600;
    }
</style>
""", unsafe_allow_html=True)

# Initialize Session States
if "google_user" not in st.session_state:
    st.session_state.google_user = {
        "is_logged_in": False,
        "email": "",
        "name": "",
        "app_password": ""
    }

# Format File Size
def format_bytes(size_in_bytes):
    if not size_in_bytes:
        return "0 Bytes"
    for unit in ['Bytes', 'KB', 'MB', 'GB']:
        if size_in_bytes < 1024.0:
            return f"{size_in_bytes:.2f} {unit}"
        size_in_bytes /= 1024.0
    return f"{size_in_bytes:.2f} GB"

# App Header
st.markdown("""
<div class="header-card">
    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">⚡ MailExpress Pro - Streamlit Edition</h1>
    <p style="margin: 6px 0 0 0; color: #9ca3af; font-size: 14px;">
        Ứng dụng Gửi Email Hàng Loạt với Đăng nhập Google Account & Đính kèm Tệp tự động.
    </p>
</div>
""", unsafe_allow_html=True)

# Sidebar: Google Authentication Configuration
with st.sidebar:
    st.image("https://api.dicebear.com/7.x/identicon/svg?seed=MailExpress", width=64)
    st.title("⚙️ Cấu Hình Người Gửi")
    
    if st.session_state.google_user["is_logged_in"]:
        st.markdown(f"""
        <div class="profile-card">
            <div>
                <div style="font-weight: 700; color: #ffffff; font-size: 15px;">{st.session_state.google_user['name']}</div>
                <div style="color: #9ca3af; font-size: 13px;">{st.session_state.google_user['email']}</div>
                <div style="color: #10b981; font-size: 11px; margin-top: 4px; font-weight: 600;">🟢 Google Account Connected</div>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        st.write("")
        if st.button("🚪 Đăng xuất / Chọn Tài Khoản Khác", use_container_width=True):
            st.session_state.google_user = {
                "is_logged_in": False,
                "email": "",
                "name": "",
                "app_password": ""
            }
            st.rerun()
    else:
        st.subheader("🔑 Đăng Nhập Tài Khoản Google")
        g_name = st.text_input("Tên người gửi (Google Display Name)", value="Trịnh Công Trường")
        g_email = st.text_input("Email Google người gửi (Gmail)", value="", placeholder="your.name@gmail.com")
        g_password = st.text_input("Mật khẩu ứng dụng (App Password)", type="password", help="Tạo App Password trong Google Account > Security > App Passwords")
        
        st.caption("ℹ️ Hệ thống dùng tài khoản Google đã đăng nhập để gửi thư trực tiếp.")
        
        if st.button("✅ Xác Nhận Đăng Nhập Google", type="primary", use_container_width=True):
            if not g_email or "@" not in g_email:
                st.error("Vui lòng nhập Email Google hợp lệ!")
            elif not g_password:
                st.error("Vui lòng nhập Mật khẩu ứng dụng (App Password) của tài khoản Google!")
            else:
                st.session_state.google_user = {
                    "is_logged_in": True,
                    "email": g_email.strip(),
                    "name": g_name.strip() if g_name else g_email.split("@")[0],
                    "app_password": g_password.strip()
                }
                st.success("🎉 Đăng nhập thành công!")
                time.sleep(0.5)
                st.rerun()

# Main Workspace Grid (2 Columns)
col1, col2 = st.columns([1, 1], gap="large")

# Left Column: Email Content Composer & Attachments
with col1:
    st.subheader("📝 1. Soạn Thảo Nội Dung & Đính Kèm Tệp")
    
    email_subject = st.text_input("Tiêu đề Email (Subject)", placeholder="[Thông Báo] Nhận tài liệu hướng dẫn mới nhất...")
    
    email_body = st.text_area(
        "Nội dung Email (Hỗ trợ HTML / Văn bản)",
        height=200,
        placeholder="Chào bạn,\n\nChúng tôi trân trọng gửi tới bạn tài liệu đính kèm..."
    )
    
    # Attachments Uploader
    st.markdown("---")
    st.subheader("📎 2. Đính Kèm Tệp (Attachments)")
    
    uploaded_attachments = st.file_uploader(
        "Tải lên các tệp đính kèm (PDF, Word, Excel, Hình ảnh, ZIP...)",
        accept_multiple_files=True,
        key="attachments_uploader"
    )
    
    if uploaded_attachments:
        st.caption(f"📁 Đã chọn {len(uploaded_attachments)} tệp đính kèm:")
        for att in uploaded_attachments:
            st.markdown(f"""
            <div class="file-chip">
                <span>📄 <b>{att.name}</b> ({format_bytes(att.size)})</span>
            </div>
            """, unsafe_allow_html=True)

# Right Column: Excel Recipient List & Dispatch
with col2:
    st.subheader("📥 3. Danh Sách Khách Hàng (Excel / CSV)")
    
    excel_file = st.file_uploader(
        "Tải lên file Excel (.xlsx, .csv) chứa cột Email nhận",
        type=["xlsx", "xls", "csv"],
        key="excel_uploader"
    )
    
    recipients_list = []
    
    if excel_file is not None:
        try:
            if excel_file.name.endswith('.csv'):
                df = pd.read_csv(excel_file)
            else:
                df = pd.read_excel(excel_file)
            
            # Find Email Column automatically
            email_col = None
            for col in df.columns:
                if 'email' in str(col).lower() or 'mail' in str(col).lower():
                    email_col = col
                    break
            if not email_col and len(df.columns) > 0:
                email_col = df.columns[0]
                
            if email_col:
                raw_emails = df[email_col].dropna().astype(str).tolist()
                recipients_list = [e.strip() for e in raw_emails if '@' in e and '.' in e]
                
                st.success(f"✅ Đã tìm thấy {len(recipients_list)} Email hợp lệ trong cột '{email_col}'!")
                
                # Preview Table
                with st.expander("👁️ Xem danh sách người nhận", expanded=True):
                    st.dataframe(df[[email_col]], use_container_width=True, height=180)
            else:
                st.error("Không tìm thấy cột chứa Email trong file Excel!")
        except Exception as e:
            st.error(f"Lỗi đọc file Excel: {str(e)}")
    else:
        st.info("💡 Chưa có file Excel? Tải file mẫu bên dưới:")
        sample_df = pd.DataFrame([
            {"Họ và Tên": "Nguyễn Văn An", "Email": "an.nguyen@example.com"},
            {"Họ và Tên": "Trần Thị Bình", "Email": "binh.tran@example.com"}
        ])
        csv_bytes = sample_df.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📥 Tải File Excel Mẫu (.csv)",
            data=csv_bytes,
            file_name="danh_sach_email_mau.csv",
            mime="text/csv"
        )
    
    st.markdown("---")
    st.subheader("🚀 4. Gửi Mail Realtime")
    
    can_send = st.session_state.google_user["is_logged_in"] and email_subject and email_body and len(recipients_list) > 0
    
    if not st.session_state.google_user["is_logged_in"]:
        st.warning("⚠️ Vui lòng Đăng nhập tài khoản Google ở thanh bên trái trước!")
    elif len(recipients_list) == 0:
        st.warning("⚠️ Vui lòng tải lên danh sách Email từ file Excel!")
    elif not email_subject or not email_body:
        st.warning("⚠️ Vui lòng điền Tiêu đề và Nội dung Email!")
        
    if st.button("⚡ Bắt Đầu Gửi Mail Ngay", type="primary", disabled=not can_send, use_container_width=True):
        sender_email = st.session_state.google_user["email"]
        sender_name = st.session_state.google_user["name"]
        app_password = st.session_state.google_user["app_password"]
        
        progress_bar = st.progress(0)
        status_text = st.empty()
        log_box = st.container()
        
        sent_count = 0
        failed_count = 0
        logs = []
        
        total = len(recipients_list)
        
        try:
            # Connect to SMTP Server
            server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
            server.login(sender_email, app_password)
            
            for index, target_email in enumerate(recipients_list):
                try:
                    # Create MIME Multipart Message
                    msg = MIMEMultipart()
                    msg['From'] = f'"{sender_name}" <{sender_email}>'
                    msg['To'] = target_email
                    msg['Subject'] = email_subject
                    
                    # Attach HTML Body
                    msg.attach(MIMEText(email_body, 'html' if '<' in email_body and '>' in email_body else 'plain', 'utf-8'))
                    
                    # Attach Files
                    if uploaded_attachments:
                        for file in uploaded_attachments:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(file.getvalue())
                            encoders.encode_base64(part)
                            part.add_header('Content-Disposition', f'attachment; filename="{file.name}"')
                            msg.attach(part)
                    
                    server.send_message(msg)
                    sent_count += 1
                    logs.append({"Email": target_email, "Trạng thái": "✅ Thành công"})
                except Exception as err:
                    failed_count += 1
                    logs.append({"Email": target_email, "Trạng thái": f"❌ Lỗi: {str(err)}"})
                
                # Update Realtime Progress Bar
                current_percent = int(((index + 1) / total) * 100)
                progress_bar.progress(current_percent)
                status_text.markdown(f"**Tiến độ: {index + 1}/{total} email ({current_percent}%)**")
                time.sleep(0.3)
                
            server.quit()
            
            st.balloons()
            st.success(f"🎉 Hoàn tất đợt gửi mail! Thành công: {sent_count}/{total} - Thất bại: {failed_count}")
            
            with log_box:
                st.dataframe(pd.DataFrame(logs), use_container_width=True)
                
        except Exception as conn_err:
            st.error(f"❌ Không thể kết nối đến máy chủ Gmail SMTP: {str(conn_err)}. Vui lòng kiểm tra lại App Password!")
