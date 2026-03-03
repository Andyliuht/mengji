import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

const DREAM_KEYWORDS = {
  '飞翔': '飞翔之梦常象征自由与解脱，可能代表你渴望摆脱某种束缚。',
  '坠落': '坠落之梦可能反映内心的焦虑与不安，或对失控的恐惧。',
  '追逐': '追逐之梦可能暗示你正在逃避某些不愿面对的事物。',
  '考试': '考试之梦常与压力、自我评价有关，可能反映对表现的担忧。',
  '水': '水在梦中象征情绪与潜意识，清澈的水代表平静，浑浊则可能暗示情绪波动。',
  '火': '火象征热情、能量或愤怒，也可能代表某种转变。',
  '亲人': '梦见亲人常与情感联结、未解决的议题有关。',
  '陌生人': '陌生人在梦中可能代表你未知的自我或新的可能性。',
  '动物': '动物常象征本能与直觉，不同动物有不同寓意。',
  '自然': '自然之梦常与内心平静、与自我连接有关。',
  '建筑': '建筑象征人生的结构、安全感或目标。',
  '奇幻': '奇幻之梦可能反映创造力与想象力，或对现实的逃避。'
};

function extractKeywords(content) {
  const keywords = [];
  for (const key of Object.keys(DREAM_KEYWORDS)) {
    if (content.includes(key)) keywords.push(key);
  }
  return keywords.length > 0 ? keywords : ['未知'];
}

function generateInterpretation(content, keywords) {
  const parts = keywords.map(k => DREAM_KEYWORDS[k] || k + '在梦中有其独特含义。').join(' ');
  return `根据您的梦境内容，提取到关键词：${keywords.join('、')}。\n\n${parts}\n\n（以上解读仅供参考，梦境因人而异。）`;
}

router.use(authMiddleware);

router.post('/:dreamId', (req, res) => {
  const dream = db.prepare('SELECT * FROM dreams WHERE id = ? AND userId = ?').get(req.params.dreamId, req.userId);
  if (!dream) return res.status(404).json({ message: '梦境不存在' });

  let interp = db.prepare('SELECT * FROM dream_interpretations WHERE dreamId = ?').get(req.params.dreamId);
  if (interp) {
    return res.json(interp);
  }

  const keywords = extractKeywords(dream.content);
  const content = generateInterpretation(dream.content, keywords);
  const id = generateId();
  db.prepare(
    'INSERT INTO dream_interpretations (id, dreamId, userId, content, keywords) VALUES (?, ?, ?, ?, ?)'
  ).run(id, req.params.dreamId, req.userId, content, JSON.stringify(keywords));

  interp = db.prepare('SELECT * FROM dream_interpretations WHERE id = ?').get(id);
  res.status(201).json(interp);
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
