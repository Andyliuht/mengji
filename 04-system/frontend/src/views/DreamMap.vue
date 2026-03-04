<template>
  <div class="dream-map-page">
    <div class="fixed-top">
      <h1>地图</h1>
    </div>
    <div class="map-wrap">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="mapError" class="map-error">{{ mapError }}</div>
      <div v-else class="map-container">
        <div ref="chartRef" class="chart"></div>
        <div v-if="!hasMarkers" class="map-empty-overlay">近 24 小时暂无带地点的分享梦境</div>
      </div>
    </div>
    <div v-if="selectedDream" class="dream-popup-overlay" @click.self="selectedDream = null">
      <div class="dream-popup">
        <button type="button" class="popup-close" @click="selectedDream = null" title="关闭">×</button>
        <div class="popup-header">
          <span v-if="selectedDream.emotion" class="popup-emotion">{{ selectedDream.emotion }}</span>
          <span class="popup-author">{{ selectedDream.authorName }}</span>
          <span class="popup-date">{{ formatDate(selectedDream.createdAt) }}</span>
        </div>
        <p v-if="selectedDream.location || (selectedDream.latitude != null && selectedDream.longitude != null)" class="popup-location">📍 {{ selectedDream.location || `${selectedDream.latitude?.toFixed(4)}°, ${selectedDream.longitude?.toFixed(4)}°` }}</p>
        <p class="popup-content">{{ selectedDream.content }}</p>
        <router-link
          v-if="userStore.token && selectedDream.userId === userStore.userId"
          :to="`/dream/${selectedDream.dreamId}`"
          class="popup-link"
          @click="selectedDream = null"
        >
          查看详情 →
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import request from '../api/request'
import { useUserStore } from '../stores/user'
import { formatDate } from '../utils/date'

const userStore = useUserStore()
const chartRef = ref(null)
const loading = ref(true)
const mapError = ref('')
const selectedDream = ref(null)
const hasMarkers = ref(false)
const dreamsOnMap = ref([])
let chart = null

async function loadChinaMap() {
  const base = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api'
  const res = await fetch(`${base}/geo/china-map`)
  if (!res.ok) throw new Error('地图数据加载失败')
  return await res.json()
}

async function initMap() {
  loading.value = true
  mapError.value = ''
  try {
    const [geoJson, dreams] = await Promise.all([
      loadChinaMap(),
      request.get('/community/dream-map')
    ])
    echarts.registerMap('china', geoJson)

    const filtered = dreams.filter(d => d.latitude != null && d.longitude != null)
    hasMarkers.value = filtered.length > 0
    dreamsOnMap.value = filtered
    const scatterData = filtered.map(d => ({
      value: [d.longitude, d.latitude],
      dream: d,
      symbol: 'circle',
      symbolSize: 28
    }))

    loading.value = false
    await nextTick()
    if (!chartRef.value) {
      mapError.value = '地图容器加载失败'
      return
    }

    chart = echarts.init(chartRef.value)
    chart.setOption({
      backgroundColor: 'transparent',
      geo: {
        map: 'china',
        roam: true,
        zoom: 1.2,
        center: [105, 36],
        itemStyle: {
          areaColor: 'rgba(60,30,90,0.4)',
          borderColor: 'rgba(150,120,200,0.6)',
          borderWidth: 1
        },
        emphasis: {
          itemStyle: { areaColor: 'rgba(100,70,140,0.6)' },
          label: { show: false }
        }
      },
      series: [{
        type: 'scatter',
        coordinateSystem: 'geo',
        data: scatterData,
        symbolSize: 24,
        itemStyle: {
          color: 'rgba(180,150,220,0.9)',
          borderColor: 'rgba(255,255,255,0.8)',
          borderWidth: 1
        },
        emphasis: { scale: 1.3, itemStyle: { borderWidth: 2 } },
        label: {
          show: true,
          formatter: (params) => params.data.dream?.emotion || '😶',
          fontSize: 18,
          offset: [0, -2]
        },
        labelLayout: { hideOverlap: true }
      }]
    })

    chart.on('click', async (params) => {
      if (params.componentType === 'series' && params.data?.dream) {
        const dream = params.data.dream
        selectDream(dream)
        if (userStore.token && dream.sharedId) {
          try {
            await request.post(`/community/dream-map/${dream.sharedId}/viewed`)
            await refreshDreams()
          } catch (_) {}
        }
      }
    })

    window.addEventListener('resize', handleResize)
  } catch (e) {
    mapError.value = e.message || '加载失败'
    loading.value = false
  }
}

function zoomToDream(dream) {
  if (!chart || dream.latitude == null || dream.longitude == null) return
  chart.setOption({
    geo: { center: [dream.longitude, dream.latitude], zoom: 4 }
  })
}

function selectDream(dream) {
  selectedDream.value = dream
  zoomToDream(dream)
}

async function refreshDreams() {
  if (!chart) return
  try {
    const dreams = await request.get('/community/dream-map')
    const filtered = dreams.filter(d => d.latitude != null && d.longitude != null)
    hasMarkers.value = filtered.length > 0
    dreamsOnMap.value = filtered
    const scatterData = filtered.map(d => ({
      value: [d.longitude, d.latitude],
      dream: d,
      symbol: 'circle',
      symbolSize: 28
    }))
    chart.setOption({ series: [{ data: scatterData }] })
  } catch (_) {}
}

function handleResize() {
  chart?.resize()
}

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.dream-map-page {
  display: flex;
  flex-direction: column;
  min-height: 60vh;
}
.fixed-top {
  margin-bottom: 1rem;
  user-select: none;
}
.fixed-top h1 {
  font-size: 1.5rem;
}
.map-wrap {
  flex: 1;
  min-height: 480px;
  user-select: none;
  background: rgba(255,255,255,0.06);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255,255,255,0.1);
}
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 480px;
}
.chart {
  width: 100%;
  height: 100%;
  min-height: 480px;
}
.map-empty-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.3);
  color: rgba(255,255,255,0.95);
  font-size: 1rem;
  pointer-events: none;
}
.loading, .map-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.95);
  font-size: 1rem;
}
.dream-popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
.dream-popup {
  background: rgba(255,255,255,0.98);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 420px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  position: relative;
}
.popup-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #888;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}
.popup-close:hover {
  color: #333;
}
.popup-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.popup-emotion {
  font-size: 1.5rem;
}
.popup-author {
  font-weight: 500;
  color: #6b5b95;
}
.popup-date {
  margin-left: auto;
  font-size: 0.85rem;
  color: #999;
}
.popup-location {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}
.popup-content {
  color: #333;
  line-height: 1.7;
  white-space: pre-wrap;
  margin-bottom: 1rem;
}
.popup-link {
  color: #6b5b95;
  text-decoration: none;
  font-weight: 500;
}
.popup-link:hover {
  text-decoration: underline;
}
</style>
