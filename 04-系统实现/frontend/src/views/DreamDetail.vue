<template>
  <div class="dream-detail">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="dream" class="content">
      <div class="header-row">
        <router-link to="/" class="back">← 返回</router-link>
        <div class="actions">
          <router-link v-if="!dream.isShared" :to="`/dream/${dream.id}/edit`" class="btn-outline">编辑</router-link>
          <button v-if="!dream.isShared" @click="deleteDream" class="btn-danger">删除</button>
        </div>
      </div>
      <div class="dream-card">
        <p class="content">{{ dream.content }}</p>
        <div class="meta">
          <span v-if="dream.tags" class="tags">{{ dream.tags }}</span>
          <span v-if="dream.emotion" class="emotion">{{ dream.emotion }}</span>
          <span v-if="dream.sleepQuality" class="sleep">睡眠质量: {{ dream.sleepQuality }}/5</span>
          <span class="date">{{ formatDate(dream.createdAt) }}</span>
        </div>
      </div>
      <div class="sections">
        <section class="section">
          <h3>AI 解梦</h3>
          <div v-if="interpretation" class="interpretation">
            <p>{{ interpretation.content }}</p>
          </div>
          <button v-else @click="getInterpretation" :disabled="interpLoading" class="btn-primary">
            {{ interpLoading ? '解析中...' : '获取 AI 解梦' }}
          </button>
        </section>
        <section class="section">
          <h3>相似梦境</h3>
          <button @click="getSimilar" :disabled="similarLoading" class="btn-outline">
            {{ similarLoading ? '匹配中...' : '查找相似梦境' }}
          </button>
          <div v-if="similar.length" class="similar-list">
            <div v-for="s in similar" :key="s.id" class="similar-item">
              <p>{{ s.content?.slice(0, 80) }}...</p>
              <span class="tags">{{ s.tags }}</span>
            </div>
          </div>
        </section>
        <section v-if="!dream.isShared" class="section">
          <h3>分享到社区</h3>
          <button @click="shareDream" class="btn-primary">匿名分享</button>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '../api/request'
import { useUserStore } from '../stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const dream = ref(null)
const interpretation = ref(null)
const similar = ref([])
const loading = ref(true)
const interpLoading = ref(false)
const similarLoading = ref(false)

onMounted(async () => {
  try {
    dream.value = await request.get(`/dreams/${route.params.id}`)
    try {
      interpretation.value = await request.get(`/interpretation/${route.params.id}`)
    } catch (_) {}
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleString('zh-CN')
}

async function getInterpretation() {
  interpLoading.value = true
  try {
    interpretation.value = await request.post(`/interpretation/${route.params.id}`)
  } catch (e) {
    alert(e.message || '解梦失败')
  } finally {
    interpLoading.value = false
  }
}

async function getSimilar() {
  similarLoading.value = true
  try {
    similar.value = await request.get(`/interpretation/similar/${route.params.id}`)
  } catch (e) {
    alert(e.message || '匹配失败')
  } finally {
    similarLoading.value = false
  }
}

async function shareDream() {
  try {
    await request.post(`/community/share/${route.params.id}`, { isAnonymous: true })
    dream.value.isShared = 1
    alert('分享成功')
  } catch (e) {
    alert(e.message || '分享失败')
  }
}

async function deleteDream() {
  if (!confirm('确定要删除这条梦境吗？')) return
  try {
    await request.delete(`/dreams/${route.params.id}`)
    router.push('/')
  } catch (e) {
    alert(e.message || '删除失败')
  }
}
</script>

<style scoped>
.dream-detail { padding: 0; }
.loading { text-align: center; padding: 3rem; color: #666; }
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.back { color: #6b5b95; text-decoration: none; }
.actions { display: flex; gap: 0.5rem; }
.btn-outline { padding: 0.4rem 0.8rem; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; text-decoration: none; color: #666; }
.btn-danger { padding: 0.4rem 0.8rem; border: 1px solid #c44; color: #c44; border-radius: 6px; background: white; cursor: pointer; }
.dream-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 1.5rem; }
.dream-card .content { line-height: 1.8; color: #333; white-space: pre-wrap; }
.meta { margin-top: 1rem; font-size: 0.9rem; color: #888; }
.sections { display: flex; flex-direction: column; gap: 1.5rem; }
.section { background: white; border-radius: 12px; padding: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.section h3 { font-size: 1rem; margin-bottom: 0.75rem; color: #2c2c2c; }
.interpretation { background: #f8f6fc; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; }
.interpretation p { line-height: 1.7; color: #444; white-space: pre-wrap; }
.btn-primary { padding: 0.5rem 1rem; background: linear-gradient(135deg, #6b5b95, #8e7cc3); color: white; border: none; border-radius: 8px; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.similar-list { margin-top: 1rem; }
.similar-item { padding: 0.75rem; background: #f8f6fc; border-radius: 8px; margin-bottom: 0.5rem; }
.similar-item p { font-size: 0.9rem; color: #666; margin-bottom: 0.25rem; }
</style>
