import db from '../db.js';

export function adminMiddleware(req, res, next) {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限' });
  }
  next();
}
