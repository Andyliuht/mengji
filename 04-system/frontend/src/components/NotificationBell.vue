<template>
  <div class="notification-bell" ref="containerRef">
    <button class="bell-btn" @click="toggle" aria-label="消息通知">
      <span class="bell-icon">🔔</span>
      <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>
    <div v-if="open" class="dropdown" @click.stop>
      <div class="dropdown-header">
        <span>消息通知</span>
        <div class="header-actions">
          <button v-if="list.length" class="link-btn" @click="deleteAll">删除全部</button>
          <button v-if="unreadCount > 0" class="link-btn" @click="markAllRead">全部已读</button>
        </div>
      </div>
      <div v-if="loading" class="dropdown-loading">加载中...</div>
      <div v-else-if="!list.length" class="dropdown-empty">暂无消息</div>
      <div v-else class="dropdown-list">
        <div
          v-for="n in list"
          :key="n.id"
          class="dropdown-item"
          :class="{ unread: !n.isRead }"
          @click="handleClick(n)"
        >
          <div class="item-main">
            <div class="item-title">{{ n.title }}</div>
            <div v-if="n.content" class="item-content">{{ n.content }}</div>
            <div class="item-time">{{ formatDate(n.createdAt) }}</div>
          </div>
          <button class="item-delete" @click.stop="deleteOne(n)" title="删除">×</button>
        </div>
      </div>
      <router-link to="/notifications" class="dropdown-footer" @click="open = false">查看全部</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '../api/request'
import { useUserStore } from '../stores/user'
import { formatDate } from '../utils/date'

const router = useRouter()
const userStore = useUserStore()
const open = ref(false)
const list = ref([])
const unreadCount = ref(0)
const loading = ref(false)
const containerRef = ref(null)

async function fetchList() {
  if (!open.value) return
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

function toggle() {
  open.value = !open.value
  if (open.value) {
    fetchList()
    fetchUnreadCount()
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
  open.value = false
  if (n.type === 'official') {
    router.push({ path: '/notifications', query: { section: 'my-messages' } })
  } else if (n.relatedType === 'report' && userStore.isAdmin) {
    router.push({ path: '/notifications', query: { section: 'reports' } })
  } else if (n.dreamId) {
    router.push(`/dream/${n.dreamId}`)
  } else if (n.relatedType === 'shared_dream' && n.relatedId) {
    router.push({ path: '/community', query: { highlight: n.relatedId } })
  } else if (n.relatedType === 'comment' && n.relatedId) {
    router.push({ path: '/community' })
  }
}

function handleClickOutside(e) {
  if (containerRef.value && !containerRef.value.contains(e.target)) {
    open.value = false
  }
}

function emitChanged() {
  window.dispatchEvent(new CustomEvent('notifications-changed'))
}

function onNotificationsChanged() {
  fetchUnreadCount()
  if (open.value) fetchList()
}

onMounted(() => {
  fetchUnreadCount()
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('notifications-changed', onNotificationsChanged)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('notifications-changed', onNotificationsChanged)
})
</script>

<style scoped>
.notification-bell { position: relative; }
.bell-btn {
  background: none; border: none; cursor: pointer; padding: 0.35rem 0.5rem;
  color: rgba(255,255,255,0.95); font-size: 1.25rem; position: relative;
}
.bell-btn:hover { opacity: 0.9; }
.badge {
  position: absolute; top: 0; right: 0; min-width: 1.1rem; height: 1.1rem;
  background: #e74c3c; color: white; font-size: 0.65rem; font-weight: 600;
  border-radius: 10px; display: flex; align-items: center; justify-content: center;
  padding: 0 0.25rem; line-height: 1;
}
.dropdown {
  position: absolute; top: 100%; right: 0; margin-top: 0.5rem;
  width: 340px; max-height: 400px; background: white; border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15); z-index: 100;
  display: flex; flex-direction: column;
}
.dropdown-header {
  padding: 0.75rem 1rem; border-bottom: 1px solid #eee;
  display: flex; justify-content: space-between; align-items: center;
}
.dropdown-header span { font-weight: 600; color: #333; }
.header-actions { display: flex; gap: 0.5rem; }
.link-btn { background: none; border: none; color: #6b5b95; font-size: 0.85rem; cursor: pointer; }
.link-btn:hover { text-decoration: underline; }
.dropdown-loading, .dropdown-empty { padding: 2rem; text-align: center; color: #888; font-size: 0.9rem; }
.dropdown-list { overflow-y: auto; max-height: 300px; }
.dropdown-item {
  padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; cursor: pointer;
  transition: background 0.15s; display: flex; align-items: flex-start; gap: 0.5rem;
}
.dropdown-item:hover { background: #f8f8f8; }
.dropdown-item.unread { background: rgba(107,91,149,0.06); }
.item-main { flex: 1; min-width: 0; }
.item-title { font-weight: 500; color: #333; font-size: 0.95rem; margin-bottom: 0.25rem; }
.item-content { font-size: 0.85rem; color: #666; margin-bottom: 0.25rem; line-height: 1.4; }
.item-time { font-size: 0.75rem; color: #999; }
.item-delete {
  flex-shrink: 0; width: 22px; height: 22px; border: none;
  background: rgba(0,0,0,0.06); border-radius: 50%; cursor: pointer;
  font-size: 1.1rem; line-height: 1; color: #888; display: flex; align-items: center; justify-content: center;
  opacity: 0.7;
}
.item-delete:hover { background: #e74c3c; color: white; opacity: 1; }
.dropdown-footer {
  padding: 0.6rem 1rem; text-align: center; color: #3d2a5c !important;
  font-size: 0.9rem; text-decoration: none; border-top: 1px solid #ddd;
  background: #f0ecf8; font-weight: 500;
}
.dropdown-footer:hover { background: #e8e0f4; color: #5a4a84 !important; }
</style>
