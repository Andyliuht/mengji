import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import dreamRoutes from './routes/dream.js';
import communityRoutes from './routes/community.js';
import interpretationRoutes from './routes/interpretation.js';
import userRoutes from './routes/user.js';
import notificationRoutes from './routes/notification.js';
import geoRoutes from './routes/geo.js';

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
app.use('/api/notifications', notificationRoutes);
app.get('/api/geo/china-map', async (req, res) => {
  try {
    const resp = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json');
    if (!resp.ok) throw new Error('地图数据加载失败');
    const json = await resp.json();
    res.json(json);
  } catch (e) {
    res.status(500).json({ message: e.message || '地图数据加载失败' });
  }
});
app.use('/api/geo', geoRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '梦境记录平台 API 运行中' });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: '梦境记录平台 API' });
});

function tryListen(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => resolve(server));
    server.on('error', reject);
  });
}

async function startServer() {
  const port = Number(PORT) || 3000;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const server = await tryListen(port);
      console.log(`后端服务运行在 http://localhost:${port}`);
      console.log(`也可访问 http://127.0.0.1:${port}`);
      return;
    } catch (err) {
      if (err.code === 'EADDRINUSE' && attempt === 0) {
        console.log(`端口 ${port} 已被占用，正在释放...`);
        const { execSync } = await import('child_process');
        try {
          if (process.platform === 'win32') {
            const out = execSync(`netstat -ano | findstr "LISTENING"`, { encoding: 'utf8' });
            const re = new RegExp(`:${port}\\s`);
            const pids = [...new Set(out.split('\n').filter(l => re.test(l)).map(l => l.trim().split(/\s+/).pop()).filter(Boolean))];
            for (const pid of pids) if (pid !== '0') execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          } else {
            execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
          }
          await new Promise(r => setTimeout(r, 500));
        } catch (_) {}
        continue;
      }
      throw err;
    }
  }
}

startServer().catch((err) => {
  console.error(`启动失败: ${err.message}`);
  process.exit(1);
});
