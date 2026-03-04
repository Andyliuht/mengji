import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateDreamImage } from '../services/imageGenerator.js';

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
  const { content, contentType, emotion, tagIds, location, latitude, longitude } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ message: '梦境内容不能为空' });
  }
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId);
  if (user?.role !== 'admin') {
    const todayCount = db.prepare(
      "SELECT COUNT(*) as c FROM dreams WHERE userId = ? AND date(createdAt) = date('now')"
    ).get(req.userId);
    if (todayCount.c >= 1) {
      return res.status(403).json({ message: '每天最多只能发布一条梦境，请删除今日梦境后再发布' });
    }
  }
  const id = generateId();
  db.prepare(
    'INSERT INTO dreams (id, userId, content, contentType, emotion, location, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.userId, content.trim(), contentType || 'text', emotion || null, location || null, latitude ?? null, longitude ?? null);

  if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
    const insertTag = db.prepare('INSERT INTO dream_tags (dreamId, tagId) VALUES (?, ?)');
    tagIds.forEach(tagId => insertTag.run(id, tagId));
  }

  const dream = db.prepare('SELECT * FROM dreams WHERE id = ?').get(id);
  res.status(201).json(dream);
});

router.post('/batch-delete', (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请选择要删除的梦境' });
    }
    let deleted = 0;
    for (const id of ids) {
      const dream = db.prepare('SELECT id FROM dreams WHERE id = ? AND userId = ?').get(id, req.userId);
      if (dream) {
        const shared = db.prepare('SELECT id FROM shared_dreams WHERE dreamId = ?').all(id);
        for (const s of shared) {
          const commentIds = db.prepare('SELECT id FROM comments WHERE sharedDreamId = ?').all(s.id).map(c => c.id);
          db.prepare("DELETE FROM notifications WHERE relatedType = 'shared_dream' AND relatedId = ?").run(s.id);
          for (const cid of commentIds) {
            db.prepare("DELETE FROM notifications WHERE relatedType = 'comment' AND relatedId = ?").run(cid);
          }
          for (const cid of commentIds) {
            db.prepare('DELETE FROM comment_likes WHERE commentId = ?').run(cid);
          }
          db.prepare('DELETE FROM comments WHERE sharedDreamId = ?').run(s.id);
          db.prepare('DELETE FROM likes WHERE sharedDreamId = ?').run(s.id);
          db.prepare('DELETE FROM dream_map_hidden WHERE sharedDreamId = ?').run(s.id);
        }
        db.prepare('DELETE FROM dream_tags WHERE dreamId = ?').run(id);
        db.prepare('DELETE FROM dream_interpretations WHERE dreamId = ?').run(id);
        db.prepare('DELETE FROM shared_dreams WHERE dreamId = ?').run(id);
        db.prepare('DELETE FROM dreams WHERE id = ?').run(id);
        deleted++;
      }
    }
    res.json({ message: `已删除 ${deleted} 条梦境` });
  } catch (e) {
    console.error('批量删除失败:', e);
    res.status(500).json({ message: e.message || '删除失败' });
  }
});

router.post('/:id/generate-image', async (req, res) => {
  try {
    const dream = db.prepare(
      `SELECT d.id, d.content, d.emotion, d.coverImage,
              (SELECT GROUP_CONCAT(t.name) FROM dream_tags dt JOIN tags t ON dt.tagId = t.id WHERE dt.dreamId = d.id) as tags
       FROM dreams d WHERE d.id = ? AND d.userId = ?`
    ).get(req.params.id, req.userId);
    if (!dream) return res.status(404).json({ message: '梦境不存在' });
    const dataUrl = await generateDreamImage(dream);
    db.prepare('UPDATE dreams SET coverImage = ? WHERE id = ?').run(dataUrl, dream.id);
    const updated = db.prepare('SELECT id, coverImage FROM dreams WHERE id = ?').get(dream.id);
    res.json(updated);
  } catch (e) {
    console.error('文生图失败:', e);
    res.status(500).json({ message: e.message || '生成配图失败' });
  }
});

