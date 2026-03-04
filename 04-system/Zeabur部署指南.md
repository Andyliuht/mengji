# 梦迹 - Zeabur 部署指南

> 使用 Zeabur 部署梦迹平台，国内访问更稳定

---

## 第一步：确认代码已推送到 GitHub

确保你的代码在 GitHub 仓库中（如 `https://github.com/Andyliuht/mengji`）。

---

## 第二步：注册并创建 Zeabur 项目

### 2.1 打开 Zeabur

1. 打开 https://zeabur.com
2. 点击 **Sign in**，使用 **GitHub** 登录并授权

### 2.2 创建项目

1. 登录后点击 **Create Project**
2. 项目名称可填 `mengji`（可自定）

---

## 第三步：部署后端

### 3.1 添加后端服务

1. 在项目中点击 **Add Service** 或 **Deploy**
2. 选择 **Deploy your source code**
3. 在列表中找到你的仓库 **mengji**，点击 **Import**

### 3.2 配置后端根目录

Zeabur 导入后默认识别仓库根目录，需要指定后端路径：

1. 点击该服务，进入 **Settings**（设置）选项卡
2. 下拉找到 **Root Directory**（根目录）
3. 填入：`04-system/backend`
4. 点击 **Save** 保存
5. 点击 **Redeploy Service** 重新部署

### 3.3 配置构建与启动

Zeabur 通常能自动识别 Node.js 项目，默认会执行：
- **Build**：`npm install`
- **Start**：`npm start`

若未自动识别，在 **Settings** 中手动设置。

### 3.4 添加环境变量

在服务的 **Variables** 中添加：

| Key | Value |
|-----|-------|
| `JWT_SECRET` | `mengji-secret-2024`（可自定，建议复杂） |

### 3.5 获取后端地址

1. 部署完成后，点击服务
2. 在 **Networking** 或 **Domains** 中开启公网访问
3. 复制生成的域名，例如：`https://mengji-backend-xxx.zeabur.app`
4. **保存此地址**，部署前端时需要用到

### 3.6 验证后端

在浏览器打开：`https://你的后端地址/api/health`  
应看到：`{"status":"ok","message":"梦境记录平台 API 运行中"}`

---

## 第四步：部署前端

### 4.1 添加前端服务

1. 在同一项目中再次点击 **Add Service**
2. 选择 **Deploy your source code**
3. 再次选择同一仓库 **mengji**

### 4.2 配置前端根目录

1. 点击该服务，进入 **Settings**（设置）选项卡
2. 下拉找到 **Root Directory**（根目录）
3. 填入：`04-system/frontend`
4. 点击 **Save** 保存
5. 点击 **Redeploy Service** 重新部署

### 4.3 添加环境变量

在 **Variables** 中添加：

| Key | Value |
|-----|-------|
| `VITE_API_URL` | 第三步的后端地址，如 `https://mengji-backend-xxx.zeabur.app` |

⚠️ **不要**加 `/api`，不要加末尾斜杠。

### 4.4 静态部署配置

项目已包含 `04-system/frontend/zbpack.json`，会告诉 Zeabur 将 `dist` 作为静态站点部署，无需额外配置。

### 4.5 获取前端地址

1. 部署完成后，在 **Networking** 中开启公网访问
2. 复制前端域名，例如：`https://mengji-frontend-xxx.zeabur.app`

---

## 第五步：验证

1. 打开前端地址
2. 点击「立即注册」创建账号
3. 登录后尝试记录梦境、进入梦迹地图等

全部正常即部署成功。

---

## 常见问题

**Q：Zeabur 找不到 04-system 目录？**  
→ 确认仓库根目录包含 `04-system` 文件夹，且已推送到 GitHub。

**Q：前端能打开但登录/注册失败？**  
→ 检查 `VITE_API_URL` 是否正确，且没有多余 `/api` 或斜杠。环境变量修改后需重新部署。

**Q：如何绑定自定义域名？**  
→ 在 Zeabur 服务的 **Domains** 中添加域名，按提示在域名商处添加 CNAME 解析。

**Q：Zeabur 免费额度？**  
→ 新用户有免费额度，可在控制台查看用量。超出后需按量付费。
