<template>
  <div class="stats">
    <h1>我的梦境统计</h1>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="stats" class="content">
      <div class="stat-card">
        <h3>总记录数</h3>
        <p class="big">{{ stats.totalDreams }}</p>
      </div>
      <div v-if="Object.keys(stats.themeDistribution || {}).length" class="stat-card">
        <h3>主题分布</h3>
        <div class="theme-list">
          <div v-for="(count, name) in stats.themeDistribution" :key="name" class="theme-item">
            <span class="name">{{ name }}</span>
            <span class="count">{{ count }} 次</span>
          </div>
        </div>
      </div>
      <div v-if="Object.keys(stats.emotionDistribution || {}).length" class="stat-card">
        <h3>情绪分布</h3>
        <div class="theme-list">
          <div v-for="(count, name) in stats.emotionDistribution" :key="name" class="theme-item">
            <span class="name">{{ name }}</span>
            <span class="count">{{ count }} 次</span>
          </div>
        </div>
      </div>
      <div v-if="Object.keys(stats.monthlyRecords || {}).length" class="stat-card">
        <h3>月度记录</h3>
        <div class="theme-list">
          <div v-for="(count, month) in stats.monthlyRecords" :key="month" class="theme-item">
            <span class="name">{{ month }}</span>
            <span class="count">{{ count }} 条</span>
          </div>
        </div>
      </div>
      <div v-if="Object.keys(stats.themeDistribution || {}).length === 0 && Object.keys(stats.emotionDistribution || {}).length === 0 && stats.totalDreams === 0" class="empty">
        暂无记录，开始记录你的第一个梦吧
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../api/request'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
const stats = ref(null)
const loading = ref(true)

onMounted(async () => {
  if (!userStore.token) return
  try {
    stats.value = await request.get('/user/stats')
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.stats { padding: 0; }
.stats h1 { font-size: 1.5rem; margin-bottom: 1.5rem; }
.loading { text-align: center; padding: 3rem; color: #666; }
.content { display: flex; flex-direction: column; gap: 1.5rem; }
.stat-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-card h3 { font-size: 1rem; margin-bottom: 1rem; color: #2c2c2c; }
.big { font-size: 2rem; font-weight: bold; color: #6b5b95; }
.theme-list { display: flex; flex-direction: column; gap: 0.5rem; }
.theme-item { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0; }
.theme-item:last-child { border-bottom: none; }
.name { color: #333; }
.count { color: #888; font-size: 0.9rem; }
.empty { text-align: center; padding: 3rem; color: #888; }
</style>