router.get('/:id', (req, res) => {
  const dream = db.prepare(
    `SELECT d.*, GROUP_CONCAT(t.name) as tags,
       MAX(sd.id) as sharedDreamId, MAX(sd.likeCount) as likeCount, MAX(sd.commentCount) as commentCount
     FROM dreams d
     LEFT JOIN dream_tags dt ON d.id = dt.dreamId
     LEFT JOIN tags t ON dt.tagId = t.id
     LEFT JOIN shared_dreams sd ON d.id = sd.dreamId
     WHERE d.id = ? AND d.userId = ? GROUP BY d.id`
  ).get(req.params.id, req.userId);
  if (!dream) return res.status(404).json({ message: '梦境不存在' });
  res.json(dream);
});

router.put('/:id', (req, res) => {
  const { content, emotion, tagIds, location, latitude, longitude } = req.body;
  const dream = db.prepare('SELECT * FROM dreams WHERE id = ? AND userId = ?').get(req.params.id, req.userId);
  if (!dream) return res.status(404).json({ message: '梦境不存在' });
  if (dream.isShared) return res.status(400).json({ message: '已分享的梦境不能编辑' });

  if (content !== undefined) db.prepare('UPDATE dreams SET content = ? WHERE id = ?').run(content.trim(), req.params.id);
  if (emotion !== undefined) db.prepare('UPDATE dreams SET emotion = ? WHERE id = ?').run(emotion, req.params.id);
  if (location !== undefined || latitude !== undefined || longitude !== undefined) {
    const dreamRow = db.prepare('SELECT location, latitude, longitude FROM dreams WHERE id = ?').get(req.params.id);
    const loc = location !== undefined ? location : dreamRow.location;
    const lat = latitude !== undefined ? latitude : dreamRow.latitude;
    const lng = longitude !== undefined ? longitude : dreamRow.longitude;
    db.prepare('UPDATE dreams SET location = ?, latitude = ?, longitude = ? WHERE id = ?').run(loc, lat, lng, req.params.id);
  }

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
  try {
    const dream = db.prepare('SELECT * FROM dreams WHERE id = ? AND userId = ?').get(req.params.id, req.userId);
    if (!dream) return res.status(404).json({ message: '梦境不存在' });
    const shared = db.prepare('SELECT id FROM shared_dreams WHERE dreamId = ?').all(req.params.id);
    for (const s of shared) {
      const commentIds = db.prepare('SELECT id FROM comments WHERE sharedDreamId = ?').all(s.id).map(c => c.id);
      db.prepare("DELETE FROM notifications WHERE relatedType = 'shared_dream' AND relatedId = ?").run(s.id);
      for (const cid of commentIds) {
        db.prepare("DELETE FROM notifications WHERE relatedType = 'comment' AND relatedId = ?").run(cid);
      }
      for (const cid of commentIds) {
        db.prepare('DELETE FROM comment_likes WHERE commentId = ?').run(cid);
      }
      db.prepare('DELETE FROM comments WHERE sharedDreamId = ?').run(s.id);
      db.prepare('DELETE FROM likes WHERE sharedDreamId = ?').run(s.id);
      db.prepare('DELETE FROM dream_map_hidden WHERE sharedDreamId = ?').run(s.id);
    }
    db.prepare('DELETE FROM dream_tags WHERE dreamId = ?').run(req.params.id);
    db.prepare('DELETE FROM dream_interpretations WHERE dreamId = ?').run(req.params.id);
    db.prepare('DELETE FROM shared_dreams WHERE dreamId = ?').run(req.params.id);
    db.prepare('DELETE FROM dreams WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (e) {
    console.error('删除梦境失败:', e);
    res.status(500).json({ message: e.message || '删除失败' });
  }
});

export default router;
