import streamlit as st
import pandas as pd
import smtplib
import time
import re
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

# Page Configuration
st.set_page_config(
    page_title="MailExpress Pro",
    page_icon="✉️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Modern Minimalist Theme (Linear / Stripe Style)
st.markdown("""
<style>
    /* Hide Streamlit Default UI Elements */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    .stApp {
        background-color: #090d16;
        color: #f8fafc;
    }
    
    /* Brand Header Card */
    .brand-header {
        background: linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 20px 24px;
        margin-bottom: 24px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }
    
    .brand-title {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.5px;
        color: #ffffff;
        margin: 0;
    }
    
    .brand-subtitle {
        font-size: 13px;
        color: #94a3b8;
        margin-top: 4px;
        font-weight: 400;
    }
    
    /* User Profile Card */
    .profile-box {
        background: #131c2e;
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 10px;
        padding: 14px 16px;
        margin-bottom: 16px;
    }
    
    .profile-name {
        font-weight: 600;
        font-size: 14px;
        color: #f8fafc;
    }
    
    .profile-email {
        font-size: 12px;
        color: #94a3b8;
        margin-top: 2px;
    }
    
    .profile-status {
        display: inline-block;
        font-size: 11px;
        color: #10b981;
        font-weight: 500;
        margin-top: 6px;
    }
    
    /* Clean File Item */
    .file-item {
        background: rgba(30, 41, 59, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 13px;
        color: #cbd5e1;
        margin-top: 6px;
    }
    
    /* Primary Buttons */
    .stButton>button {
        background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%) !important;
        color: #ffffff !important;
        border: none !important;
        border-radius: 8px !important;
        font-weight: 600 !important;
        font-size: 14px !important;
        padding: 10px 20px !important;
        transition: all 0.2s ease !important;
    }
    
    .stButton>button:hover {
        opacity: 0.9 !important;
        transform: translateY(-1px) !important;
    }
    
    /* Form Section Headers */
    .section-title {
        font-size: 16px;
        font-weight: 600;
        color: #f8fafc;
        margin-bottom: 14px;
        letter-spacing: -0.3px;
    }
</style>
""", unsafe_allow_html=True)

# Session State Initialization
if "google_user" not in st.session_state:
    st.session_state.google_user = {
        "is_logged_in": False,
        "email": "",
        "name": "",
        "app_password": ""
    }

# File Size Formatter
def format_bytes(size_in_bytes):
    if not size_in_bytes:
        return "0 Bytes"
    for unit in ['Bytes', 'KB', 'MB', 'GB']:
        if size_in_bytes < 1024.0:
            return f"{size_in_bytes:.2f} {unit}"
        size_in_bytes /= 1024.0
    return f"{size_in_bytes:.2f} GB"

# Brand Header Component
st.markdown("""
<div class="brand-header">
    <div class="brand-title">MailExpress Pro</div>
    <div class="brand-subtitle">Hệ thống gửi email hàng loạt và quản lý tài khoản người gửi.</div>
</div>
""", unsafe_allow_html=True)

# Sidebar Configuration
with st.sidebar:
    st.markdown('<div class="section-title">Cấu Hình Người Gửi</div>', unsafe_allow_html=True)
    
    if st.session_state.google_user["is_logged_in"]:
        st.markdown(f"""
        <div class="profile-box">
            <div class="profile-name">{st.session_state.google_user['name']}</div>
            <div class="profile-email">{st.session_state.google_user['email']}</div>
            <div class="profile-status">● Đã kết nối tài khoản Google</div>
        </div>
        """, unsafe_allow_html=True)
        
        if st.button("Đổi Tài Khoản Người Gửi", use_container_width=True):
            st.session_state.google_user = {
                "is_logged_in": False,
                "email": "",
                "name": "",
                "app_password": ""
            }
            st.rerun()
    else:
        g_name = st.text_input("Tên người gửi", value="Trịnh Công Trường")
        g_email = st.text_input("Email Google (Gmail)", value="", placeholder="name@domain.com")
        g_password = st.text_input("Mật khẩu ứng dụng (App Password)", type="password")
        
        if st.button("Xác Nhận Tài Khoản", type="primary", use_container_width=True):
            if not g_email or "@" not in g_email:
                st.error("Email không hợp lệ.")
            elif not g_password:
                st.error("Vui lòng nhập Mật khẩu ứng dụng.")
            else:
                st.session_state.google_user = {
                    "is_logged_in": True,
                    "email": g_email.strip(),
                    "name": g_name.strip() if g_name else g_email.split("@")[0],
                    "app_password": g_password.strip()
                }
                st.success("Xác thực thành công.")
                time.sleep(0.3)
                st.rerun()

# 2-Column Layout
col1, col2 = st.columns([1, 1], gap="large")

# Left Column: Email Composer & Attachments
with col1:
    st.markdown('<div class="section-title">Soạn Thảo Thư</div>', unsafe_allow_html=True)
    
    email_subject = st.text_input("Tiêu đề Email", placeholder="Nhập tiêu đề thư...")
    
    email_body = st.text_area(
        "Nội dung Email",
        height=210,
        placeholder="Soạn thảo nội dung văn bản hoặc HTML tại đây..."
    )
    
    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown('<div class="section-title">Tệp Đính Kèm</div>', unsafe_allow_html=True)
    
    uploaded_attachments = st.file_uploader(
        "Chọn tệp đính kèm",
        accept_multiple_files=True,
        key="attachments_uploader"
    )
    
    if uploaded_attachments:
        for att in uploaded_attachments:
            st.markdown(f"""
            <div class="file-item">
                <b>{att.name}</b> — {format_bytes(att.size)}
            </div>
            """, unsafe_allow_html=True)

# Right Column: Recipient List & Dispatch
with col2:
    st.markdown('<div class="section-title">Danh Sách Người Nhận</div>', unsafe_allow_html=True)
    
    excel_file = st.file_uploader(
        "Tải lên file danh sách (.xlsx, .csv)",
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
                
                st.caption(f"Đã xác nhận {len(recipients_list)} email hợp lệ.")
                
                with st.expander("Xem chi tiết danh sách", expanded=True):
                    st.dataframe(df[[email_col]], use_container_width=True, height=170)
            else:
                st.error("Không tìm thấy cột Email trong file.")
        except Exception as e:
            st.error(f"Lỗi đọc file: {str(e)}")
    else:
        # Sample DataFrame with pure English headers to avoid font encoding issues
        sample_df = pd.DataFrame([
            {"Name": "Nguyen Van An", "Email": "an.nguyen@example.com", "Note": "VIP Client"},
            {"Name": "Tran Thi Binh", "Email": "binh.tran@example.com", "Note": "New Client"}
        ])
        csv_bytes = sample_df.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="Tải File Mẫu (.csv)",
            data=csv_bytes,
            file_name="sample_email_list.csv",
            mime="text/csv"
        )
    
    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown('<div class="section-title">Thực Thi Gửi Mail</div>', unsafe_allow_html=True)
    
    can_send = st.session_state.google_user["is_logged_in"] and email_subject and email_body and len(recipients_list) > 0
    
    if not st.session_state.google_user["is_logged_in"]:
        st.caption("Chưa kết nối tài khoản người gửi.")
    elif len(recipients_list) == 0:
        st.caption("Chưa có danh sách email người nhận.")
    elif not email_subject or not email_body:
        st.caption("Vui lòng nhập tiêu đề và nội dung thư.")
        
    if st.button("Bắt Đầu Gửi Mail", type="primary", disabled=not can_send, use_container_width=True):
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
            server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
            server.login(sender_email, app_password)
            
            for index, target_email in enumerate(recipients_list):
                try:
                    msg = MIMEMultipart()
                    msg['From'] = f'"{sender_name}" <{sender_email}>'
                    msg['To'] = target_email
                    msg['Subject'] = email_subject
                    
                    msg.attach(MIMEText(email_body, 'html' if '<' in email_body and '>' in email_body else 'plain', 'utf-8'))
                    
                    if uploaded_attachments:
                        for file in uploaded_attachments:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(file.getvalue())
                            encoders.encode_base64(part)
                            part.add_header('Content-Disposition', f'attachment; filename="{file.name}"')
                            msg.attach(part)
                    
                    server.send_message(msg)
                    sent_count += 1
                    logs.append({"Email": target_email, "Trạng thái": "Thành công"})
                except Exception as err:
                    failed_count += 1
                    logs.append({"Email": target_email, "Trạng thái": f"Thất bại: {str(err)}"})
                
                current_percent = int(((index + 1) / total) * 100)
                progress_bar.progress(current_percent)
                status_text.caption(f"Tiến độ: {index + 1}/{total} email ({current_percent}%)")
                time.sleep(0.3)
                
            server.quit()
            st.success(f"Hoàn tất đợt gửi. Thành công: {sent_count}/{total} - Thất bại: {failed_count}")
            
            with log_box:
                st.dataframe(pd.DataFrame(logs), use_container_width=True)
                
        except Exception as conn_err:
            st.error(f"Lỗi kết nối máy chủ gửi mail: {str(conn_err)}")
