import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// 逆地理编码：根据经纬度获取地址（使用 OpenStreetMap Nominatim，免费无需 API Key）
router.get('/reverse', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ message: '无效的经纬度' });
  }
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=zh`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'DreamJournal/1.0 (梦迹梦境记录)' }
    });
    const data = await resp.json();
    const addr = data.address || {};
    const parts = [
      addr.country,
      addr.state || addr.province,
      addr.city || addr.town || addr.village,
      addr.district || addr.suburb,
      addr.road,
      addr.house_number
    ].filter(Boolean);
    const location = data.display_name || parts.join(' ') || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    res.json({ location, latitude: lat, longitude: lon });
  } catch (e) {
    console.error('逆地理编码失败:', e.message);
    res.json({ location: `${lat.toFixed(6)}°N, ${lon.toFixed(6)}°E`, latitude: lat, longitude: lon });
  }
});

export default router;
