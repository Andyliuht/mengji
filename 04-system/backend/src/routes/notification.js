import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';

const router = Router();

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

// 获取当前用户的通知列表（含 dreamId 便于跳转至梦境详情）
router.get('/', authMiddleware, (req, res) => {
  const list = db.prepare(
    `SELECT n.*,
       CASE
         WHEN n.relatedType = 'shared_dream' THEN (SELECT dreamId FROM shared_dreams WHERE id = n.relatedId)
         WHEN n.relatedType = 'comment' THEN (SELECT sd.dreamId FROM comments c JOIN shared_dreams sd ON c.sharedDreamId = sd.id WHERE c.id = n.relatedId)
         WHEN n.relatedType = 'report' THEN (SELECT sd.dreamId FROM reports r JOIN shared_dreams sd ON r.sharedDreamId = sd.id WHERE r.id = n.relatedId)
         ELSE NULL
       END as dreamId
     FROM notifications n WHERE n.userId = ? ORDER BY n.createdAt DESC LIMIT 50`
  ).all(req.userId);
  res.json(list);
});

// 获取未读数量
router.get('/unread-count', authMiddleware, (req, res) => {
  const row = db.prepare(
    'SELECT COUNT(*) as c FROM notifications WHERE userId = ? AND isRead = 0'
  ).get(req.userId);
  res.json({ count: row.c });
});

// 全部标记已读（需在 /:id 之前）
router.patch('/read-all', authMiddleware, (req, res) => {
  db.prepare('UPDATE notifications SET isRead = 1 WHERE userId = ?').run(req.userId);
  res.json({ message: '已全部标记为已读' });
});

// 删除全部通知（需在 /:id 之前）
router.delete('/all', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM notifications WHERE userId = ?').run(req.userId);
  res.json({ message: '已清空全部通知' });
});

// 管理员：官方广播通知（发送给所有用户）
router.post('/broadcast', authMiddleware, adminMiddleware, (req, res) => {
  const { title, content } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ message: '标题不能为空' });
  const users = db.prepare('SELECT id FROM users WHERE status = ?').all('active');
  const insert = db.prepare(
    'INSERT INTO notifications (id, userId, type, title, content, relatedId, relatedType) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertMany = db.transaction((userList) => {
    for (const u of userList) {
      insert.run(generateId(), u.id, 'official', title.trim(), (content || '').trim(), null, null);
    }
  });
  insertMany(users);
  res.status(201).json({ message: `已向 ${users.length} 位用户发送通知` });
});

// 标记单条已读
router.patch('/:id/read', authMiddleware, (req, res) => {
  const n = db.prepare('SELECT id FROM notifications WHERE id = ? AND userId = ?').get(req.params.id, req.userId);
  if (!n) return res.status(404).json({ message: '通知不存在' });
  db.prepare('UPDATE notifications SET isRead = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: '已标记为已读' });
});

// 删除单条通知
router.delete('/:id', authMiddleware, (req, res) => {
  const n = db.prepare('SELECT id FROM notifications WHERE id = ? AND userId = ?').get(req.params.id, req.userId);
  if (!n) return res.status(404).json({ message: '通知不存在' });
  db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
  res.json({ message: '已删除' });
});

export default router;
