<template>
  <div class="stats">
    <div class="fixed-top">
      <h1>我的统计</h1>
    </div>
    <div class="scroll-area">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="stats" class="content">
      <div class="stat-card calendar-card">
        <h3>情绪日历</h3>
        <div class="calendar-nav">
          <button type="button" class="nav-btn" @click="prevMonth">‹</button>
          <span class="calendar-title">{{ displayYear }}年{{ displayMonth }}月</span>
          <button type="button" class="nav-btn" @click="nextMonth">›</button>
        </div>
        <div class="calendar-grid">
          <div v-for="w in 7" :key="w" class="calendar-weekday">{{ weekdays[w - 1] }}</div>
          <template v-for="(cell, i) in calendarCells" :key="i">
            <div
              v-if="cell.empty"
              class="calendar-cell empty"
            ></div>
            <div
              v-else
              class="calendar-cell"
              :class="{ today: cell.isToday }"
              :style="cell.bgColor ? { background: cell.bgColor } : {}"
              :title="getDayTooltip(cell.dateStr)"
            >
              <span class="cell-date">{{ cell.day }}</span>
              <div v-if="cell.emotions && Object.keys(cell.emotions).length" class="cell-emotions">
                <span
                  v-for="(cnt, emo) in cell.emotions"
                  :key="emo"
                  class="emotion-emoji"
                  :title="`${emo} ${cnt}次`"
                >{{ emo }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
      <div class="stat-card">
        <h3>总记录数</h3>
        <div class="stat-breakdown">
          <div class="stat-item">
            <span class="stat-label">梦境记录</span>
            <span class="stat-value">{{ stats.totalDreams }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">获赞总数</span>
            <span class="stat-value">{{ stats.totalLikes ?? 0 }}</span>
          </div>
        </div>
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import request from '../api/request'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
const stats = ref(null)
const loading = ref(true)
const displayYear = ref(new Date().getFullYear())
const displayMonth = ref(new Date().getMonth() + 1)

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

// 情绪 → 日历格子背景色（高区分度）
const EMOTION_BG = {
  '😊': '#ffdfd4', '😄': '#ffdfd4', '😁': '#ffdfd4', '😇': '#ffdfd4', '🥰': '#ffdfd4',
  '😢': '#b8c8f8', '😭': '#b8c8f8', '😔': '#b8c8f8',
  '😰': '#e0c4ff', '😨': '#e0c4ff', '😱': '#e0c4ff',
  '😤': '#ffb8b8', '😠': '#ffb8b8', '😡': '#ffb8b8',
  '😶': '#d8d4cc', '😵': '#d8d4cc', '🤔': '#d8d4cc',
  '😌': '#a8e8c8', '😴': '#a8e8c8', '🥱': '#a8e8c8', '😓': '#a8e8c8',
  '🤯': '#fff0a8', '😲': '#fff0a8', '😮': '#fff0a8',
  '无': '#e0e0e0'
}

function prevMonth() {
  if (displayMonth.value <= 1) {
    displayYear.value--
    displayMonth.value = 12
  } else {
    displayMonth.value--
  }
}

function nextMonth() {
  if (displayMonth.value >= 12) {
    displayYear.value++
    displayMonth.value = 1
  } else {
    displayMonth.value++
  }
}

const calendarCells = computed(() => {
  if (!stats.value?.dailyEmotions) return []
  const year = displayYear.value
  const month = displayMonth.value
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  const firstWeekday = first.getDay()
  const daysInMonth = last.getDate()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const cells = []
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ empty: true })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const emotions = stats.value.dailyEmotions[dateStr] || null
    const dominantEmo = emotions && Object.keys(emotions).length
      ? Object.entries(emotions).sort((a, b) => b[1] - a[1])[0][0]
      : null
    cells.push({
      empty: false,
      day: d,
      dateStr,
      emotions,
      dominantEmo,
      bgColor: EMOTION_BG[dominantEmo] || (dominantEmo ? EMOTION_BG['无'] : null),
      isToday: dateStr === todayStr
    })
  }
  return cells
})

function getDayTooltip(dateStr) {
  const emotions = stats.value?.dailyEmotions?.[dateStr]
  if (!emotions || !Object.keys(emotions).length) return dateStr
  return dateStr + '\n' + Object.entries(emotions).map(([e, c]) => `${e} ${c}次`).join('\n')
}

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
.stats { padding: 0; display: flex; flex-direction: column; height: calc(100vh - 4rem - 3rem); min-height: 320px; }
.fixed-top {
  flex-shrink: 0;
  padding: 1rem 1.5rem 1rem;
  padding-top: 1.5rem;
  margin: 0 -1.5rem 0 -1.5rem;
  user-select: none;
}
.scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin-top: 0.5rem;
}
.stats h1 { font-size: 1.5rem; margin-bottom: 0; }
.loading { text-align: center; padding: 3rem; color: #666; }
.content { display: flex; flex-direction: column; gap: 1.5rem; }
.stat-card { background: rgba(255,255,255,0.98); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 24px rgba(0,0,0,0.25); backdrop-filter: blur(8px); user-select: none; }
.stat-card h3 { font-size: 1rem; margin-bottom: 1rem; color: #2c2c2c; }
.big { font-size: 2rem; font-weight: bold; color: #6b5b95; }
.stat-breakdown { display: grid; grid-template-columns: 1fr 1fr; }
.stat-item { display: flex; flex-direction: column; gap: 0.25rem; }
.stat-item:last-child { justify-self: start; }
.stat-label { font-size: 0.9rem; color: #666; }
.stat-value { font-size: 1.75rem; font-weight: bold; color: #6b5b95; }
.theme-list { display: flex; flex-direction: column; gap: 0.5rem; }
.theme-item { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0; }
.theme-item:last-child { border-bottom: none; }
.name { color: #333; }
.count { color: #888; font-size: 0.9rem; }
.empty { text-align: center; padding: 3rem; color: #888; }

/* 情绪日历 */
.calendar-card { padding: 1.25rem; user-select: none; }
.calendar-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.nav-btn { width: 32px; height: 32px; border: 1px solid #ddd; border-radius: 8px; background: white; cursor: pointer; font-size: 1.2rem; color: #666; display: flex; align-items: center; justify-content: center; }
.nav-btn:hover { border-color: #8e7cc3; color: #6b5b95; background: #f8f6fc; }
.calendar-title { font-weight: 600; color: #333; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.calendar-weekday { font-size: 0.75rem; color: #888; text-align: center; padding: 0.25rem 0; }
.calendar-cell { min-height: 48px; padding: 4px; border-radius: 8px; background: #f8f8f8; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.calendar-cell.empty { background: transparent; }
.calendar-cell.today { font-weight: 600; color: #6b5b95; box-shadow: inset 0 0 0 2px rgba(107,91,149,0.5); }
.cell-date { font-size: 0.85rem; margin-bottom: 2px; }
.cell-emotions { display: flex; flex-wrap: wrap; gap: 2px; justify-content: center; font-size: 1rem; }
.emotion-emoji { line-height: 1; }
</style>
