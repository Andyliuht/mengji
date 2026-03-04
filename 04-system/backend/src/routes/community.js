import { Router } from 'express';
import db from '../db.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';

const router = Router();

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

// 梦境地图：24 小时内已分享且有经纬度的梦境，仅显示发布时间最久远的 10 条，排除已查看过的
router.get('/dream-map', (req, res) => {
  const list = db.prepare(
    `SELECT sd.id as sharedId, sd.isAnonymous, sd.userId, sd.dreamId, d.content, d.emotion, d.location, d.latitude, d.longitude, d.createdAt,
            u.nickname as authorName
     FROM shared_dreams sd
     JOIN dreams d ON sd.dreamId = d.id
     JOIN users u ON sd.userId = u.id
     LEFT JOIN dream_map_hidden h ON sd.id = h.sharedDreamId
     WHERE d.latitude IS NOT NULL AND d.longitude IS NOT NULL
       AND d.createdAt >= datetime('now', '-24 hours')
       AND h.sharedDreamId IS NULL
     ORDER BY d.createdAt ASC
     LIMIT 10`
  ).all();
  const result = list.map(item => ({
    ...item,
    authorName: item.isAnonymous ? '匿名用户' : item.authorName
  }));
  res.json(result);
});

// 梦境地图：标记某条分享为已查看（从所有用户的地图上移除）
router.post('/dream-map/:sharedId/viewed', authMiddleware, (req, res) => {
  const { sharedId } = req.params;
  const shared = db.prepare('SELECT id FROM shared_dreams WHERE id = ?').get(sharedId);
  if (!shared) return res.status(404).json({ message: '分享不存在' });
  try {
    db.prepare('INSERT OR IGNORE INTO dream_map_hidden (sharedDreamId) VALUES (?)').run(sharedId);
    res.json({ message: '已标记' });
  } catch (e) {
    res.status(500).json({ message: e.message || '操作失败' });
  }
});

router.get('/shared', (req, res) => {
  const list = db.prepare(
    `SELECT sd.*, d.content, d.emotion, d.coverImage,
            u.nickname as authorName, u.avatar as authorAvatar,
            (SELECT GROUP_CONCAT(t.name) FROM dream_tags dt JOIN tags t ON dt.tagId = t.id WHERE dt.dreamId = d.id) as tags
     FROM shared_dreams sd
     JOIN dreams d ON sd.dreamId = d.id
     JOIN users u ON sd.userId = u.id
     ORDER BY sd.createdAt DESC LIMIT 50`
  ).all();

  const result = list.map(item => ({
    ...item,
    authorName: item.isAnonymous ? '匿名用户' : item.authorName,
    authorAvatar: item.isAnonymous ? null : item.authorAvatar
  }));
  res.json(result);
});

router.post('/share/:dreamId', authMiddleware, (req, res) => {
  const dream = db.prepare('SELECT * FROM dreams WHERE id = ? AND userId = ?').get(req.params.dreamId, req.userId);
  if (!dream) return res.status(404).json({ message: '梦境不存在' });
  if (dream.isShared) return res.status(400).json({ message: '已分享过' });

  const { isAnonymous = true } = req.body;
  const id = generateId();
  db.prepare(
    'INSERT INTO shared_dreams (id, dreamId, userId, isAnonymous) VALUES (?, ?, ?, ?)'
  ).run(id, req.params.dreamId, req.userId, isAnonymous ? 1 : 0);
  db.prepare('UPDATE dreams SET isShared = 1, shareType = ? WHERE id = ?').run(isAnonymous ? 'anonymous' : 'public', req.params.dreamId);

  const shared = db.prepare('SELECT * FROM shared_dreams WHERE id = ?').get(id);
  res.status(201).json(shared);
});

router.post('/:sharedId/comment', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ message: '评论内容不能为空' });
  const shared = db.prepare('SELECT userId FROM shared_dreams WHERE id = ?').get(req.params.sharedId);
  if (!shared) return res.status(404).json({ message: '分享不存在' });
  const id = generateId();
  db.prepare(
    'INSERT INTO comments (id, sharedDreamId, userId, content) VALUES (?, ?, ?, ?)'
  ).run(id, req.params.sharedId, req.userId, content.trim());
  db.prepare('UPDATE shared_dreams SET commentCount = commentCount + 1 WHERE id = ?').run(req.params.sharedId);
  const comment = db.prepare('SELECT c.*, u.nickname FROM comments c JOIN users u ON c.userId = u.id WHERE c.id = ?').get(id);
  // 评论通知：若评论者不是梦境作者，则给作者发站内消息
  if (shared.userId !== req.userId) {
    const notifId = 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    const preview = content.trim().slice(0, 50) + (content.trim().length > 50 ? '...' : '');
    const title = '有人评论了你的梦境';
    const notifContent = `${comment.nickname || '某用户'} 评论：${preview}`;
    db.prepare(
      'INSERT INTO notifications (id, userId, type, title, content, relatedId, relatedType) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(notifId, shared.userId, 'comment', title, notifContent, req.params.sharedId, 'shared_dream');
  }
  res.status(201).json(comment);
});

