import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { interpretDream } from '../services/dreamInterpreter.js';

const router = Router();

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

router.use(authMiddleware);

router.post('/:dreamId', async (req, res) => {
  try {
    const dream = db.prepare('SELECT * FROM dreams WHERE id = ? AND userId = ?').get(req.params.dreamId, req.userId);
    if (!dream) return res.status(404).json({ message: '梦境不存在' });

    let interp = db.prepare('SELECT * FROM dream_interpretations WHERE dreamId = ?').get(req.params.dreamId);
    if (interp) {
      return res.json(interp);
    }

    const content = await interpretDream(dream.content, dream.emotion);
    const id = generateId();
    db.prepare(
      'INSERT INTO dream_interpretations (id, dreamId, userId, content, keywords) VALUES (?, ?, ?, ?, ?)'
    ).run(id, req.params.dreamId, req.userId, content, JSON.stringify([]));

    interp = db.prepare('SELECT * FROM dream_interpretations WHERE id = ?').get(id);
    res.status(201).json(interp);
  } catch (err) {
    console.error('解梦失败:', err);
    res.status(500).json({ message: err.message || '解梦服务暂时不可用' });
  }
});

router.get('/:dreamId', (req, res) => {
  const interp = db.prepare('SELECT * FROM dream_interpretations WHERE dreamId = ?').get(req.params.dreamId);
  if (!interp) return res.status(404).json({ message: '暂无解梦结果' });
  res.json(interp);
});

router.get('/similar/:dreamId', (req, res) => {
  const dream = db.prepare(
    `SELECT d.*, GROUP_CONCAT(t.name) as tagNames FROM dreams d
     LEFT JOIN dream_tags dt ON d.id = dt.dreamId
     LEFT JOIN tags t ON dt.tagId = t.id
     WHERE d.id = ? AND d.userId = ? GROUP BY d.id`
  ).get(req.params.dreamId, req.userId);
  if (!dream) return res.status(404).json({ message: '梦境不存在' });

  const myTags = new Set((dream.tagNames || '').split(',').map(s => s.trim()).filter(Boolean));
  const shared = db.prepare(
    `SELECT sd.*, d.content, d.emotion, GROUP_CONCAT(t.name) as tags
     FROM shared_dreams sd
     JOIN dreams d ON sd.dreamId = d.id
     LEFT JOIN dream_tags dt ON d.id = dt.dreamId
     LEFT JOIN tags t ON dt.tagId = t.id
     WHERE sd.userId != ?
     GROUP BY sd.id ORDER BY sd.likeCount DESC, sd.createdAt DESC LIMIT 50`
  ).all(req.userId);

  const scored = shared.map(s => {
    const sTags = (s.tags || '').split(',').map(x => x.trim()).filter(Boolean);
    const overlap = sTags.filter(t => myTags.has(t)).length;
    const emotionMatch = dream.emotion && s.emotion === dream.emotion ? 1 : 0;
    return { ...s, score: overlap * 2 + emotionMatch };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 10);

  res.json(scored.map(({ id, content, tags, emotion, likeCount, createdAt }) => ({
    id, content, tags, emotion, likeCount, createdAt, isAnonymous: true
  })));
});

export default router;
