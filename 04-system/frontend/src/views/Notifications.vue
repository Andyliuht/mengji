<template>
  <div class="notifications-page">
    <div class="fixed-top">
      <h1>消息中心</h1>
    </div>
    <div class="scroll-area">
      <!-- 管理员：官方广播 -->
      <section v-if="userStore.isAdmin" class="broadcast-section">
      <h2>官方通知（管理员）</h2>
      <div class="broadcast-form">
        <input v-model="broadcastTitle" placeholder="通知标题" class="input" />
        <textarea v-model="broadcastContent" placeholder="通知内容（选填）" class="textarea" rows="3"></textarea>
        <button @click="doBroadcast" class="btn-primary" :disabled="broadcasting">
          {{ broadcasting ? '发送中...' : '发送给全部用户' }}
        </button>
        <p v-if="broadcastMsg" class="msg" :class="{ error: broadcastError }">{{ broadcastMsg }}</p>
      </div>
    </section>

    <!-- 管理员：举报管理 -->
    <section v-if="userStore.isAdmin" ref="reportsSectionRef" class="reports-section">
      <h2>举报管理</h2>
      <div v-if="reportsLoading" class="loading">加载中...</div>
      <div v-else-if="!reportsList.length" class="empty">暂无待处理举报</div>
      <div v-else class="reports-list">
        <div v-for="r in reportsList" :key="r.id" class="report-item">
          <div class="report-body">
            <div class="report-meta">举报人：{{ r.reporterName }} | 被举报人：{{ r.authorName }}</div>
            <div class="report-content">{{ (r.content || '').slice(0, 80) }}{{ (r.content || '').length > 80 ? '...' : '' }}</div>
            <div class="report-actions">
              <button @click="handleReportDelete(r)" class="btn-danger">删除梦境</button>
              <button @click="handleReportMute(r, 1)" class="btn-mute">禁言1天</button>
              <button @click="handleReportMute(r, 7)" class="btn-mute">禁言7天</button>
              <button @click="handleReportMute(r, 30)" class="btn-mute">禁言30天</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section ref="listSectionRef" class="list-section">
      <div class="list-header">
        <span>我的消息</span>
        <div class="header-actions">
          <button v-if="list.length" class="link-btn" @click="deleteAll">删除全部</button>
          <button v-if="unreadCount > 0" class="link-btn" @click="markAllRead">全部已读</button>
        </div>
      </div>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="!list.length" class="empty">暂无消息</div>
      <div v-else class="list">
        <div
          v-for="n in list"
          :key="n.id"
          class="item"
          :class="{ unread: !n.isRead }"
          @click="handleClick(n)"
        >
          <span class="item-type" :class="n.type">{{ n.type === 'official' ? '📢' : n.type === 'report' ? '⚠️' : (n.type === 'like' || n.type === 'comment_like') ? '👍' : '💬' }}</span>
          <div class="item-body">
            <div class="item-title">{{ n.title }}</div>
            <div v-if="n.content" class="item-content">{{ n.content }}</div>
            <div class="item-time">{{ formatDateTime(n.createdAt) }}</div>
          </div>
          <button class="item-delete" @click.stop="deleteOne(n)" title="删除">×</button>
        </div>
      </div>
    </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '../api/request'
import { useUserStore } from '../stores/user'
import { formatDateTime } from '../utils/date'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const list = ref([])
const unreadCount = ref(0)
const loading = ref(true)
const broadcastTitle = ref('')
const broadcastContent = ref('')
const broadcasting = ref(false)
const broadcastMsg = ref('')
const broadcastError = ref(false)
const reportsList = ref([])
const reportsLoading = ref(false)
const reportsSectionRef = ref(null)
const listSectionRef = ref(null)

