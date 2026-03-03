<template>
  <div class="community">
    <h1>梦境社区</h1>
    <p class="subtitle">发现他人分享的梦境</p>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else class="cards">
      <div v-for="item in list" :key="item.id" class="card">
        <p class="content">{{ item.content }}</p>
        <div class="meta">
          <span v-if="item.tags" class="tags">{{ item.tags }}</span>
          <span v-if="item.emotion" class="emotion">{{ item.emotion }}</span>
          <span class="author">{{ item.authorName }}</span>
          <span class="date">{{ formatDate(item.createdAt) }}</span>
        </div>
        <div class="actions">
          <button @click="toggleLike(item)" class="like-btn">
            {{ item.liked ? '♥' : '♡' }} {{ item.likeCount }}
          </button>
          <button @click="showComments(item)" class="comment-btn">评论 {{ item.commentCount }}</button>
        </div>
        <div v-if="item.showComments" class="comments">
          <div v-for="c in item.comments" :key="c.id" class="comment">
            <span class="comment-author">{{ c.nickname }}</span>: {{ c.content }}
          </div>
          <div v-if="userStore.token" class="add-comment">
            <input v-model="item.newComment" placeholder="写评论..." @keyup.enter="submitComment(item)" />
            <button @click="submitComment(item)">发送</button>
          </div>
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
const list = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    list.value = await request.get('/community/shared')
    list.value.forEach(i => { i.showComments = false; i.comments = []; i.newComment = ''; i.liked = false })
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

async function toggleLike(item) {
  if (!userStore.token) { alert('请先登录'); return }
  try {
    if (item.liked) {
      await request.delete(`/community/${item.id}/like`)
      item.likeCount--
      item.liked = false
    } else {
      await request.post(`/community/${item.id}/like`)
      item.likeCount++
      item.liked = true
    }
  } catch (e) {
    alert(e.message || '操作失败')
  }
}

async function showComments(item) {
  if (item.showComments) {
    item.showComments = false
    return
  }
  try {
    item.comments = await request.get(`/community/${item.id}/comments`)
    item.showComments = true
  } catch (e) {
    if (e.message) alert(e.message)
  }
}

async function submitComment(item) {
  if (!item.newComment?.trim()) return
  try {
    const c = await request.post(`/community/${item.id}/comment`, { content: item.newComment.trim() })
    item.comments.unshift(c)
    item.commentCount++
    item.newComment = ''
  } catch (e) {
    alert(e.message || '评论失败')
  }
}
</script>

<style scoped>
.community { padding: 0; }
.community h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
.subtitle { color: #666; font-size: 0.9rem; margin-bottom: 1.5rem; }
.loading { text-align: center; padding: 3rem; color: #666; }
.cards { display: flex; flex-direction: column; gap: 1rem; }
.card { background: white; border-radius: 12px; padding: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.card .content { line-height: 1.6; color: #333; margin-bottom: 0.75rem; }
.meta { font-size: 0.85rem; color: #888; margin-bottom: 0.75rem; }
.actions { display: flex; gap: 1rem; }
.like-btn, .comment-btn { background: none; border: none; color: #6b5b95; cursor: pointer; font-size: 0.9rem; }
.comments { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee; }
.comment { font-size: 0.9rem; margin-bottom: 0.5rem; color: #555; }
.add-comment { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
.add-comment input { flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; }
.add-comment button { padding: 0.5rem 1rem; background: #6b5b95; color: white; border: none; border-radius: 6px; cursor: pointer; }
</style>
