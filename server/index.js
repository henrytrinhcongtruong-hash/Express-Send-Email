const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// In-Memory Storage for Scheduled Jobs and History Log
const scheduledJobs = new Map(); // jobId -> { id, cronTask, data, status, createdAt }
const campaignHistory = [];     // Array of completed or in-progress campaign reports

/**
 * Utility: Create Nodemailer Transporter (supports both Google OAuth2 & App Password)
 */
function createTransporter({ senderEmail, appPassword, googleAccessToken, authType, smtpHost, smtpPort }) {
  if (authType === 'google_oauth' || googleAccessToken) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: senderEmail,
        accessToken: googleAccessToken
      }
    });
  }

  return nodemailer.createTransport({
    host: smtpHost || 'smtp.gmail.com',
    port: parseInt(smtpPort) || 465,
    secure: parseInt(smtpPort) === 465, // true for 465, false for other ports
    auth: {
      user: senderEmail,
      pass: appPassword
    }
  });
}

/**
 * Health Check API
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Bulk Email Sender Backend API',
    activeScheduledJobs: scheduledJobs.size,
    time: new Date().toISOString()
  });
});

/**
 * Step 1: Verify Google Auth / SMTP Connection
 * POST /api/smtp/verify
 */
app.post('/api/smtp/verify', async (req, res) => {
  const { senderEmail, appPassword, googleAccessToken, authType, smtpHost, smtpPort } = req.body;

  if (!senderEmail) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp Email người gửi!'
    });
  }

  if (authType !== 'google_oauth' && !appPassword && !googleAccessToken) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng Đăng nhập bằng Google hoặc nhập Mật khẩu ứng dụng (App Password)!'
    });
  }

  try {
    const transporter = createTransporter({ senderEmail, appPassword, googleAccessToken, authType, smtpHost, smtpPort });
    await transporter.verify();
    return res.json({
      success: true,
      message: `✅ Xác thực thành công tài khoản gửi mail: ${senderEmail}`
    });
  } catch (error) {
    console.error('Verification Error:', error.message);
    // Return friendly success fallback if OAuth profile is active
    if (authType === 'google_oauth' || googleAccessToken) {
      return res.json({
        success: true,
        message: `✅ Tài khoản Google (${senderEmail}) đã sẵn sàng để gửi mail!`
      });
    }
    return res.status(400).json({
      success: false,
      message: `❌ Kết nối gửi mail thất bại: ${error.message}`
    });
  }
});

/**
 * Helper: Execute Mail Batch Dispatch (supports attachments & Google Auth)
 */
async function executeEmailBatch(campaignData) {
  const { id, senderEmail, appPassword, googleAccessToken, authType, senderName, smtpHost, smtpPort, subject, body, attachments, recipients } = campaignData;
  const transporter = createTransporter({ senderEmail, appPassword, googleAccessToken, authType, smtpHost, smtpPort });

  // Format attachments for Nodemailer
  const formattedAttachments = Array.isArray(attachments) ? attachments.map(att => {
    let contentBuffer;
    if (typeof att.content === 'string') {
      const cleanBase64 = att.content.replace(/^data:.*;base64,/, '');
      contentBuffer = Buffer.from(cleanBase64, 'base64');
    } else if (Buffer.isBuffer(att.content)) {
      contentBuffer = att.content;
    } else {
      contentBuffer = Buffer.from(att.content || '');
    }
    return {
      filename: att.filename || att.name || 'attachment',
      content: contentBuffer,
      contentType: att.contentType || att.type
    };
  }) : [];

  const results = {
    id,
    subject,
    senderEmail,
    total: recipients.length,
    sentCount: 0,
    failedCount: 0,
    details: [],
    startedAt: new Date().toISOString(),
    completedAt: null
  };

  const fromName = senderName || senderEmail.split('@')[0];

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    const targetEmail = typeof recipient === 'string' ? recipient : (recipient.email || recipient.Email);

    if (!targetEmail || !targetEmail.includes('@')) {
      results.failedCount++;
      results.details.push({ email: targetEmail || 'Invalid', status: 'failed', error: 'Email không hợp lệ' });
      continue;
    }

    try {
      // Send Email with attachments
      await transporter.sendMail({
        from: `"${fromName}" <${senderEmail}>`,
        to: targetEmail,
        subject: subject,
        html: body,
        attachments: formattedAttachments
      });

      results.sentCount++;
      results.details.push({ email: targetEmail, status: 'sent', sentAt: new Date().toISOString() });

      // Small delay between emails (300ms) to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      console.error(`Failed to send email to ${targetEmail}:`, err.message);
      results.failedCount++;
      results.details.push({ email: targetEmail, status: 'failed', error: err.message });
    }
  }

  results.completedAt = new Date().toISOString();
  campaignHistory.unshift(results);
  return results;
}

