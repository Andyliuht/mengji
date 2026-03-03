import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

router.get('/shared', (req, res) => {
  const list = db.prepare(
    `SELECT sd.*, d.content, d.emotion, d.sleepQuality,
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
  const id = generateId();
  db.prepare(
    'INSERT INTO comments (id, sharedDreamId, userId, content) VALUES (?, ?, ?, ?)'
  ).run(id, req.params.sharedId, req.userId, content.trim());
  db.prepare('UPDATE shared_dreams SET commentCount = commentCount + 1 WHERE id = ?').run(req.params.sharedId);
  const comment = db.prepare('SELECT c.*, u.nickname FROM comments c JOIN users u ON c.userId = u.id WHERE c.id = ?').get(id);
  res.status(201).json(comment);
});

router.get('/:sharedId/comments', (req, res) => {
  const comments = db.prepare(
    'SELECT c.*, u.nickname FROM comments c JOIN users u ON c.userId = u.id WHERE c.sharedDreamId = ? ORDER BY c.createdAt DESC'
  ).all(req.params.sharedId);
  res.json(comments);
});

router.post('/:sharedId/like', authMiddleware, (req, res) => {
  try {
    const id = generateId();
    db.prepare('INSERT INTO likes (id, sharedDreamId, userId) VALUES (?, ?, ?)').run(id, req.params.sharedId, req.userId);
    db.prepare('UPDATE shared_dreams SET likeCount = likeCount + 1 WHERE id = ?').run(req.params.sharedId);
    res.json({ message: '点赞成功' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(400).json({ message: '已点赞' });
    }
    throw e;
  }
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
