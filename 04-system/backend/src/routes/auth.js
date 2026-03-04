import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db.js';
import { generateToken } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../services/email.js';

const router = Router();

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', (req, res) => {
  try {
    const { username, password, nickname, email } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }
    if (email && !emailRegex.test(email)) {
      return res.status(400).json({ message: '邮箱格式不正确' });
    }
    // 邮箱唯一性：每个邮箱只能绑定一个账号
    if (email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim());
      if (existing) {
        return res.status(400).json({ message: '该邮箱已被其他账号绑定' });
      }
    }
    const hashed = bcrypt.hashSync(password, 10);
    const id = generateId();
    db.prepare(
      'INSERT INTO users (id, username, password, email, nickname) VALUES (?, ?, ?, ?, ?)'
    ).run(id, username, hashed, email ? email.trim() : null, nickname || username);
    const token = generateToken(id);
    res.json({ token, userId: id, username, nickname: nickname || username });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ message: '用户名已存在' });
    }
    res.status(500).json({ message: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email, username } = req.body;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: '请输入有效的邮箱地址' });
    }
    if (!username || !username.trim()) {
      return res.status(400).json({ message: '请输入用户名' });
    }
    // 校验邮箱和用户名必须属于同一用户
    const user = db.prepare(
      'SELECT id FROM users WHERE email = ? AND username = ?'
    ).get(email.trim(), username.trim());
    // 无论是否匹配，都返回相同提示，防止枚举用户
    if (!user) {
      return res.json({ message: '如果邮箱与用户名匹配，您将收到重置链接' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const id = generateId();
    db.prepare(
      'INSERT INTO password_reset_tokens (id, userId, token, expiresAt) VALUES (?, ?, ?, ?)'
    ).run(id, user.id, token, expiresAt);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    // 异步发送邮件，避免海外服务器连接 QQ SMTP 超时导致前端 timeout
    sendPasswordResetEmail(email.trim(), resetLink).catch(e => console.error('发送邮件失败:', e.message));
    res.json({ message: '如果邮箱与用户名匹配，您将收到重置链接' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/reset-password', (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: '缺少 token 或新密码' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: '密码至少 6 位' });
    }
    const row = db.prepare(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND expiresAt > datetime("now")'
    ).get(token);
    if (!row) {
      return res.status(400).json({ message: '链接已过期或无效，请重新申请' });
    }
    const hashed = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, row.userId);
    db.prepare('DELETE FROM password_reset_tokens WHERE id = ?').run(row.id);
    res.json({ message: '密码已重置，请使用新密码登录' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/delete-account', (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !usernameOrEmail.trim()) {
      return res.status(400).json({ message: '请输入用户名或邮箱' });
    }
    if (!password) {
      return res.status(400).json({ message: '请输入密码' });
    }
    const user = db.prepare(
      'SELECT * FROM users WHERE username = ? OR email = ?'
    ).get(usernameOrEmail.trim(), usernameOrEmail.trim());
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: '用户名/邮箱或密码错误' });
    }
    const userId = user.id;
    const dreams = db.prepare('SELECT id FROM dreams WHERE userId = ?').all(userId);
    for (const d of dreams) {
      const shared = db.prepare('SELECT id FROM shared_dreams WHERE dreamId = ?').all(d.id);
      for (const s of shared) {
        const commentIds = db.prepare('SELECT id FROM comments WHERE sharedDreamId = ?').all(s.id).map(c => c.id);
        db.prepare("DELETE FROM notifications WHERE relatedType = 'shared_dream' AND relatedId = ?").run(s.id);
        for (const cid of commentIds) {
          db.prepare("DELETE FROM notifications WHERE relatedType = 'comment' AND relatedId = ?").run(cid);
          db.prepare('DELETE FROM comment_likes WHERE commentId = ?').run(cid);
        }
        db.prepare('DELETE FROM comments WHERE sharedDreamId = ?').run(s.id);
        db.prepare('DELETE FROM likes WHERE sharedDreamId = ?').run(s.id);
        db.prepare('DELETE FROM dream_map_hidden WHERE sharedDreamId = ?').run(s.id);
        db.prepare('DELETE FROM reports WHERE sharedDreamId = ?').run(s.id);
        db.prepare('DELETE FROM shared_dreams WHERE id = ?').run(s.id);
      }
      db.prepare('DELETE FROM dream_tags WHERE dreamId = ?').run(d.id);
      db.prepare('DELETE FROM dream_interpretations WHERE dreamId = ?').run(d.id);
      db.prepare('DELETE FROM dreams WHERE id = ?').run(d.id);
    }
    db.prepare('DELETE FROM comments WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM comment_likes WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM likes WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM favorites WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM reminders WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM notifications WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM password_reset_tokens WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM reports WHERE reporterId = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ message: '账号已注销' });
  } catch (err) {
    res.status(500).json({ message: err.message || '注销失败' });
  }
});

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: '请输入用户名/邮箱和密码' });
    }
    // 支持用户名或邮箱登录
    const user = db.prepare(
      'SELECT * FROM users WHERE username = ? OR email = ?'
    ).get(username.trim(), username.trim());
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: '用户名/邮箱或密码错误' });
    }
    const token = generateToken(user.id);
    res.json({
      token,
      userId: user.id,
      username: user.username,
      nickname: user.nickname || user.username,
      role: user.role || 'user'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