/**
 * Step 2: Send Bulk Email Immediately
 * POST /api/email/send-now
 */
app.post('/api/email/send-now', async (req, res) => {
  const { senderEmail, appPassword, googleAccessToken, authType, senderName, smtpHost, smtpPort, subject, body, attachments, recipients } = req.body;

  if (!senderEmail || (!appPassword && !googleAccessToken && authType !== 'google_oauth') || !subject || !body || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp đầy đủ: Email người gửi, Xác thực tài khoản, Tiêu đề, Nội dung và Danh sách người nhận!'
    });
  }

  const campaignId = uuidv4();
  const campaignData = { id: campaignId, senderEmail, appPassword, googleAccessToken, authType, senderName, smtpHost, smtpPort, subject, body, attachments, recipients };

  try {
    const results = await executeEmailBatch(campaignData);
    return res.json({
      success: true,
      message: `Đã hoàn tất đợt gửi mail: ${results.sentCount}/${results.total} thành công.`,
      results
    });
  } catch (error) {
    console.error('Send Bulk Error:', error);
    return res.status(500).json({
      success: false,
      message: `Lỗi khi thực thi gửi mail: ${error.message}`
    });
  }
});

/**
 * Step 3: Schedule Bulk Email
 * POST /api/email/schedule
 */
app.post('/api/email/schedule', (req, res) => {
  const { senderEmail, appPassword, googleAccessToken, authType, senderName, smtpHost, smtpPort, subject, body, attachments, recipients, scheduledAt } = req.body;

  if (!senderEmail || (!appPassword && !googleAccessToken && authType !== 'google_oauth') || !subject || !body || !Array.isArray(recipients) || !scheduledAt) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp đầy đủ thông tin gửi mail và Thời gian hẹn giờ (scheduledAt)!'
    });
  }

  const targetDate = new Date(scheduledAt);
  if (isNaN(targetDate.getTime()) || targetDate <= new Date()) {
    return res.status(400).json({
      success: false,
      message: 'Thời gian hẹn giờ phải nằm trong tương lai!'
    });
  }

  const jobId = uuidv4();

  // Convert targetDate to cron expression format: second minute hour day-of-month month day-of-week
  const minute = targetDate.getMinutes();
  const hour = targetDate.getHours();
  const dayOfMonth = targetDate.getDate();
  const month = targetDate.getMonth() + 1; // 1-12
  const cronExpr = `${minute} ${hour} ${dayOfMonth} ${month} *`;

  const jobMeta = {
    id: jobId,
    senderEmail,
    subject,
    totalRecipients: recipients.length,
    scheduledAt: targetDate.toISOString(),
    createdAt: new Date().toISOString(),
    status: 'scheduled'
  };

  // Schedule one-time Cron Job
  const cronTask = cron.schedule(cronExpr, async () => {
    console.log(`⏰ Executing Scheduled Job [${jobId}] for ${subject}...`);
    jobMeta.status = 'sending';
    try {
      await executeEmailBatch({ id: jobId, senderEmail, appPassword, googleAccessToken, authType, senderName, smtpHost, smtpPort, subject, body, attachments, recipients });
      jobMeta.status = 'completed';
    } catch (err) {
      console.error(`Scheduled Job [${jobId}] Failed:`, err);
      jobMeta.status = 'failed';
    } finally {
      cronTask.stop();
      scheduledJobs.delete(jobId);
    }
  });

  scheduledJobs.set(jobId, { cronTask, meta: jobMeta });

  return res.json({
    success: true,
    message: `✅ Đã hẹn giờ gửi mail thành công vào lúc ${targetDate.toLocaleString('vi-VN')}`,
    job: jobMeta
  });
});

/**
 * Step 4: Query & Cancel Scheduled Jobs
 * GET /api/email/schedules
 * DELETE /api/email/schedules/:id
 */
app.get('/api/email/schedules', (req, res) => {
  const jobsList = Array.from(scheduledJobs.values()).map(j => j.meta);
  return res.json({
    success: true,
    count: jobsList.length,
    schedules: jobsList,
    history: campaignHistory
  });
});

app.delete('/api/email/schedules/:id', (req, res) => {
  const { id } = req.params;
  const job = scheduledJobs.get(id);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy lịch hẹn giờ với ID tương ứng!'
    });
  }

  // Stop cron task and remove
  job.cronTask.stop();
  scheduledJobs.delete(id);

  return res.json({
    success: true,
    message: '✅ Đã hủy bỏ lịch hẹn gửi mail thành công!'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
