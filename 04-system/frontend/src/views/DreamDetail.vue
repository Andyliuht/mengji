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
        <div v-if="dream.coverImage" class="cover-image-wrap">
          <img :src="dream.coverImage" alt="梦境配图" class="cover-image" @click="previewSrc = dream.coverImage" />
        </div>
        <p class="content">{{ dream.content }}</p>
        <div v-if="!dream.isShared" class="image-action">
          <button
            v-if="!dream.coverImage"
            @click="generateImage"
            :disabled="imageLoading"
            class="btn-outline"
          >
            {{ imageLoading ? '生成中...' : '🖼 AI 生成配图' }}
          </button>
          <template v-else>
            <button @click="generateImage" :disabled="imageLoading" class="btn-outline btn-sm">
              {{ imageLoading ? '生成中...' : '重新生成' }}
            </button>
          </template>
        </div>
        <div class="meta">
          <template v-if="dream.tags">
            <span v-for="t in (dream.tags || '').split(',').map(s => s.trim()).filter(Boolean)" :key="t" class="meta-tag">{{ t }}</span>
          </template>
          <span v-if="dream.emotion" class="meta-emotion">{{ dream.emotion }}</span>
          <span v-if="dream.location || (dream.latitude != null && dream.longitude != null)" class="meta-location" :title="dream.location || `${dream.latitude?.toFixed(4)}°, ${dream.longitude?.toFixed(4)}°`">📍 {{ dream.location || `${dream.latitude?.toFixed(4)}°, ${dream.longitude?.toFixed(4)}°` }}</span>
          <span class="meta-date">📅 {{ formatDate(dream.createdAt) }}</span>
        </div>
      </div>
      <div class="sections">
        <section class="section">
          <h3>AI 解梦</h3>
          <div v-if="interpretation" class="interpretation">
            <p v-if="interpExpanded">{{ interpretation.content }}</p>
            <p v-else>{{ interpPreview }}</p>
            <button v-if="interpExpanded" type="button" class="btn-expand" @click="interpExpanded = false">
              收起全文
            </button>
            <button v-else-if="needInterpExpand" type="button" class="btn-expand" @click="interpExpanded = true">
              展开全文
            </button>
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
          <div v-else-if="similarSearched" class="similar-empty">
            <p>暂无相似梦境，可能是社区中还没有与你梦境主题相近的分享。</p>
            <router-link to="/community" class="link-community">去梦境社区看看 →</router-link>
          </div>
        </section>
        <section v-if="!dream.isShared" class="section">
          <h3>分享到社区</h3>
          <div class="share-btns">
            <button @click="shareDream(true)" class="btn-outline">匿名分享</button>
            <button @click="shareDream(false)" class="btn-primary">实名分享</button>
          </div>
        </section>
        <section v-if="dream.isShared" class="section feedback-section">
          <h3>互动反馈</h3>
          <div class="feedback-stats">
            👍 {{ dream.likeCount ?? 0 }} 点赞 · 💬 {{ dream.commentCount ?? 0 }} 评论
          </div>
          <div v-if="comments.length" class="comment-list">
            <div v-for="c in comments" :key="c.id" class="comment-item">
              <div class="comment-main">
                <span class="comment-author">{{ c.nickname }}</span>
                <span class="comment-content">{{ c.content }}</span>
                <span class="comment-time">{{ formatDate(c.createdAt) }}</span>
              </div>
              <button
                v-if="userStore.token"
                type="button"
                class="comment-like-btn"
                :class="{ liked: c.liked }"
                @click="toggleCommentLike(c)"
              >
                <span class="comment-like-icon">♥</span><span class="comment-like-num">{{ c.likeCount ?? 0 }}</span>
              </button>
            </div>
          </div>
          <p v-else-if="!commentsLoading && (dream.commentCount ?? 0) === 0" class="no-comments">暂无评论</p>
          <p v-else-if="commentsLoading" class="comments-loading">加载评论中...</p>
        </section>
      </div>
    </div>
    <div v-if="previewSrc" class="image-preview-overlay" @click.self="previewSrc = null">
      <img :src="previewSrc" alt="梦境配图" class="image-preview-img" />
      <button type="button" class="image-preview-close" @click="previewSrc = null" title="关闭">×</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '../api/request'
