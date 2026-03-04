/**
 * AI 梦境解读服务 - 支持多种大模型
 * 优先使用配置的 AI，若无则回退到规则匹配
 */

const DREAM_EXPERT_PROMPT = `你是一位专业的梦境解读专家，擅长结合荣格心理学、弗洛伊德精神分析及东方解梦传统，对梦境进行多维度解读。

【重要】直接输出解读内容，不要有任何开场白、自我介绍或"好的，我来分析"等客套话。从第一句开始就是解读正文。

请根据用户描述的梦境内容，从以下角度进行分析：
1. 主要意象与象征
2. 情感与心理状态
3. 可能的潜意识隐喻
4. 生活或人际关系的暗示

要求：
- 语言温和、有同理心
- 避免绝对化结论，多用"可能""或许""有时"等表述
- 篇幅 200-400 字
- 结尾加上"仅供参考，梦境因人而异"
- 不要输出任何元信息（如"根据您的梦境..."等引导语），直接给出解读

用户梦境：`;

// 规则回退：关键词库
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

function ruleBasedInterpret(content) {
  const keywords = [];
  for (const key of Object.keys(DREAM_KEYWORDS)) {
    if (content.includes(key)) keywords.push(key);
  }
  const kws = keywords.length > 0 ? keywords : ['未知'];
  const parts = kws.map(k => DREAM_KEYWORDS[k] || k + '在梦中有其独特含义。').join(' ');
  return `根据您的梦境内容，提取到关键词：${kws.join('、')}。\n\n${parts}\n\n（以上解读仅供参考，梦境因人而异。）`;
}

/**
 * 去除模型输出中的常见客套话/元信息
 */
function cleanInterpretationOutput(text) {
  if (!text || typeof text !== 'string') return text;
  const metaPrefixes = [
    /^好的[，,]?\s*/i,
    /^根据您(?:描述)?的梦境[，,]?\s*(?:我)?(?:来)?(?:进行)?(?:分析|解读)[：:]\s*/i,
    /^作为(?:一位)?(?:专业的)?梦境解读专家[，,]?\s*/i,
    /^以下(?:是)?(?:我的)?(?:分析|解读)[：:]\s*/i,
    /^根据(?:您)?(?:的)?梦境内容[，,]?\s*/i,
    /^我来(?:为您)?(?:进行)?(?:分析|解读)[：:]\s*/i
  ];
  let cleaned = text.trim();
  for (const re of metaPrefixes) {
    cleaned = cleaned.replace(re, '');
  }
  return cleaned.trim() || text;
}

/**
 * 调用 Ollama 本地模型
 */
async function callOllama(content) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 分钟超时
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'qwen2.5:7b',
      messages: [
        { role: 'system', content: '你是梦境解读专家。直接输出解读正文，不要任何开场白、自我介绍或客套话。' },
        { role: 'user', content: DREAM_EXPERT_PROMPT + content }
      ],
      stream: false
    }),
    signal: controller.signal
  });
  clearTimeout(timeoutId);
  if (!res.ok) throw new Error('Ollama 调用失败');
  const data = await res.json();
  const raw = data.message?.content?.trim() || '';
  return cleanInterpretationOutput(raw);
}

/**
 * 调用 OpenAI 兼容接口（通义千问、智谱等）
 */
async function callOpenAICompatible(content, config) {
  const { baseUrl, apiKey, model } = config;
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一位专业的梦境解读专家，擅长结合心理学与传统文化解读梦境。' },
        { role: 'user', content: DREAM_EXPERT_PROMPT + content }
      ],
      temperature: 0.7,
      max_tokens: 800
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API 调用失败: ${err}`);
  }
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || '';
  return cleanInterpretationOutput(raw);
}

/**
 * 主入口：根据配置选择 AI 并生成解读
 */
export async function interpretDream(dreamContent, emotion = '') {
  const content = dreamContent + (emotion ? `\n（用户标记的情绪：${emotion}）` : '');

  // 1. 通义千问（阿里云 DashScope）
  const dashScopeKey = process.env.DASHSCOPE_API_KEY;
  if (dashScopeKey) {
    try {
      const result = await callOpenAICompatible(content, {
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        apiKey: dashScopeKey,
        model: process.env.DASHSCOPE_MODEL || 'qwen-turbo'
      });
      if (result) return result;
    } catch (e) {
      console.error('通义千问调用失败:', e.message);
    }
  }

  // 2. 智谱 ChatGLM
  const zhipuKey = process.env.ZHIPU_API_KEY;
  if (zhipuKey) {
    try {
      const result = await callOpenAICompatible(content, {
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        apiKey: zhipuKey,
        model: process.env.ZHIPU_MODEL || 'glm-4-flash'
      });
      if (result) return result;
    } catch (e) {
      console.error('智谱调用失败:', e.message);
    }
  }

  // 3. Ollama 本地（完全免费，无限制）
  if (process.env.USE_OLLAMA === 'true' || process.env.USE_OLLAMA === '1') {
    try {
      const result = await callOllama(content);
      if (result) return result;
    } catch (e) {
      console.error('Ollama 调用失败:', e.message);
    }
  }

  // 4. 回退到规则匹配
  return ruleBasedInterpret(dreamContent);
}
