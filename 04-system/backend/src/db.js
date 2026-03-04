import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DATABASE_PATH || join(__dirname, '../data/dreams.db');
const dataDir = dirname(dbPath);
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      nickname TEXT,
      avatar TEXT,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expiresAt TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS dreams (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      content TEXT NOT NULL,
      contentType TEXT DEFAULT 'text',
      emotion TEXT,
      sleepQuality INTEGER,
      isShared INTEGER DEFAULT 0,
      shareType TEXT,
      coverImage TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      category TEXT,
      useCount INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS dream_tags (
      dreamId TEXT NOT NULL,
      tagId TEXT NOT NULL,
      PRIMARY KEY (dreamId, tagId),
      FOREIGN KEY (dreamId) REFERENCES dreams(id),
      FOREIGN KEY (tagId) REFERENCES tags(id)
    );

    CREATE TABLE IF NOT EXISTS dream_interpretations (
      id TEXT PRIMARY KEY,
      dreamId TEXT NOT NULL,
      userId TEXT NOT NULL,
      content TEXT NOT NULL,
      keywords TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (dreamId) REFERENCES dreams(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS shared_dreams (
      id TEXT PRIMARY KEY,
      dreamId TEXT NOT NULL UNIQUE,
      userId TEXT NOT NULL,
      isAnonymous INTEGER DEFAULT 1,
      likeCount INTEGER DEFAULT 0,
      commentCount INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (dreamId) REFERENCES dreams(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      sharedDreamId TEXT NOT NULL,
      userId TEXT NOT NULL,
      content TEXT NOT NULL,
      likeCount INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sharedDreamId) REFERENCES shared_dreams(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS comment_likes (
      id TEXT PRIMARY KEY,
      commentId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      UNIQUE(commentId, userId),
      FOREIGN KEY (commentId) REFERENCES comments(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      sharedDreamId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      UNIQUE(sharedDreamId, userId),
      FOREIGN KEY (sharedDreamId) REFERENCES shared_dreams(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      targetType TEXT NOT NULL,
      targetId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL UNIQUE,
      remindTime TEXT,
      isEnabled INTEGER DEFAULT 1,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      relatedId TEXT,
      relatedType TEXT,
      isRead INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_dreams_user ON dreams(userId);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId);
    CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(createdAt);
    CREATE INDEX IF NOT EXISTS idx_dreams_created ON dreams(createdAt);
    CREATE INDEX IF NOT EXISTS idx_shared_dreams_created ON shared_dreams(createdAt);
  `);

  // 迁移：为已有 users 表添加 email 列
  try {
    db.exec('ALTER TABLE users ADD COLUMN email TEXT');
  } catch (e) {
    if (!e.message?.includes('duplicate column')) throw e;
  }

  // 邮箱唯一约束：每个邮箱只能绑定一个账号（若已有重复数据则跳过）
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL`);
  } catch (e) {
    if (!e.message?.includes('UNIQUE') && !e.message?.includes('duplicate')) throw e;
  }

  // 迁移：为已有 dreams 表添加 coverImage 列
  try {
    db.exec('ALTER TABLE dreams ADD COLUMN coverImage TEXT');
  } catch (e) {
    if (!e.message?.includes('duplicate column')) throw e;
  }

  // 迁移：为已有 dreams 表添加地点列
  for (const col of ['location', 'latitude', 'longitude']) {
    try {
      db.exec(`ALTER TABLE dreams ADD COLUMN ${col} ${col === 'location' ? 'TEXT' : 'REAL'}`);
    } catch (e) {
      if (!e.message?.includes('duplicate column')) throw e;
    }
  }

  // 迁移：为已有 comments 表添加 likeCount 列
  try {
    db.exec('ALTER TABLE comments ADD COLUMN likeCount INTEGER DEFAULT 0');
  } catch (e) {
    if (!e.message?.includes('duplicate column')) throw e;
  }

  // 迁移：创建 comment_likes 表（若通过上方 CREATE TABLE 已创建则跳过）
  db.exec(`
    CREATE TABLE IF NOT EXISTS comment_likes (
      id TEXT PRIMARY KEY,
      commentId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      UNIQUE(commentId, userId),
      FOREIGN KEY (commentId) REFERENCES comments(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // 梦境地图：已查看过的分享（从地图上移除）
  db.exec(`
    CREATE TABLE IF NOT EXISTS dream_map_hidden (
      sharedDreamId TEXT PRIMARY KEY,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sharedDreamId) REFERENCES shared_dreams(id)
    )
  `);

  const tagCount = db.prepare('SELECT COUNT(*) as c FROM tags').get();
  if (tagCount.c === 0) {
    const defaultTags = ['飞翔', '坠落', '追逐', '考试', '水', '火', '亲人', '陌生人', '动物', '自然', '建筑', '奇幻'];
    const insertTag = db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)');
    defaultTags.forEach((name, i) => {
      insertTag.run(`tag_${i + 1}`, name);
    });
  }
}

export default db;
