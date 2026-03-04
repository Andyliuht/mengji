# 梦迹 - Railway 后端部署指南

> 使用 Railway 部署梦迹后端 API，配合 Vercel 部署前端

---

## 前提

- 代码已推送到 GitHub（如 `https://github.com/Andyliuht/mengji`）

---

## 第一步：打开 Railway

1. 打开 https://railway.app
2. 点击 **Login**，使用 **GitHub** 登录并授权

---

## 第二步：创建项目并部署

### 2.1 新建项目

1. 点击 **New Project**
2. 选择 **Deploy from GitHub repo**
3. 若未连接 GitHub，点击 **Configure GitHub App** 并授权
4. 在仓库列表中找到 **mengji**，点击选择

### 2.2 配置根目录

Railway 导入后默认使用仓库根目录，需要改为后端目录：

1. 点击刚创建的服务（Service）
2. 进入 **Settings** 选项卡
3. 找到 **Source** 区域
4. 在 **Root Directory** 中填入：`04-system/backend`
5. 保存（如有 Save 按钮则点击）

### 2.3 添加环境变量

1. 在服务页面点击 **Variables** 选项卡（或 Settings 中的 Variables）
2. 点击 **Add Variable** 或 **New Variable**
3. 添加：
   - **Key**：`JWT_SECRET`
   - **Value**：`mengji-secret-2024`（可自定，建议复杂一些）

### 2.4 生成公网地址

1. 进入 **Settings** 选项卡
2. 找到 **Networking** 或 **Public Networking**
3. 点击 **Generate Domain** 或 **Add Domain**
4. Railway 会生成类似 `xxx.up.railway.app` 的地址
5. **复制并保存此地址**，部署前端时需要用到

### 2.5 等待部署

- Railway 会自动执行 `npm install` 和 `npm start`
- 等待 2～5 分钟，状态变为 **Success** 或 **Active** 即成功

### 2.6 验证后端

在浏览器打开：`https://你的地址/api/health`  
应看到：`{"status":"ok","message":"梦境记录平台 API 运行中"}`

---

## 第三步：部署前端到 Vercel

1. 打开 https://vercel.com，用 GitHub 登录
2. **Add New** → **Project** → 选择 **mengji** 仓库
3. **Root Directory** 填入：`04-system/frontend`
4. **Environment Variables** 添加：
   - **Key**：`VITE_API_URL`
   - **Value**：第二步的 Railway 地址（如 `https://mengji-production-xxx.up.railway.app`）  
   ⚠️ **不要**加 `/api`，不要加末尾斜杠
5. 点击 **Deploy**，等待完成

---

## 第四步：验证

1. 打开 Vercel 提供的前端地址
2. 注册、登录、记录梦境，确认功能正常

---

## 常见问题

**Q：Railway 找不到 04-system/backend？**  
→ 确认 Root Directory 填的是 `04-system/backend`，保存后重新部署（Redeploy）。

**Q：前端能打开但登录/注册失败？**  
→ 检查 Vercel 的 `VITE_API_URL` 是否正确，且没有多余 `/api`。修改后需重新部署前端。

**Q：Railway 收费吗？**  
→ 新用户有免费额度（约 $5），用完后需付费。可在 Dashboard 查看用量。

**Q：如何重新部署？**  
→ 推送代码到 GitHub 会自动触发 Railway 重新部署；或手动点击 **Redeploy**。