router.get('/:sharedId/comments', optionalAuthMiddleware, (req, res) => {
  const comments = db.prepare(
    'SELECT c.*, u.nickname FROM comments c JOIN users u ON c.userId = u.id WHERE c.sharedDreamId = ? ORDER BY c.createdAt DESC'
  ).all(req.params.sharedId);
  const userId = req.userId || null;
  const likedSet = userId
    ? new Set(db.prepare('SELECT commentId FROM comment_likes WHERE userId = ?').all(userId).map(r => r.commentId))
    : new Set();
  const result = comments.map(c => ({
    ...c,
    likeCount: c.likeCount ?? 0,
    liked: likedSet.has(c.id)
  }));
  res.json(result);
});

router.post('/:sharedId/like', authMiddleware, (req, res) => {
  const shared = db.prepare('SELECT userId FROM shared_dreams WHERE id = ?').get(req.params.sharedId);
  if (!shared) return res.status(404).json({ message: '分享不存在' });
  try {
    const id = generateId();
    db.prepare('INSERT INTO likes (id, sharedDreamId, userId) VALUES (?, ?, ?)').run(id, req.params.sharedId, req.userId);
    db.prepare('UPDATE shared_dreams SET likeCount = likeCount + 1 WHERE id = ?').run(req.params.sharedId);
    // 点赞通知：若点赞者不是梦境作者，则给作者发站内消息
    if (shared.userId !== req.userId) {
      const liker = db.prepare('SELECT nickname FROM users WHERE id = ?').get(req.userId);
      const notifId = generateId();
      const title = '有人点赞了你的梦境';
      const notifContent = `${liker?.nickname || '某用户'} 赞了你的梦境`;
      db.prepare(
        'INSERT INTO notifications (id, userId, type, title, content, relatedId, relatedType) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(notifId, shared.userId, 'like', title, notifContent, req.params.sharedId, 'shared_dream');
    }
    res.json({ message: '点赞成功' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(400).json({ message: '您已经点赞过该梦境了，每个梦境只能点赞一次' });
    }
    throw e;
  }
});

router.post('/comments/:commentId/like', authMiddleware, (req, res) => {
  const comment = db.prepare('SELECT id, userId FROM comments WHERE id = ?').get(req.params.commentId);
  if (!comment) return res.status(404).json({ message: '评论不存在' });
  try {
    const id = generateId();
    db.prepare('INSERT INTO comment_likes (id, commentId, userId) VALUES (?, ?, ?)').run(id, req.params.commentId, req.userId);
    db.prepare('UPDATE comments SET likeCount = COALESCE(likeCount, 0) + 1 WHERE id = ?').run(req.params.commentId);
    if (comment.userId !== req.userId) {
      const liker = db.prepare('SELECT nickname FROM users WHERE id = ?').get(req.userId);
      const notifId = generateId();
      const title = '有人点赞了你的评论';
      const notifContent = `${liker?.nickname || '某用户'} 赞了你的评论`;
      db.prepare(
        'INSERT INTO notifications (id, userId, type, title, content, relatedId, relatedType) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(notifId, comment.userId, 'comment_like', title, notifContent, req.params.commentId, 'comment');
    }
    res.json({ message: '点赞成功' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(400).json({ message: '您已经点赞过该评论了' });
    }
    throw e;
  }
});

router.delete('/comments/:commentId/like', authMiddleware, (req, res) => {
  const like = db.prepare('SELECT id FROM comment_likes WHERE commentId = ? AND userId = ?').get(req.params.commentId, req.userId);
  if (like) {
    db.prepare('DELETE FROM comment_likes WHERE id = ?').run(like.id);
    db.prepare('UPDATE comments SET likeCount = MAX(0, COALESCE(likeCount, 0) - 1) WHERE id = ?').run(req.params.commentId);
  }
  res.json({ message: '取消点赞' });
});

router.delete('/:sharedId/like', authMiddleware, (req, res) => {
  try {
    const like = db.prepare('SELECT id FROM likes WHERE sharedDreamId = ? AND userId = ?').get(req.params.sharedId, req.userId);
    if (like) {
      db.prepare('DELETE FROM likes WHERE id = ?').run(like.id);
      db.prepare('UPDATE shared_dreams SET likeCount = likeCount - 1 WHERE id = ?').run(req.params.sharedId);
    }
    res.json({ message: '取消点赞' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/favorite', authMiddleware, (req, res) => {
  const { targetType, targetId } = req.body;
  if (!targetType || !targetId) return res.status(400).json({ message: '参数错误' });
  const id = generateId();
  db.prepare(
    'INSERT INTO favorites (id, userId, targetType, targetId) VALUES (?, ?, ?, ?)'
  ).run(id, req.userId, targetType, targetId);
  res.status(201).json({ message: '收藏成功' });
});

export default router;