import { useUserStore } from '../stores/user'
import { formatDateTime } from '../utils/date'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const dream = ref(null)
const interpretation = ref(null)
const similar = ref([])
const similarSearched = ref(false)
const loading = ref(true)
const interpLoading = ref(false)
const similarLoading = ref(false)
const imageLoading = ref(false)
const previewSrc = ref(null)
const interpExpanded = ref(false)
const comments = ref([])
const commentsLoading = ref(false)

const INTERP_PREVIEW_LEN = 120
const interpPreview = computed(() => {
  const c = interpretation.value?.content || ''
  if (c.length <= INTERP_PREVIEW_LEN) return c
  return c.slice(0, INTERP_PREVIEW_LEN) + '...'
})
const needInterpExpand = computed(() => (interpretation.value?.content?.length || 0) > INTERP_PREVIEW_LEN)

watch(interpretation, () => { interpExpanded.value = false })

function closePreview(e) {
  if (e.key === 'Escape') previewSrc.value = null
}

onMounted(async () => {
  document.addEventListener('keydown', closePreview)
  try {
    dream.value = await request.get(`/dreams/${route.params.id}`)
    try {
      interpretation.value = await request.get(`/interpretation/${route.params.id}`)
    } catch (_) {}
    if (dream.value?.isShared && dream.value?.sharedDreamId) {
      commentsLoading.value = true
      try {
        comments.value = await request.get(`/community/${dream.value.sharedDreamId}/comments`)
      } catch (_) {}
      finally { commentsLoading.value = false }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', closePreview)
})

function formatDate(str) {
  return formatDateTime(str)
}

async function generateImage() {
  imageLoading.value = true
  try {
    const res = await request.post(`/dreams/${route.params.id}/generate-image`, {}, { timeout: 60000 })
    dream.value.coverImage = res.coverImage
  } catch (e) {
    alert((typeof e === 'string' ? e : e?.message) || '生成配图失败')
  } finally {
    imageLoading.value = false
  }
}

async function getInterpretation() {
  interpLoading.value = true
  try {
    // AI 解梦（尤其 Ollama 本地模型）可能需 30-90 秒，单独延长超时
    interpretation.value = await request.post(`/interpretation/${route.params.id}`, {}, { timeout: 90000 })
  } catch (e) {
    const msg = (typeof e === 'string' ? e : e?.message) || '解梦失败'
    alert(msg)
  } finally {
    interpLoading.value = false
  }
}

async function getSimilar() {
  similarLoading.value = true
  similarSearched.value = false
  try {
    similar.value = await request.get(`/interpretation/similar/${route.params.id}`)
    similarSearched.value = true
  } catch (e) {
    alert(e.message || '匹配失败')
  } finally {
    similarLoading.value = false
  }
}

async function shareDream(isAnonymous) {
  try {
    await request.post(`/community/share/${route.params.id}`, { isAnonymous })
    dream.value = await request.get(`/dreams/${route.params.id}`)
    if (dream.value?.sharedDreamId) {
      commentsLoading.value = true
      try {
        comments.value = await request.get(`/community/${dream.value.sharedDreamId}/comments`)
      } catch (_) {}
      finally { commentsLoading.value = false }
    }
    alert('分享成功')
  } catch (e) {
    alert((e && e.message) || '分享失败')
  }
}

async function toggleCommentLike(c) {
  if (!userStore.token) { alert('请先登录'); return }
  try {
    if (c.liked) {
      await request.delete(`/community/comments/${c.id}/like`)
      c.likeCount = Math.max(0, (c.likeCount ?? 0) - 1)
      c.liked = false
    } else {
      await request.post(`/community/comments/${c.id}/like`)
      c.likeCount = (c.likeCount ?? 0) + 1
      c.liked = true
    }
  } catch (e) {
    alert((e && e.message) || '操作失败')
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
.btn-outline { padding: 0.4rem 0.8rem; border: 1px solid rgba(255,255,255,0.6); border-radius: 6px; background: rgba(255,255,255,0.95); cursor: pointer; text-decoration: none; color: #444; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
.btn-danger { padding: 0.4rem 0.8rem; border: 1px solid #c44; color: #c44; border-radius: 6px; background: white; cursor: pointer; }
.dream-card { background: rgba(255,255,255,0.98); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 24px rgba(0,0,0,0.25); margin-bottom: 1.5rem; backdrop-filter: blur(8px); }
.cover-image-wrap { margin-bottom: 1rem; border-radius: 10px; overflow: hidden; max-width: 100%; background: #f5f5f5; display: flex; align-items: center; justify-content: center; }
.cover-image { display: block; max-width: 100%; max-height: 240px; object-fit: contain; cursor: pointer; transition: opacity 0.2s; }
.cover-image:hover { opacity: 0.9; }
.image-preview-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 2rem; }
.image-preview-img { max-width: 95%; max-height: 95%; object-fit: contain; border-radius: 8px; }
.image-preview-close { position: absolute; top: 1rem; right: 1rem; width: 40px; height: 40px; border: none; background: rgba(255,255,255,0.2); color: white; font-size: 1.5rem; border-radius: 50%; cursor: pointer; line-height: 1; }
.image-preview-close:hover { background: rgba(255,255,255,0.3); }
.image-action { margin-bottom: 0.75rem; }
.btn-sm { padding: 0.3rem 0.6rem; font-size: 0.85rem; }
.dream-card .content { line-height: 1.8; color: #333; white-space: pre-wrap; }
.meta { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee; display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; font-size: 0.85rem; color: #888; }
.meta-tag { padding: 0.2rem 0.5rem; background: rgba(107,91,149,0.08); color: #6b5b95; border-radius: 6px; }
.meta-emotion { font-size: 1.1rem; }
.meta-location { color: #666; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta-date { color: #999; margin-left: auto; }
.sections { display: flex; flex-direction: column; gap: 1.5rem; }
.section { background: rgba(255,255,255,0.98); border-radius: 12px; padding: 1.25rem; box-shadow: 0 4px 24px rgba(0,0,0,0.25); backdrop-filter: blur(8px); }
.section h3 { font-size: 1rem; margin-bottom: 0.75rem; color: #2c2c2c; }
.interpretation { background: #f8f6fc; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; }
.interpretation p { line-height: 1.7; color: #444; white-space: pre-wrap; margin-bottom: 0.5rem; }
.btn-expand { padding: 0.25rem 0.6rem; font-size: 0.85rem; color: #6b5b95; background: transparent; border: none; cursor: pointer; text-decoration: underline; }
.btn-expand:hover { color: #8e7cc3; }
.btn-primary { padding: 0.5rem 1rem; background: linear-gradient(135deg, #6b5b95, #8e7cc3); color: white; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 12px rgba(107,91,149,0.4); font-weight: 500; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.share-btns { display: flex; gap: 0.75rem; }
.similar-list { margin-top: 1rem; }
.similar-item { padding: 0.75rem; background: #f8f6fc; border-radius: 8px; margin-bottom: 0.5rem; }
.similar-item p { font-size: 0.9rem; color: #666; margin-bottom: 0.25rem; }
.similar-empty { margin-top: 1rem; padding: 1rem; background: #f8f6fc; border-radius: 8px; text-align: center; }
.similar-empty p { color: #666; margin-bottom: 0.75rem; font-size: 0.95rem; }
.link-community { color: #6b5b95; text-decoration: none; font-weight: 500; }
.link-community:hover { text-decoration: underline; }
.feedback-section { }
.feedback-stats { font-size: 0.95rem; color: #666; margin-bottom: 1rem; }
.comment-list { display: flex; flex-direction: column; gap: 0.75rem; }
.comment-item { padding: 0.75rem; background: #f8f6fc; border-radius: 8px; display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
.comment-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.25rem; }
.comment-author { font-weight: 500; color: #6b5b95; font-size: 0.9rem; }
.comment-content { color: #444; font-size: 0.95rem; line-height: 1.5; white-space: pre-wrap; }
.comment-time { font-size: 0.8rem; color: #999; }
.comment-like-btn { flex-shrink: 0; padding: 0.25rem 0.3rem; border: none; background: transparent; color: #999; cursor: pointer; transition: color 0.2s; display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; line-height: 1; }
.comment-like-btn:hover { color: #6b5b95; }
.comment-like-btn.liked { color: #c62828; }
.comment-like-icon, .comment-like-num { font-size: inherit; }
.no-comments, .comments-loading { color: #888; font-size: 0.9rem; margin-top: 0.5rem; }
</style>
