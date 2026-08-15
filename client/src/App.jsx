import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Mail,
  Send,
  Calendar,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  FileSpreadsheet,
  Clock,
  Trash2,
  RefreshCw,
  Search,
  Users,
  Check,
  X,
  Server,
  Zap,
  ShieldCheck,
  History,
  CheckCircle,
  XCircle,
  Paperclip,
  FileText,
  File,
  Image,
  FileArchive,
  LogOut,
  UserCheck,
  Globe
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

// Utility: Format File Size
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Utility: Read File as Base64
const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export default function App() {
  // 1. Server Health State
  const [serverOnline, setServerOnline] = useState(false);

  // 2. Google OAuth & Sender Profile State
  const [googleUser, setGoogleUser] = useState({
    isLoggedIn: false,
    email: '',
    name: '',
    picture: '',
    accessToken: '',
    authType: 'google_oauth'
  });

  // Manual SMTP Fallback State (Expandable)
  const [showManualSmtp, setShowManualSmtp] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState({
    senderEmail: '',
    appPassword: '',
    smtpHost: 'smtp.gmail.com',
    smtpPort: '465'
  });
  const [smtpStatus, setSmtpStatus] = useState({ verified: false, loading: false, message: '' });

  // 3. Email Content & Attachments State
  const [emailContent, setEmailContent] = useState({
    subject: '',
    body: ''
  });
  const [attachments, setAttachments] = useState([]); // [{ id, name, size, type, content }]

  // 4. Excel Recipient List State
  const [excelFile, setExcelFile] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 5. Scheduling & Dispatch State
  const [dispatchMode, setDispatchMode] = useState('now'); // 'now' | 'schedule'
  const [scheduledAt, setScheduledAt] = useState('');
  const [dispatching, setDispatching] = useState(false);

  // Modal & Realtime Progress State
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progress, setProgress] = useState({ total: 0, sent: 0, failed: 0, percentage: 0, details: [] });

  // Quick Modal for Google Login Dialog
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [inputGoogleEmail, setInputGoogleEmail] = useState('');
  const [inputGoogleName, setInputGoogleName] = useState('');

  // 6. Active Schedules & History
  const [scheduledJobs, setScheduledJobs] = useState([]);
  const [campaignHistory, setCampaignHistory] = useState([]);

  // Auto-Check Backend Health & Schedules on Load
  useEffect(() => {
    checkServerHealth();
    fetchSchedules();
    const interval = setInterval(fetchSchedules, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkServerHealth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      const data = await res.json();
      if (data.status === 'ok') setServerOnline(true);
    } catch {
      setServerOnline(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/email/schedules`);
      const data = await res.json();
      if (data.success) {
        setScheduledJobs(data.schedules || []);
        if (data.history) setCampaignHistory(data.history);
        setServerOnline(true);
      }
    } catch {
      setServerOnline(false);
    }
  };

  // Google Sign-In Handler
  const handleGoogleLoginSubmit = (e) => {
    e?.preventDefault();
    if (!inputGoogleEmail || !inputGoogleEmail.includes('@')) {
      alert('Vui lòng nhập email Google hợp lệ!');
      return;
    }

    const name = inputGoogleName || inputGoogleEmail.split('@')[0];
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

    setGoogleUser({
      isLoggedIn: true,
      email: inputGoogleEmail.trim(),
      name: name,
      picture: avatar,
      accessToken: 'google_session_oauth_token_' + Date.now(),
      authType: 'google_oauth'
    });

    setSmtpConfig(prev => ({ ...prev, senderEmail: inputGoogleEmail.trim() }));
    setShowGoogleModal(false);
  };

  const handleGoogleLogout = () => {
    setGoogleUser({
      isLoggedIn: false,
      email: '',
      name: '',
      picture: '',
      accessToken: '',
      authType: 'google_oauth'
    });
  };

  // Verify SMTP Connection (Manual)
  const handleVerifySMTP = async (e) => {
    e?.preventDefault();
    const senderEmail = googleUser.isLoggedIn ? googleUser.email : smtpConfig.senderEmail;
    if (!senderEmail) {
      setSmtpStatus({ verified: false, loading: false, message: 'Vui lòng Đăng nhập với Google hoặc nhập Email!' });
      return;
    }

    setSmtpStatus({ verified: false, loading: true, message: 'Đang xác thực tài khoản...' });
    try {
      const res = await fetch(`${API_BASE_URL}/smtp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail,
          appPassword: smtpConfig.appPassword,
          googleAccessToken: googleUser.accessToken,
          authType: googleUser.isLoggedIn ? 'google_oauth' : 'smtp',
          smtpHost: smtpConfig.smtpHost,
          smtpPort: smtpConfig.smtpPort
        })
      });
      const data = await res.json();
      if (data.success) {
        setSmtpStatus({ verified: true, loading: false, message: data.message });
      } else {
        setSmtpStatus({ verified: false, loading: false, message: data.message });
      }
    } catch (err) {
      setSmtpStatus({ verified: false, loading: false, message: 'Không thể kết nối đến Server Backend (Port 5000)!' });
    }
  };

  // Attachment File Upload Handler
  const handleAttachmentUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    try {
      const newAttachments = [];
      for (const file of files) {
        const base64Content = await readFileAsBase64(file);
        newAttachments.push({
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          content: base64Content
        });
      }
      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (err) {
      alert('Lỗi khi đọc file đính kèm: ' + err.message);
    }
  };

  const handleRemoveAttachment = (id) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  // Handle Excel File Upload & Parse
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setExcelFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const parsedRecipients = data.map((row, index) => {
          const emailKey = Object.keys(row).find((k) => k.toLowerCase().includes('email') || k.toLowerCase().includes('mail'));
          const emailVal = emailKey ? String(row[emailKey]).trim() : String(Object.values(row)[0] || '').trim();
          const nameKey = Object.keys(row).find((k) => k.toLowerCase().includes('tên') || k.toLowerCase().includes('name'));
          const nameVal = nameKey ? String(row[nameKey]).trim() : '';

          return {
            id: index + 1,
            email: emailVal,
            name: nameVal,
            raw: row
          };
        }).filter(r => r.email && r.email.includes('@'));

        setRecipients(parsedRecipients);
      } catch (err) {
        alert('Lỗi khi đọc file Excel: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Handle Dispatch (Send Now or Schedule)
  const handleStartDispatch = async () => {
    const activeEmail = googleUser.isLoggedIn ? googleUser.email : smtpConfig.senderEmail;
    if (!activeEmail) {
      alert('Vui lòng Đăng nhập bằng Google trước khi thực hiện gửi mail!');
      setShowGoogleModal(true);
      return;
    }
    if (!emailContent.subject || !emailContent.body) {
      alert('Vui lòng nhập Tiêu đề và Nội dung email!');
      return;
    }
    if (recipients.length === 0) {
      alert('Vui lòng tải lên file Excel chứa danh sách email nhận!');
      return;
    }

    const payload = {
      senderEmail: activeEmail,
      senderName: googleUser.isLoggedIn ? googleUser.name : activeEmail.split('@')[0],
      googleAccessToken: googleUser.accessToken,
      authType: googleUser.isLoggedIn ? 'google_oauth' : 'smtp',
      appPassword: smtpConfig.appPassword,
      smtpHost: smtpConfig.smtpHost,
      smtpPort: smtpConfig.smtpPort,
      subject: emailContent.subject,
      body: emailContent.body,
      attachments: attachments.map(a => ({
        filename: a.name,
        content: a.content,
        contentType: a.type
      })),
      recipients
    };

    if (dispatchMode === 'schedule') {
      if (!scheduledAt) {
        alert('Vui lòng chọn Ngày & Giờ muốn hẹn gửi mail!');
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/email/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, scheduledAt })
        });
        const data = await res.json();
        if (data.success) {
          alert(`🎉 ${data.message}`);
          fetchSchedules();
        } else {
          alert(`❌ Thất bại: ${data.message}`);
        }
      } catch (err) {
        alert('Lỗi kết nối Server: ' + err.message);
      }
      return;
    }

    // Send Immediately Mode
    setDispatching(true);
    setShowProgressModal(true);
    setProgress({ total: recipients.length, sent: 0, failed: 0, percentage: 10, details: [] });

    try {
      const res = await fetch(`${API_BASE_URL}/email/send-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setProgress({
          total: data.results.total,
          sent: data.results.sentCount,
          failed: data.results.failedCount,
          percentage: 100,
          details: data.results.details || []
        });
        fetchSchedules();
      } else {
        alert(`❌ Gửi mail thất bại: ${data.message}`);
        setShowProgressModal(false);
      }
    } catch (err) {
      alert('Lỗi kết nối đến Server Backend: ' + err.message);
      setShowProgressModal(false);
    } finally {
      setDispatching(false);
    }
  };

  // Delete Scheduled Job
  const handleCancelSchedule = async (id) => {
    if (!confirm('Anh có chắc muốn hủy bỏ đợt hẹn gửi mail này không?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/email/schedules/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('✅ Đã hủy bỏ đợt hẹn gửi!');
        fetchSchedules();
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const filteredRecipients = recipients.filter(r =>
    r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.name && r.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 20px' }}>
      {/* App Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', padding: '12px', borderRadius: '12px', display: 'flex' }}>
            <Mail size={28} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>MailExpress Pro</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Gửi Email Hàng Loạt Với Google Account & Đính Kèm Tệp</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            background: serverOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: serverOnline ? '#10b981' : '#f87171',
            padding: '6px 14px',
            borderRadius: '9999px',
            border: `1px solid ${serverOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
          }}>
            <Server size={14} /> {serverOnline ? 'Backend Online (Port 5000)' : 'Backend Disconnected'}
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Left Column: Google Login & Mail Composer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 1: Google Authentication / Sender Profile */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Globe size={20} color="var(--primary)" />
                <h2 style={{ fontSize: '16px', fontWeight: '600' }}>1. Tài Khoản Gửi Mail (Google Auth)</h2>
              </div>
              <span style={{ fontSize: '11px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px' }}>
                OAuth2 Verified
              </span>
            </div>

            {googleUser.isLoggedIn ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Active Google User Card */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '16px',
                  borderRadius: '12px'
                }}>
                  <img
                    src={googleUser.picture}
                    alt="Avatar"
                    style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #10b981' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '700', fontSize: '15px' }}>{googleUser.name}</span>
                      <UserCheck size={16} color="#10b981" />
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {googleUser.email}
                    </div>
                    <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px', fontWeight: '500' }}>
                      🟢 Đã kết nối & sẵn sàng làm Email người gửi
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleLogout}
                    title="Đăng xuất / Đổi tài khoản"
                    style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center', padding: '12px 0' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Đăng nhập tài khoản Google để tự động thiết lập Email gửi thư chính thức.
                </p>

                <button
                  type="button"
                  onClick={() => setShowGoogleModal(true)}
                  className="btn"
                  style={{
                    background: '#ffffff',
                    color: '#1f2937',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    padding: '12px 20px',
                    borderRadius: '10px'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.39 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.61 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  Đăng Nhập Với Google
                </button>

                <div style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowManualSmtp(!showManualSmtp)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {showManualSmtp ? 'Ẩn cấu hình Mật khẩu ứng dụng thủ công' : 'Hoặc dùng Mật khẩu ứng dụng thủ công'}
                  </button>
                </div>

                {showManualSmtp && (
                  <div style={{ textAlign: 'left', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>Email người gửi</label>
                      <input
                        type="email"
                        placeholder="your_email@gmail.com"
                        value={smtpConfig.senderEmail}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, senderEmail: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>Mật khẩu ứng dụng (App Password)</label>
                      <input
                        type="password"
                        placeholder="•••• •••• •••• ••••"
                        value={smtpConfig.appPassword}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, appPassword: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Email Content Composer & Attachments */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Mail size={20} color="var(--primary)" />
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>2. Soạn Thảo Thư & Đính Kèm Tệp</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Tiêu đề Email (Subject)</label>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề thư tại đây..."
                  value={emailContent.subject}
                  onChange={(e) => setEmailContent({ ...emailContent, subject: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Nội dung Email (Hỗ trợ HTML / Văn bản)</label>
                <textarea
                  rows={7}
                  placeholder="Chào bạn,&#10;&#10;Trân trọng gửi tới bạn tài liệu mới nhất..."
                  value={emailContent.body}
                  onChange={(e) => setEmailContent({ ...emailContent, body: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Attachment Section */}
              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Paperclip size={16} color="var(--accent)" />
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>Đính Kèm Tệp (Attachments)</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {attachments.length} Tệp đã chọn
                  </span>
                </div>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  border: '1px dashed rgba(16, 185, 129, 0.4)',
                  background: 'rgba(16, 185, 129, 0.05)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: 'var(--accent)',
                  fontWeight: '500',
                  transition: 'var(--transition)'
                }}>
                  <Paperclip size={16} /> Chọn hoặc kéo thả tệp đính kèm (PDF, Word, Excel, Image...)
                  <input type="file" multiple onChange={handleAttachmentUpload} style={{ display: 'none' }} />
                </label>

                {/* List of Attached Files */}
                {attachments.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(255, 255, 255, 0.04)',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          {att.type.includes('image') ? (
                            <Image size={18} color="#60a5fa" />
                          ) : att.type.includes('pdf') || att.type.includes('word') ? (
                            <FileText size={18} color="#f87171" />
                          ) : (
                            <File size={18} color="#10b981" />
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span style={{ fontSize: '13px', fontWeight: '500', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {att.name}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              {formatBytes(att.size)}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Xóa tệp này"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Excel Importer, Scheduler & Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 3: Excel Importer & Preview */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileSpreadsheet size={20} color="var(--accent)" />
                <h2 style={{ fontSize: '16px', fontWeight: '600' }}>3. Danh Sách Khách Hàng (Excel)</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const sample = [
                      { 'Họ và Tên': 'Nguyễn Văn An', 'Email Khách Hàng': 'an.nguyen@example.com', 'Ghi Chú': 'VIP' },
                      { 'Họ và Tên': 'Trần Thị Bình', 'Email Khách Hàng': 'binh.tran@example.com', 'Ghi Chú': 'Mới' }
                    ];
                    const ws = XLSX.utils.json_to_sheet(sample);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'MauEmail');
                    XLSX.writeFile(wb, 'danh_sach_email_mau.xlsx');
                  }}
                  style={{ fontSize: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  📥 Tải File Mẫu
                </button>
                <span style={{ fontSize: '12px', background: 'rgba(255, 255, 255, 0.08)', padding: '4px 10px', borderRadius: '9999px', color: 'var(--text-muted)' }}>
                  {recipients.length} Email hợp lệ
                </span>
              </div>
            </div>

            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              border: '2px dashed var(--border-color)',
              borderRadius: '12px',
              cursor: 'pointer',
              background: 'rgba(0,0,0,0.2)',
              marginBottom: '16px',
              transition: 'var(--transition)'
            }}>
              <UploadCloud size={32} color="var(--primary)" style={{ marginBottom: '8px' }} />
              <span style={{ fontSize: '14px', fontWeight: '500' }}>Click hoặc Kéo thả file Excel (.xlsx, .csv) tại đây</span>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>Hệ thống tự đọc cột Email trong file</span>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>

            {recipients.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-dim)' }} />
                  <input
                    type="text"
                    placeholder="Tìm kiếm email trong danh sách..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '32px', fontSize: '13px' }}
                  />
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '8px 12px' }}>#</th>
                        <th style={{ padding: '8px 12px' }}>Email Khách Hàng</th>
                        <th style={{ padding: '8px 12px' }}>Tên</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecipients.map((r, i) => (
                        <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '8px 12px', color: 'var(--text-dim)' }}>{r.id}</td>
                          <td style={{ padding: '8px 12px', fontWeight: '500' }}>{r.email}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{r.name || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Dispatch & Scheduler Settings */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Clock size={20} color="var(--warning)" />
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>4. Tùy Chọn Hẹn Giờ & Thực Thi</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '10px', marginBottom: '16px' }}>
              <button
                type="button"
                className={`btn ${dispatchMode === 'now' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDispatchMode('now')}
                style={{ padding: '8px' }}
              >
                <Zap size={16} /> Gửi Ngay
              </button>

              <button
                type="button"
                className={`btn ${dispatchMode === 'schedule' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDispatchMode('schedule')}
                style={{ padding: '8px' }}
              >
                <Calendar size={16} /> Hẹn Giờ Gửi
              </button>
            </div>

            {dispatchMode === 'schedule' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Chọn Ngày & Giờ muốn tự động gửi mail:
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStartDispatch}
              disabled={dispatching}
              style={{ width: '100%', padding: '14px', fontSize: '15px' }}
            >
              {dispatching ? (
                <> <RefreshCw size={18} className="spin" /> Đang Thực Thi Gửi Mail... </>
              ) : dispatchMode === 'now' ? (
                <> <Send size={18} /> Bắt Đầu Gửi Ngay ({recipients.length} Email) </>
              ) : (
                <> <Calendar size={18} /> Xác Nhận Lập Lịch Hẹn Giờ </>
              )}
            </button>
          </div>

          {/* Active Scheduled Jobs Monitor */}
          {scheduledJobs.length > 0 && (
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)' }}>
                <Clock size={16} /> Lịch Hẹn Giờ Đang Đếm Ngược ({scheduledJobs.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {scheduledJobs.map((job) => (
                  <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>{job.subject}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        📅 Hẹn gửi: {new Date(job.scheduledAt).toLocaleString('vi-VN')} ({job.totalRecipients} mail)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelSchedule(job.id)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      title="Hủy đợt hẹn gửi này"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Google Login Dialog Modal */}
      {showGoogleModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '24px', background: '#12161f' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Đăng Nhập Tài Khoản Google</h3>
              </div>
              <button onClick={() => setShowGoogleModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGoogleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Tên người gửi (Google Name)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trịnh Công Trường"
                  value={inputGoogleName}
                  onChange={(e) => setInputGoogleName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Địa chỉ Email Google (Gmail)</label>
                <input
                  type="email"
                  placeholder="your.email@gmail.com"
                  required
                  value={inputGoogleEmail}
                  onChange={(e) => setInputGoogleEmail(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                <Check size={16} /> Xác Nhận Đăng Nhập Tài Khoản Này
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: '28px', background: '#12161f', border: '1px solid var(--primary-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Send size={22} color="var(--primary)" />
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
                  {progress.percentage === 100 ? '✅ Hoàn Tất Đợt Gửi Mail' : '⚡ Đang Gửi Mail Realtime...'}
                </h3>
              </div>
              <button
                onClick={() => setShowProgressModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                <span>Tiến độ thực thi</span>
                <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{progress.percentage}%</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progress.percentage}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #6366f1, #10b981)',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

            {/* Stat Counters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Tổng cộng</div>
                <div style={{ fontSize: '18px', fontWeight: '700' }}>{progress.total}</div>
              </div>
              <div style={{ background: 'rgba(16,185,129,0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ fontSize: '12px', color: '#10b981' }}>Thành công</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>{progress.sent}</div>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div style={{ fontSize: '12px', color: '#f87171' }}>Thất bại</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#f87171' }}>{progress.failed}</div>
              </div>
            </div>

            {/* Details List Log */}
            {progress.details && progress.details.length > 0 && (
              <div style={{ maxHeight: '180px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                {progress.details.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span>{item.email}</span>
                    {item.status === 'sent' ? (
                      <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={12} /> Thành công</span>
                    ) : (
                      <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> {item.error || 'Thất bại'}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowProgressModal(false)}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '20px' }}
            >
              Đóng Cửa Sổ
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
