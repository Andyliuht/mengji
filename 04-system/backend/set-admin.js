/**
 * 将指定用户设为管理员
 * 用法：node set-admin.js <用户名>
 * 示例：node set-admin.js admin
 * 支持 DATABASE_PATH 环境变量（与主程序一致，便于 Railway 等部署环境使用）
 */
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase } from './src/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || join(__dirname, 'data/dreams.db');
const db = new Database(dbPath);

// 确保数据库表已创建（Railway 启动时 set-admin 先于主程序运行）
initDatabase();

const username = process.argv[2];
if (!username) {
  console.log('用法：node set-admin.js <用户名>');
  console.log('示例：node set-admin.js admin');
  process.exit(1);
}

const r = db.prepare('UPDATE users SET role = ? WHERE username = ?').run('admin', username);
db.close();

if (r.changes > 0) {
  console.log(`已将用户 "${username}" 设为管理员，请重新登录生效。`);
} else {
  console.log(`未找到用户 "${username}"，请检查用户名是否正确。`);
}
