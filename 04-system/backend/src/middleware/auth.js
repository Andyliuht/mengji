import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dream-journal-secret-key';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '请先登录' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: '登录已过期，请重新登录' });
  }
}

export function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId;
  } catch (_) {}
  next();
}

export function generateToken(userId) {
  return jwt.sign({ userId }, SECRET, { expiresIn: '7d' });
}

export { SECRET };
