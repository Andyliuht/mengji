/**
 * 豆包 Seedream 文生图服务
 * 火山方舟 API：https://ark.cn-beijing.volces.com/api/v3/images/generations
 *
 * 需在 .env 配置：
 *   ARK_API_KEY=你的火山方舟 API Key
 *   SEEDREAM_MODEL=推理接入点 ID（如 ep-xxxxx，在火山方舟控制台创建）
 */

const ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3';

// 情绪 → 画面风格
const EMOTION_STYLE = {
  '😊': '明亮温暖，欢快氛围，柔和色调',
  '😄': '明亮活泼，充满活力',
  '😁': '兴奋明亮，高饱和色彩',
  '😌': '宁静祥和，柔和淡雅',
  '😇': '安详圣洁，柔和光晕',
  '🥰': '温馨幸福，浪漫粉色调',
  '😢': '忧郁氛围，冷蓝灰调',
  '😭': '深沉悲伤，低饱和暗色',
  '😔': '沮丧低沉，灰暗色调',
  '😰': '紧张焦虑，不安氛围',
  '😨': '神秘暗黑，紧张压抑',
  '😱': '惊恐诡异，强烈对比',
  '😤': '强烈戏剧性，冲突感',
  '😠': '愤怒炽烈，红橙对比',
  '😡': '暴烈冲击，强烈对比',
  '😶': '迷离朦胧，梦幻模糊',
  '😵': '眩晕迷幻，扭曲流动',
  '🤔': '沉思冥想，柔和中性',
  '😴': '困倦慵懒，柔和梦幻',
  '🥱': '疲惫松弛，柔和低饱和',
  '😓': '无奈疲惫，灰调',
  '🤯': '震撼冲击，强烈视觉',
  '😲': '惊讶奇幻，超现实',
  '😮': '意外惊奇，戏剧性'
};

// 标签 → 场景/氛围暗示
const TAG_STYLE = {
  '飞翔': '天空，轻盈，自由',
  '坠落': '动感，深渊，失重感',
  '追逐': '紧张追逐，动态',
  '考试': '教室，紧张氛围',
  '水': '水景，流动，湿润',
  '火': '火光，炽热，燃烧',
  '亲人': '温馨，情感联结',
  '陌生人': '神秘，未知',
  '动物': '自然生灵，野性',
  '自然': '自然风光，宁静',
  '建筑': '建筑场景，空间感',
  '奇幻': '奇幻魔法，超现实'
};

/**
 * 根据情绪、标签和内容生成适配风格的提示词
 */
function buildImagePrompt(dreamContent, emotion, tags) {
  const maxLen = 200;
  let text = dreamContent.trim().replace(/\s+/g, ' ');
  if (text.length > maxLen) text = text.slice(0, maxLen) + '...';

  const styleParts = ['梦境主题插画'];
  if (emotion && EMOTION_STYLE[emotion]) {
    styleParts.push(EMOTION_STYLE[emotion]);
  } else {
    styleParts.push('梦幻唯美，柔和色调');
  }
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    const hints = tagList.map(t => TAG_STYLE[t]).filter(Boolean);
    if (hints.length > 0) styleParts.push(hints.slice(0, 2).join('，'));
  }
  styleParts.push('超现实主义');

  const prefix = styleParts.join('，') + '：';
  return prefix + text;
}

/**
 * 调用豆包 Seedream 文生图 API
 * @param {string} prompt - 文本提示词
 * @returns {Promise<{ url?: string, b64?: string }>} 返回 url 或 base64
 */
export async function generateImage(prompt) {
  const apiKey = process.env.ARK_API_KEY;
  const model = process.env.SEEDREAM_MODEL || process.env.SEEDREAM_ENDPOINT_ID;

  if (!apiKey || !model) {
    throw new Error('未配置文生图：请设置 ARK_API_KEY 和 SEEDREAM_MODEL');
  }

  const body = {
    model,
    prompt,
    size: '1024x1024',
    n: 1,
    response_format: 'b64_json',
    stream: false,
    watermark: false
  };

  const res = await fetch(`${ARK_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error?.message || data.message || res.statusText || '文生图请求失败';
    throw new Error(msg);
  }

  const img = data.data?.[0];
  if (!img?.b64_json) {
    throw new Error(data.error?.message || '未返回图片数据');
  }

  return `data:image/png;base64,${img.b64_json}`;
}

/**
 * 根据梦境内容生成配图（支持情绪、标签适配风格）
 * @param {object} dream - 梦境对象 { content, emotion?, tags? }
 * @returns {Promise<string>} data URL
 */
export async function generateDreamImage(dream) {
  const content = typeof dream === 'string' ? dream : dream?.content;
  if (!content || !content.trim()) {
    throw new Error('梦境内容为空');
  }
  const emotion = typeof dream === 'object' ? dream?.emotion : null;
  const tags = typeof dream === 'object' ? dream?.tags : null;
  const prompt = buildImagePrompt(content, emotion, tags);
  return generateImage(prompt);
}
