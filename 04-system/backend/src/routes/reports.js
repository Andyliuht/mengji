import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';

const router = Router();

// 管理员：获取待处理举报列表
router.get('/', authMiddleware, adminMiddleware, (req, res) => {
  const list = db.prepare(
    `SELECT r.*, sd.dreamId, d.content, d.emotion, u.nickname as authorName, u.id as authorId,
            rep.nickname as reporterName
     FROM reports r
     JOIN shared_dreams sd ON r.sharedDreamId = sd.id
     JOIN dreams d ON sd.dreamId = d.id
     JOIN users u ON sd.userId = u.id
     JOIN users rep ON r.reporterId = rep.id
     WHERE r.status = 'pending'
     ORDER BY r.createdAt DESC`
  ).all();
  res.json(list);
});

// 管理员：删除被举报的梦境
router.post('/:reportId/delete', authMiddleware, adminMiddleware, (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ? AND status = ?').get(req.params.reportId, 'pending');
  if (!report) return res.status(404).json({ message: '举报不存在或已处理' });
  const shared = db.prepare('SELECT dreamId, userId FROM shared_dreams WHERE id = ?').get(report.sharedDreamId);
  if (!shared) return res.status(404).json({ message: '分享不存在' });
  try {
    const id = shared.dreamId;
    const sharedRows = db.prepare('SELECT id FROM shared_dreams WHERE dreamId = ?').all(id);
    for (const s of sharedRows) {
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
    db.prepare('DELETE FROM dream_tags WHERE dreamId = ?').run(id);
    db.prepare('DELETE FROM dream_interpretations WHERE dreamId = ?').run(id);
    db.prepare('DELETE FROM dreams WHERE id = ?').run(id);
    db.prepare('UPDATE reports SET status = ? WHERE id = ?').run('resolved_deleted', report.id);
    res.json({ message: '已删除该梦境' });
  } catch (e) {
    res.status(500).json({ message: e.message || '操作失败' });
  }
});

// 管理员：禁言被举报用户一天
router.post('/:reportId/mute', authMiddleware, adminMiddleware, (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ? AND status = ?').get(req.params.reportId, 'pending');
  if (!report) return res.status(404).json({ message: '举报不存在或已处理' });
  const shared = db.prepare('SELECT userId FROM shared_dreams WHERE id = ?').get(report.sharedDreamId);
  if (!shared) return res.status(404).json({ message: '分享不存在' });
  const muteUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET mutedUntil = ? WHERE id = ?').run(muteUntil, shared.userId);
  db.prepare('UPDATE reports SET status = ? WHERE id = ?').run('resolved_muted', report.id);
  res.json({ message: '已禁言该用户 24 小时' });
});

export default router;
