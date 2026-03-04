# AI 解梦 - 大模型配置说明

系统已支持调用免费大模型进行梦境解读，按以下优先级尝试：

1. **通义千问**（阿里云）
2. **智谱 ChatGLM**
3. **Ollama**（本地）
4. **规则匹配**（无配置时的回退）

---

## 方案一：通义千问（推荐，有免费额度）

### 1. 获取 API Key

1. 打开 https://dashscope.aliyun.com
2. 登录阿里云账号
3. 进入「API-KEY 管理」→ 创建新 Key
4. 新用户有免费额度（约 100 万 tokens）

### 2. 配置环境变量

在 `backend` 目录创建 `.env` 文件（或设置系统环境变量）：

```
DASHSCOPE_API_KEY=sk-你的API密钥
DASHSCOPE_MODEL=qwen-turbo
```

### 3. 加载 .env

安装 dotenv：`npm install dotenv`

在 `src/index.js` 最顶部添加：`import 'dotenv/config';`

---

## 方案二：智谱 ChatGLM（GLM-4-Flash 免费）

### 1. 获取 API Key

1. 打开 https://open.bigmodel.cn
2. 注册并登录
3. 创建 API Key
4. GLM-4-Flash 模型目前免费

### 2. 配置环境变量

```
ZHIPU_API_KEY=你的API密钥
ZHIPU_MODEL=glm-4-flash
```

---

## 方案三：Ollama 本地（完全免费）

### 1. 安装 Ollama

1. 下载：https://ollama.com/download
2. 安装后拉取模型：`ollama pull qwen2.5:7b`

### 2. 配置环境变量

```
USE_OLLAMA=true
OLLAMA_MODEL=qwen2.5:7b
```

### 3. 确保 Ollama 已启动

Ollama 安装后会常驻运行，默认地址 `http://localhost:11434`

---

## 本地开发快速配置

在 `backend` 目录创建 `.env` 文件：

```
# 任选其一配置即可
DASHSCOPE_API_KEY=sk-xxx
# 或
ZHIPU_API_KEY=xxx
# 或
USE_OLLAMA=true
```

---

## 解梦专家提示词

系统使用专业提示词，引导模型从以下角度解读：

- 荣格心理学、弗洛伊德精神分析
- 东方解梦传统
- 主要意象与象征
- 情感与心理状态
- 潜意识隐喻

模型会以温和、有同理心的方式输出，并避免绝对化结论。
