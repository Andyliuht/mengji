import nodemailer from 'nodemailer';

/**
 * QQ 邮箱 SMTP 配置
 * 需要在 .env 中设置：
 *   SMTP_HOST=smtp.qq.com
 *   SMTP_PORT=465
 *   SMTP_USER=你的QQ邮箱@qq.com
 *   SMTP_PASS=QQ邮箱授权码（16位，非QQ密码）
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.qq.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: true,
    auth: { user, pass }
  });
}

/**
 * 发送密码重置邮件
 * @param {string} to - 收件人邮箱
 * @param {string} resetLink - 重置密码链接
 * @returns {Promise<boolean>} 是否发送成功
 */
export async function sendPasswordResetEmail(to, resetLink) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('邮件服务未配置：请设置 SMTP_USER 和 SMTP_PASS');
    return false;
  }

  const appName = '梦迹';
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #6b5b95;">${appName} - 找回密码</h2>
      <p>您好，您正在申请重置密码。请点击下方链接完成重置（链接 1 小时内有效）：</p>
      <p><a href="${resetLink}" style="color: #8e7cc3; word-break: break-all;">${resetLink}</a></p>
      <p style="color: #999; font-size: 12px;">如非本人操作，请忽略此邮件。</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"${appName}" <${process.env.SMTP_USER}>`,
      to,
      subject: `【${appName}】找回密码`,
      html
    });
    return true;
  } catch (err) {
    console.error('发送邮件失败:', err.message);
    return false;
  }
}
