/**
 * 日期格式化工具
 * SQLite 的 datetime('now') 返回 UTC，需按 UTC 解析后转为本地时间显示
 */
export function parseUTCDate(str) {
  if (!str) return null
  const s = String(str).trim()
  if (!s) return null
  if (s.endsWith('Z') || s.includes('+') || /-\d{2}:\d{2}$/.test(s)) return new Date(s)
  return new Date(s.replace(' ', 'T') + 'Z')
}

export function formatDate(str, options = {}) {
  const d = parseUTCDate(str)
  if (!d || isNaN(d.getTime())) return ''
  return d.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  })
}

export function formatDateTime(str) {
  const d = parseUTCDate(str)
  if (!d || isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN')
}
