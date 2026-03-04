import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';

const router = Router();

// 管理员：获取用户列表（注册时间、基本信息、活跃情况）
router.get('/users', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const list = db.prepare(
      `SELECT u.id, u.username, u.email, u.nickname, u.role, u.status, u.createdAt, u.mutedUntil,
         (SELECT COUNT(*) FROM dreams d WHERE d.userId = u.id) as dreamCount,
         (SELECT COUNT(*) FROM shared_dreams sd WHERE sd.userId = u.id) as sharedCount,
         (SELECT COUNT(*) FROM comments c WHERE c.userId = u.id) as commentCount,
         (SELECT MAX(createdAt) FROM dreams WHERE userId = u.id) as lastDreamAt,
         (SELECT MAX(c.createdAt) FROM comments c WHERE c.userId = u.id) as lastCommentAt
       FROM users u
       ORDER BY u.createdAt DESC`
    ).all();

    const result = list.map(u => {
      const lastDream = u.lastDreamAt || null;
      const lastComment = u.lastCommentAt || null;
      const lastActivity = [lastDream, lastComment].filter(Boolean).sort().pop() || null;
      const isMuted = u.mutedUntil && u.mutedUntil > new Date().toISOString();
      return {
        id: u.id,
        username: u.username,
        email: u.email || '',
        nickname: u.nickname || u.username,
        role: u.role || 'user',
        status: u.status || 'active',
        createdAt: u.createdAt,
        mutedUntil: u.mutedUntil,
        isMuted,
        dreamCount: u.dreamCount || 0,
        sharedCount: u.sharedCount || 0,
        commentCount: u.commentCount || 0,
        lastDreamAt: lastDream,
        lastCommentAt: lastComment,
        lastActivityAt: lastActivity
      };
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message || '获取用户列表失败' });
  }
});

// 管理员：解除用户禁言
router.post('/users/:userId/unmute', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.prepare('SELECT id, mutedUntil FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ message: '用户不存在' });
    db.prepare('UPDATE users SET mutedUntil = NULL WHERE id = ?').run(userId);
    res.json({ message: '已解除禁言' });
  } catch (e) {
    res.status(500).json({ message: e.message || '操作失败' });
  }
});

export default router;
