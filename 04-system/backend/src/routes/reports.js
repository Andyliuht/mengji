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

// 管理员：暂不处理举报（仅标记为已处理，不采取任何措施）
router.post('/:reportId/dismiss', authMiddleware, adminMiddleware, (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ? AND status = ?').get(req.params.reportId, 'pending');
  if (!report) return res.status(404).json({ message: '举报不存在或已处理' });
  db.prepare('UPDATE reports SET status = ? WHERE id = ?').run('resolved_dismissed', report.id);
  res.json({ message: '已暂不处理' });
});

// 管理员：禁言被举报用户（支持 1/7/30 天），同时隐藏该梦境，所有人不可见
router.post('/:reportId/mute', authMiddleware, adminMiddleware, (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ? AND status = ?').get(req.params.reportId, 'pending');
  if (!report) return res.status(404).json({ message: '举报不存在或已处理' });
  const shared = db.prepare('SELECT userId FROM shared_dreams WHERE id = ?').get(report.sharedDreamId);
  if (!shared) return res.status(404).json({ message: '分享不存在' });
  const days = Number(req.body?.days) || 1;
  const validDays = [1, 7, 30].includes(days) ? days : 1;
  const muteUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET mutedUntil = ? WHERE id = ?').run(muteUntil, shared.userId);
  db.prepare('UPDATE shared_dreams SET isHidden = 1 WHERE id = ?').run(report.sharedDreamId);
  db.prepare('UPDATE reports SET status = ? WHERE id = ?').run('resolved_muted', report.id);
  const dayLabel = validDays === 1 ? '24 小时' : `${validDays} 天`;
  res.json({ message: `已禁言该用户 ${dayLabel}，该梦境已对所有人隐藏` });
});

export default router;
