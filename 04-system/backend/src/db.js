import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DATABASE_PATH || join(__dirname, '../data/dreams.db');
const db = new Database(dbPath);

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      createdAt TEXT DEFAULT (datetime('now'))
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
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sharedDreamId) REFERENCES shared_dreams(id),
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

    CREATE INDEX IF NOT EXISTS idx_dreams_user ON dreams(userId);
    CREATE INDEX IF NOT EXISTS idx_dreams_created ON dreams(createdAt);
    CREATE INDEX IF NOT EXISTS idx_shared_dreams_created ON shared_dreams(createdAt);
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
