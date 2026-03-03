import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

router.get('/tags', (req, res) => {
  const tags = db.prepare('SELECT * FROM tags ORDER BY useCount DESC').all();
  res.json(tags);
});

router.get('/reminder', authMiddleware, (req, res) => {
  const r = db.prepare('SELECT * FROM reminders WHERE userId = ?').get(req.userId);
  res.json(r || { remindTime: '07:00', isEnabled: 1 });
});

router.put('/reminder', authMiddleware, (req, res) => {
  const { remindTime, isEnabled } = req.body;
  const existing = db.prepare('SELECT * FROM reminders WHERE userId = ?').get(req.userId);
  if (existing) {
    db.prepare('UPDATE reminders SET remindTime = ?, isEnabled = ? WHERE userId = ?')
      .run(remindTime ?? existing.remindTime, isEnabled ?? existing.isEnabled, req.userId);
  } else {
    const id = generateId();
    db.prepare('INSERT INTO reminders (id, userId, remindTime, isEnabled) VALUES (?, ?, ?, ?)')
      .run(id, req.userId, remindTime || '07:00', isEnabled ?? 1);
  }
  const r = db.prepare('SELECT * FROM reminders WHERE userId = ?').get(req.userId);
  res.json(r);
});

router.get('/stats', authMiddleware, (req, res) => {
  const dreams = db.prepare(
    `SELECT d.*, GROUP_CONCAT(t.name) as tags FROM dreams d
     LEFT JOIN dream_tags dt ON d.id = dt.dreamId
     LEFT JOIN tags t ON dt.tagId = t.id
     WHERE d.userId = ? GROUP BY d.id`
  ).all(req.userId);

  const themeCount = {};
  const emotionCount = {};
  const byMonth = {};

  dreams.forEach(d => {
    (d.tags || '').split(',').filter(Boolean).forEach(t => {
      themeCount[t] = (themeCount[t] || 0) + 1;
    });
    if (d.emotion) emotionCount[d.emotion] = (emotionCount[d.emotion] || 0) + 1;
    const month = d.createdAt?.slice(0, 7);
    if (month) byMonth[month] = (byMonth[month] || 0) + 1;
  });

  res.json({
    totalDreams: dreams.length,
    themeDistribution: themeCount,
    emotionDistribution: emotionCount,
    monthlyRecords: byMonth
  });
});

export default router;
