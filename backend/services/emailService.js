const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendDueDateReminder = async (user, task, daysUntilDue) => {
  try {
    const transporter = createTransporter();

    const subject = daysUntilDue === 0
      ? `⏰ Task Due Today: ${task.title}`
      : daysUntilDue < 0
      ? `🚨 Overdue Task: ${task.title}`
      : `📅 Task Due in ${daysUntilDue} days: ${task.title}`;

    const statusBadge = {
      'todo': '📋 To Do',
      'in-progress': '🔄 In Progress',
      'done': '✅ Done'
    };

    const priorityColor = {
      'low': '#10B981',
      'medium': '#F59E0B',
      'high': '#EF4444'
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 30px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .task-card {
            background-color: #f9fafb;
            border-left: 4px solid ${priorityColor[task.priority]};
            padding: 20px;
            border-radius: 4px;
            margin: 20px 0;
          }
          .task-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #1f2937;
          }
          .task-details {
            margin: 15px 0;
          }
          .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 8px;
          }
          .priority-${task.priority} {
            background-color: ${priorityColor[task.priority]}20;
            color: ${priorityColor[task.priority]};
          }
          .status-badge {
            background-color: #e5e7eb;
            color: #4b5563;
          }
          .due-date {
            font-size: 18px;
            font-weight: 600;
            color: ${daysUntilDue <= 0 ? '#EF4444' : '#F59E0B'};
            margin: 15px 0;
          }
          .description {
            color: #6b7280;
            margin: 15px 0;
          }
          .btn {
            display: inline-block;
            background-color: #3B82F6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 20px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #9ca3af;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Task Management Reminder</h1>
          </div>
          
          <div class="task-card">
            <div class="task-title">${task.title}</div>
            
            <div class="task-details">
              <span class="badge priority-${task.priority}">${task.priority.toUpperCase()} Priority</span>
              <span class="badge status-badge">${statusBadge[task.status]}</span>
            </div>
            
            <div class="due-date">
              ${daysUntilDue === 0
                ? '⏰ Due Today!'
                : daysUntilDue < 0
                ? `🚨 Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? 's' : ''}!`
                : `📅 Due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`
              }
            </div>
            
            ${task.description ? `<div class="description">${task.description}</div>` : ''}
            
            ${task.subtasks && task.subtasks.length > 0 ? `
              <div style="margin-top: 15px;">
                <strong>Subtasks:</strong> ${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length} completed
              </div>
            ` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="btn">
              View Task
            </a>
          </div>
          
          <div class="footer">
            <p>You're receiving this email because you have notifications enabled for your tasks.</p>
            <p style="margin-top: 10px;">📧 Task Management App</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Task Manager" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: user.email,
      subject: subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

const sendTaskCompletionEmail = async (user, task) => {
  try {
    const transporter = createTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            text-align: center;
            padding: 40px;
          }
          .celebration {
            font-size: 64px;
            margin: 20px 0;
          }
          .message {
            font-size: 24px;
            color: #10B981;
            font-weight: bold;
            margin: 20px 0;
          }
          .task-title {
            font-size: 20px;
            color: #4b5563;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="celebration">🎉</div>
        <div class="message">Congratulations!</div>
        <div class="task-title">You completed: "${task.title}"</div>
        <p style="color: #9ca3af; margin-top: 30px;">Keep up the great work! 💪</p>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Task Manager" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: user.email,
      subject: `🎉 Task Completed: ${task.title}`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Completion email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending completion email:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Workspace invite email
// ─────────────────────────────────────────────────────────────────────────────
const sendWorkspaceInvite = async (inviter, recipientEmail, workspace, token) => {
  try {
    const transporter = createTransporter();

    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invite?token=${token}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 30px;
          }
          .header {
            text-align: center;
            margin-bottom: 24px;
          }
          .avatar {
            width: 56px;
            height: 56px;
            background-color: #2563eb;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin-bottom: 16px;
          }
          .workspace-card {
            background-color: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
          }
          .workspace-name {
            font-size: 22px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 8px;
          }
          .workspace-desc {
            color: #6b7280;
            font-size: 14px;
          }
          .inviter-info {
            background-color: #f9fafb;
            border-radius: 6px;
            padding: 12px 16px;
            margin: 16px 0;
            font-size: 14px;
            color: #4b5563;
          }
          .btn {
            display: block;
            background-color: #2563eb;
            color: white !important;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            text-align: center;
            margin: 24px 0;
          }
          .btn:hover {
            background-color: #1d4ed8;
          }
          .expiry-note {
            background-color: #fef3c7;
            border: 1px solid #fcd34d;
            border-radius: 6px;
            padding: 10px 14px;
            font-size: 13px;
            color: #92400e;
            margin: 16px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #9ca3af;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
          }
          .copy-link {
            font-size: 11px;
            color: #9ca3af;
            word-break: break-all;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 48px; margin-bottom: 8px;">🤝</div>
            <h1 style="margin: 0; color: #1f2937;">You're invited!</h1>
          </div>

          <p>
            <strong>${inviter.name}</strong> has invited you to collaborate on their workspace.
          </p>

          <div class="inviter-info">
            👤 Invited by <strong>${inviter.name}</strong> &nbsp;·&nbsp; ${inviter.email}
          </div>

          <div class="workspace-card">
            <div style="font-size: 32px; margin-bottom: 8px;">🏢</div>
            <div class="workspace-name">${workspace.name}</div>
            ${workspace.description ? `<div class="workspace-desc">${workspace.description}</div>` : ''}
          </div>

          <a href="${inviteUrl}" class="btn">
            ✅ Accept Invitation
          </a>

          <div class="expiry-note">
            ⏳ This invitation expires in <strong>7 days</strong>. 
            If you don't have an account yet, 
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/register" style="color: #92400e;">register first</a>, 
            then click the button above.
          </div>

          <div class="footer">
            <p>If you weren't expecting this invite, you can safely ignore this email.</p>
            <p>Or copy this link manually:</p>
            <div class="copy-link">${inviteUrl}</div>
            <p style="margin-top: 16px;">📧 Task Management App</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Task Manager" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject: `${inviter.name} invited you to join "${workspace.name}" on Task Manager`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Workspace invite email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending workspace invite email:', error);
    throw error;
  }
};

module.exports = {
  sendDueDateReminder,
  sendTaskCompletionEmail,
  sendWorkspaceInvite,   // ← added
};