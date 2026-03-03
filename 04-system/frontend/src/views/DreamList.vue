<template>
  <div class="dream-list">
    <div class="header-row">
      <h1>我的梦境</h1>
      <router-link to="/dream/new" class="btn-primary">记录新梦境</router-link>
    </div>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="dreams.length === 0" class="empty">
      <p>还没有记录过梦境</p>
      <router-link to="/dream/new" class="btn-primary">记录第一个梦</router-link>
    </div>
    <div v-else class="cards">
      <div v-for="d in dreams" :key="d.id" class="card">
        <div class="card-content">
          <p class="content">{{ d.content.slice(0, 100) }}{{ d.content.length > 100 ? '...' : '' }}</p>
          <div class="meta">
            <span v-if="d.tags" class="tags">{{ d.tags }}</span>
            <span v-if="d.emotion" class="emotion">{{ d.emotion }}</span>
            <span class="date">{{ formatDate(d.createdAt) }}</span>
          </div>
        </div>
        <div class="card-actions">
          <router-link :to="`/dream/${d.id}`" class="btn-link">查看</router-link>
          <span v-if="d.isShared" class="badge">已分享</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../api/request'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
const dreams = ref([])
const loading = ref(true)

onMounted(async () => {
  if (!userStore.token) return
  try {
    dreams.value = await request.get('/dreams')
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

function formatDate(str) {
  if (!str) return ''
  const d = new Date(str)
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.dream-list { padding: 0; }
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.header-row h1 { font-size: 1.5rem; color: #2c2c2c; }
.btn-primary { padding: 0.5rem 1rem; background: linear-gradient(135deg, #6b5b95, #8e7cc3); color: white; border-radius: 8px; text-decoration: none; font-size: 0.95rem; }
.btn-primary:hover { opacity: 0.95; }
.loading, .empty { text-align: center; padding: 3rem; color: #666; }
.empty .btn-primary { display: inline-block; margin-top: 1rem; }
.cards { display: flex; flex-direction: column; gap: 1rem; }
.card { background: white; border-radius: 12px; padding: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: flex-start; }
.card-content { flex: 1; }
.card-content .content { color: #444; line-height: 1.6; margin-bottom: 0.5rem; }
.meta { font-size: 0.85rem; color: #888; }
.tags { margin-right: 0.5rem; }
.emotion { margin-right: 0.5rem; }
.card-actions { display: flex; gap: 0.5rem; align-items: center; }
.btn-link { color: #6b5b95; text-decoration: none; font-size: 0.9rem; }
.btn-link:hover { text-decoration: underline; }
.badge { font-size: 0.75rem; background: #e8e0f0; color: #6b5b95; padding: 0.2rem 0.5rem; border-radius: 4px; }
</style>
