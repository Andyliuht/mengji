# 梦境记录与分享平台 - 系统实现

> Vue 3 + JavaScript 全栈实现

## 技术栈

- **前端**：Vue 3 + Vite + JavaScript + Pinia + Vue Router + Axios
- **后端**：Node.js + Express
- **数据库**：SQLite（better-sqlite3）

## 项目结构

```
04-system/
├── backend/          # 后端 API
│   ├── src/
│   │   ├── index.js
│   │   ├── db.js
│   │   ├── middleware/auth.js
│   │   └── routes/
│   ├── data/         # SQLite 数据库文件（自动创建）
│   └── package.json
├── frontend/         # 前端 Vue 应用
│   ├── src/
│   │   ├── views/
│   │   ├── stores/
│   │   ├── router/
│   │   ├── api/
│   │   └── App.vue
│   └── package.json
└── README.md
```

## 快速启动

### 1. 安装依赖并启动后端

```bash
cd backend
npm install
npm run dev
```

后端将运行在 http://localhost:3000

### 2. 安装依赖并启动前端

```bash
cd frontend
npm install
npm run dev
```

前端将运行在 http://localhost:5173，并自动代理 API 请求到后端。

### 3. 访问应用

打开浏览器访问 http://localhost:5173

- 首次使用请先**注册**账号
- 登录后可记录梦境、获取 AI 解梦、查找相似梦境、分享到社区
- 社区页面可浏览他人分享的梦境（访客也可浏览，但点赞评论需登录）

## 已实现功能

| 功能 | 说明 |
|------|------|
| 用户注册/登录 | JWT 认证 |
| 记录梦境 | 文字内容、标签、情绪 |
| 编辑/删除梦境 | 未分享的梦境可编辑删除 |
| AI 解梦 | 基于关键词的规则解梦 |
| 相似梦境匹配 | 基于标签和情绪的相似度匹配 |
| 分享梦境 | 匿名分享到社区 |
| 梦境社区 | 浏览、点赞、评论 |
| 个人统计 | 主题分布、情绪分布、月度记录 |
| 标签管理 | 预设标签 + 选择 |

## 后续可扩展

- 记录提醒（Reminder 表已建，前端可增加设置页）
- 梦境导出 PDF/文本
- 梦境日历/时间线视图
- 解梦收藏
- 更丰富的 AI 解梦（接入大模型 API）