function scrollToSection(section) {
  nextTick(() => {
    if (section === 'reports' && reportsSectionRef.value) {
      reportsSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else if (section === 'my-messages' && listSectionRef.value) {
      listSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

function emitChanged() {
  window.dispatchEvent(new CustomEvent('notifications-changed'))
}

onMounted(async () => {
  await fetchList()
  await fetchUnreadCount()
  if (userStore.isAdmin) await fetchReports()
  window.addEventListener('notifications-changed', fetchList)
  window.addEventListener('notifications-changed', fetchUnreadCount)
  scrollToSection(route.query.section)
})
watch(() => route.query.section, (section) => {
  if (section) scrollToSection(section)
})
onUnmounted(() => {
  window.removeEventListener('notifications-changed', fetchList)
  window.removeEventListener('notifications-changed', fetchUnreadCount)
})

async function fetchList() {
  loading.value = true
  try {
    list.value = await request.get('/notifications')
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function fetchUnreadCount() {
  try {
    const res = await request.get('/notifications/unread-count')
    unreadCount.value = res.count || 0
  } catch (e) {
    console.error(e)
  }
}

async function fetchReports() {
  if (!userStore.isAdmin) return
  reportsLoading.value = true
  try {
    reportsList.value = await request.get('/reports')
  } catch (e) {
    console.error(e)
  } finally {
    reportsLoading.value = false
  }
}

async function handleReportDelete(r) {
  if (!confirm('确定要删除该梦境吗？此操作不可恢复。')) return
  try {
    await request.post(`/reports/${r.id}/delete`)
    reportsList.value = reportsList.value.filter(x => x.id !== r.id)
    await fetchList()
    emitChanged()
  } catch (e) {
    alert((e && e.message) || '操作失败')
  }
}

async function handleReportMute(r, days = 1) {
  const label = days === 1 ? '24 小时' : `${days} 天`
  if (!confirm(`确定要禁言该用户 ${label} 吗？`)) return
  try {
    await request.post(`/reports/${r.id}/mute`, { days })
    reportsList.value = reportsList.value.filter(x => x.id !== r.id)
    await fetchList()
    emitChanged()
  } catch (e) {
    alert((e && e.message) || '操作失败')
  }
}

async function markAllRead() {
  try {
    await request.patch('/notifications/read-all')
    unreadCount.value = 0
    list.value = list.value.map(n => ({ ...n, isRead: 1 }))
    emitChanged()
  } catch (e) {
    console.error(e)
  }
}

async function deleteOne(n) {
  try {
    await request.delete(`/notifications/${n.id}`)
    list.value = list.value.filter(x => x.id !== n.id)
    if (!n.isRead && unreadCount.value > 0) unreadCount.value--
    emitChanged()
  } catch (e) {
    console.error(e)
  }
}

async function deleteAll() {
  if (!list.value.length) return
  if (!confirm('确定要删除全部通知吗？')) return
  try {
    await request.delete('/notifications/all')
    list.value = []
    unreadCount.value = 0
    emitChanged()
  } catch (e) {
    console.error(e)
  }
}

function handleClick(n) {
  if (!n.isRead) {
    request.patch(`/notifications/${n.id}/read`).catch(() => {})
    n.isRead = 1
    if (unreadCount.value > 0) unreadCount.value--
    emitChanged()
  }
  if (n.type === 'official') {
    scrollToSection('my-messages')
    return
  }
  if (n.relatedType === 'report') {
    if (userStore.isAdmin) {
      fetchReports()
      scrollToSection('reports')
    }
    return
  }
  if (n.dreamId) {
    router.push(`/dream/${n.dreamId}`)
  } else if (n.relatedType === 'shared_dream' && n.relatedId) {
    router.push({ path: '/community', query: { highlight: n.relatedId } })
  } else if (n.relatedType === 'comment' && n.relatedId) {
    router.push({ path: '/community' })
  }
}

async function doBroadcast() {
  if (!broadcastTitle.value.trim()) {
    broadcastMsg.value = '请输入标题'
    broadcastError.value = true
    return
  }
  broadcasting.value = true
  broadcastMsg.value = ''
  broadcastError.value = false
  try {
    const res = await request.post('/notifications/broadcast', {
      title: broadcastTitle.value.trim(),
      content: broadcastContent.value.trim()
    })
    broadcastMsg.value = res.message || '发送成功'
    broadcastTitle.value = ''
    broadcastContent.value = ''
  } catch (e) {
    broadcastMsg.value = (typeof e === 'string' ? e : e?.message) || '发送失败'
    broadcastError.value = true
  } finally {
    broadcasting.value = false
  }
}
</script>

<style scoped>
.notifications-page { max-width: 640px; display: flex; flex-direction: column; height: calc(100vh - 4rem - 3rem); min-height: 320px; }
.fixed-top {
  flex-shrink: 0;
  padding: 1rem 0;
  margin: 0 -1.5rem 0 -1.5rem;
  user-select: none;
}
.scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin-top: 0.5rem;
}
.notifications-page h1 { font-size: 1.5rem; color: #2c2c2c; margin-bottom: 0; }
.broadcast-section {
  background: linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,245,255,0.98) 100%);
  border: 1px solid rgba(107,91,149,0.2);
  border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;
  box-shadow: 0 4px 24px rgba(0,0,0,0.25); backdrop-filter: blur(8px);
}
.broadcast-section h2 { font-size: 1rem; color: #6b5b95; margin-bottom: 1rem; }
.reports-section {
  background: linear-gradient(135deg, rgba(255,248,248,0.98) 0%, rgba(255,245,245,0.98) 100%);
  border: 1px solid rgba(229,115,115,0.3);
  border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;
  box-shadow: 0 4px 24px rgba(0,0,0,0.25); backdrop-filter: blur(8px);
}
.reports-section h2 { font-size: 1rem; color: #c62828; margin-bottom: 1rem; }
.reports-list { display: flex; flex-direction: column; gap: 0.75rem; }
.report-item {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #e0e0e0;
}
.report-meta { font-size: 0.85rem; color: #666; margin-bottom: 0.5rem; }
.report-content { font-size: 0.9rem; color: #333; margin-bottom: 0.75rem; line-height: 1.5; }
.report-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.btn-danger { padding: 0.4rem 0.8rem; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.btn-danger:hover { background: #c82333; }
.btn-mute { padding: 0.4rem 0.8rem; background: #6b5b95; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.btn-mute:hover { background: #5a4a84; }
.broadcast-form .input, .broadcast-form .textarea {
  width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #ddd;
  border-radius: 8px; font-size: 0.95rem; margin-bottom: 0.75rem;
}
.broadcast-form .textarea { resize: vertical; min-height: 60px; }
.btn-primary {
  padding: 0.5rem 1rem; background: linear-gradient(135deg, #6b5b95, #8e7cc3);
  color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem;
  box-shadow: 0 2px 12px rgba(107,91,149,0.4); font-weight: 500;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.msg { margin-top: 0.5rem; font-size: 0.9rem; }
.msg.error { color: #c44; }

.list-section { background: rgba(255,255,255,0.98); border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.25); overflow: hidden; backdrop-filter: blur(8px); }
.list-header {
  padding: 0.75rem 1rem; border-bottom: 1px solid #eee;
  display: flex; justify-content: space-between; align-items: center;
  user-select: none;
}
.header-actions { display: flex; gap: 0.75rem; }
.link-btn { background: none; border: none; color: #6b5b95; font-size: 0.9rem; cursor: pointer; }
.link-btn:hover { text-decoration: underline; }
.item { position: relative; }
.item-delete {
  position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
  width: 24px; height: 24px; border: none; background: rgba(0,0,0,0.06);
  border-radius: 50%; cursor: pointer; font-size: 1.2rem; line-height: 1;
  color: #888; display: flex; align-items: center; justify-content: center;
  opacity: 0.7;
}
.item-delete:hover { background: #e74c3c; color: white; opacity: 1; }
.loading, .empty { padding: 2rem; text-align: center; color: #888; }
.list { }
.item {
  display: flex; gap: 1rem; padding: 1rem; border-bottom: 1px solid #f0f0f0;
  cursor: pointer; transition: background 0.15s;
}
.item:last-child { border-bottom: none; }
.item:hover { background: #f8f8f8; }
.item.unread { background: rgba(107,91,149,0.05); }
.item-type { font-size: 1.25rem; flex-shrink: 0; }
.item-type.comment { }
.item-type.official { }
.item-body { flex: 1; min-width: 0; }
.item-title { font-weight: 500; color: #333; margin-bottom: 0.25rem; }
.item-content { font-size: 0.9rem; color: #666; margin-bottom: 0.25rem; line-height: 1.5; }
.item-time { font-size: 0.8rem; color: #999; }
</style>
