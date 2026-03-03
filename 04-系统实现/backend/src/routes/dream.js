import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

router.use(authMiddleware);

router.get('/', (req, res) => {
  const dreams = db.prepare(
    `SELECT d.*, GROUP_CONCAT(t.name) as tags FROM dreams d
     LEFT JOIN dream_tags dt ON d.id = dt.dreamId
     LEFT JOIN tags t ON dt.tagId = t.id
     WHERE d.userId = ? GROUP BY d.id ORDER BY d.createdAt DESC`
  ).all(req.userId);
  res.json(dreams);
});

router.post('/', (req, res) => {
  const { content, contentType, emotion, sleepQuality, tagIds } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ message: '梦境内容不能为空' });
  }
  const id = generateId();
  db.prepare(
    'INSERT INTO dreams (id, userId, content, contentType, emotion, sleepQuality) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, req.userId, content.trim(), contentType || 'text', emotion || null, sleepQuality ?? null);

  if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
    const insertTag = db.prepare('INSERT INTO dream_tags (dreamId, tagId) VALUES (?, ?)');
    tagIds.forEach(tagId => insertTag.run(id, tagId));
  }

  const dream = db.prepare('SELECT * FROM dreams WHERE id = ?').get(id);
  res.status(201).json(dream);
});

router.get('/:id', (req, res) => {
  const dream = db.prepare(
    `SELECT d.*, GROUP_CONCAT(t.name) as tags FROM dreams d
     LEFT JOIN dream_tags dt ON d.id = dt.dreamId
     LEFT JOIN tags t ON dt.tagId = t.id
     WHERE d.id = ? AND d.userId = ? GROUP BY d.id`
  ).get(req.params.id, req.userId);
  if (!dream) return res.status(404).json({ message: '梦境不存在' });
  res.json(dream);
});

router.put('/:id', (req, res) => {
  const { content, emotion, sleepQuality, tagIds } = req.body;
  const dream = db.prepare('SELECT * FROM dreams WHERE id = ? AND userId = ?').get(req.params.id, req.userId);
  if (!dream) return res.status(404).json({ message: '梦境不存在' });
  if (dream.isShared) return res.status(400).json({ message: '已分享的梦境不能编辑' });

  if (content !== undefined) db.prepare('UPDATE dreams SET content = ? WHERE id = ?').run(content.trim(), req.params.id);
  if (emotion !== undefined) db.prepare('UPDATE dreams SET emotion = ? WHERE id = ?').run(emotion, req.params.id);
  if (sleepQuality !== undefined) db.prepare('UPDATE dreams SET sleepQuality = ? WHERE id = ?').run(sleepQuality, req.params.id);

  if (tagIds !== undefined) {
    db.prepare('DELETE FROM dream_tags WHERE dreamId = ?').run(req.params.id);
    if (Array.isArray(tagIds) && tagIds.length > 0) {
      const insertTag = db.prepare('INSERT INTO dream_tags (dreamId, tagId) VALUES (?, ?)');
      tagIds.forEach(tagId => insertTag.run(req.params.id, tagId));
    }
  }

  const updated = db.prepare('SELECT * FROM dreams WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const dream = db.prepare('SELECT * FROM dreams WHERE id = ? AND userId = ?').get(req.params.id, req.userId);
  if (!dream) return res.status(404).json({ message: '梦境不存在' });
  db.prepare('DELETE FROM dream_tags WHERE dreamId = ?').run(req.params.id);
  db.prepare('DELETE FROM dream_interpretations WHERE dreamId = ?').run(req.params.id);
  db.prepare('DELETE FROM shared_dreams WHERE dreamId = ?').run(req.params.id);
  db.prepare('DELETE FROM dreams WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

export default router;
