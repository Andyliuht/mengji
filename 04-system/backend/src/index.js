import express from 'express';
import cors from 'cors';
import { initDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import dreamRoutes from './routes/dream.js';
import communityRoutes from './routes/community.js';
import interpretationRoutes from './routes/interpretation.js';
import userRoutes from './routes/user.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true }));  // 允许任意来源（局域网访问时需接受其他设备的请求）
app.use(express.json());

initDatabase();

app.use('/api/auth', authRoutes);
app.use('/api/dreams', dreamRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/interpretation', interpretationRoutes);
app.use('/api/user', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '梦境记录平台 API 运行中' });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: '梦境记录平台 API' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
  console.log(`局域网访问: 使用本机 IP 地址 + 端口 ${PORT}`);
});
