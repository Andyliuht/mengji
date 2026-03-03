import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

router.post('/register', (req, res) => {
  try {
    const { username, password, nickname } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }
    const hashed = bcrypt.hashSync(password, 10);
    const id = generateId();
    db.prepare(
      'INSERT INTO users (id, username, password, nickname) VALUES (?, ?, ?, ?)'
    ).run(id, username, hashed, nickname || username);
    const token = generateToken(id);
    res.json({ token, userId: id, username, nickname: nickname || username });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ message: '用户名已存在' });
    }
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    const token = generateToken(user.id);
    res.json({
      token,
      userId: user.id,
      username: user.username,
      nickname: user.nickname || user.username
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
