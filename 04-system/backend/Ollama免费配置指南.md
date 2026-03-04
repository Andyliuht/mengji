# Ollama 免费 AI 解梦 - 配置指南

> 完全免费，无用量限制，无需 API Key

---

## 第一步：安装 Ollama

1. 打开 https://ollama.com/download
2. 选择 **Windows** 下载安装包
3. 安装后 Ollama 会自动在后台运行

---

## 第二步：拉取模型

打开命令提示符或 PowerShell，执行：

```bash
ollama pull qwen2.5:7b
```

- **qwen2.5:7b**：约 4.7GB，中文效果好，适合 8GB 以上内存
- 若内存较小，可改用：`ollama pull qwen2.5:3b`（约 2GB）

首次拉取约需 5–15 分钟，取决于网速。

---

## 第三步：配置项目

在 `04-system/backend` 目录创建 `.env` 文件，内容：

```
USE_OLLAMA=true
OLLAMA_MODEL=qwen2.5:7b
```

若使用 3B 模型，改为：

```
USE_OLLAMA=true
OLLAMA_MODEL=qwen2.5:3b
```

---

## 第四步：重启后端

```bash
cd d:\vscode\软件工程\04-system\backend
npm run dev
```

---

## 完成

现在点击「获取 AI 解梦」会调用本地的 Ollama 模型，无需联网、无需付费。

---

## 常见问题

**Q：提示 "Ollama 调用失败"？**
- 确认 Ollama 已安装并在运行（托盘图标或任务管理器中有 ollama）
- 确认已执行 `ollama pull qwen2.5:7b` 拉取模型

**Q：解梦很慢？**
- 7B 模型在 CPU 上约 10–30 秒，属正常
- 若有显卡，Ollama 会自动使用 GPU 加速

**Q：内存不够？**
- 用 `qwen2.5:3b`（约 2GB）或 `phi3:mini`（约 2GB）
