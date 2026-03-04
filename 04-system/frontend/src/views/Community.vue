<template>
  <div class="community">
    <div class="fixed-top">
      <h1>梦境社区</h1>
      <p class="subtitle">发现他人分享的梦境</p>
    </div>
    <div class="scroll-area">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else class="cards">
        <div v-for="item in list" :key="item.id" class="card" :class="getCardTheme(item)">
          <div class="card-body">
          <img v-if="item.coverImage" :src="item.coverImage" alt="" class="card-cover" @click="previewImage(item.coverImage)" />
          <p class="content">{{ (item.content || '').length > 150 ? (item.content || '').slice(0, 150) + '...' : (item.content || '') }}</p>
          <div class="meta-row">
            <span v-if="item.emotion" class="meta-item emotion">{{ item.emotion }}</span>
            <span v-if="item.tags" class="meta-item tags">{{ item.tags }}</span>
          </div>
          <div class="meta-footer">
            <span class="author">{{ item.authorName }}</span>
            <span class="date">{{ formatDate(item.createdAt) }}</span>
            </div>
          </div>
          <div class="actions">
          <button @click="toggleLike(item)" class="action-btn like-btn" :class="{ liked: item.liked }">
            <span class="like-icon">♥</span><span class="like-num">{{ item.likeCount }}</span>
          </button>
          <button @click="showComments(item)" class="action-btn comment-btn">
            <span class="comment-icon">💬</span><span class="comment-num">{{ item.commentCount }}</span>
          </button>
          <button v-if="userStore.token && item.userId !== userStore.userId" @click="reportDream(item)" class="action-btn report-btn" title="举报">⚠️ 举报</button>
          </div>
          <div v-if="item.showComments" class="comments-panel">
          <div class="comments-title">评论</div>
          <div v-for="c in item.comments" :key="c.id" class="comment-item">
            <div class="comment-main">
              <span class="comment-author">{{ c.nickname }}</span>
              <span class="comment-content">{{ c.content }}</span>
            </div>
            <button
              v-if="userStore.token"
              type="button"
              class="comment-like-btn"
              :class="{ liked: c.liked }"
              @click.stop="toggleCommentLike(item, c)"
            >
              <span class="comment-like-icon">♥</span><span class="comment-like-num">{{ c.likeCount ?? 0 }}</span>
            </button>
          </div>
          <div v-if="userStore.token" class="add-comment">
            <div class="comment-input-wrap">
              <input
                :ref="el => setCommentInputRef(item.id, el)"
                v-model="item.newComment"
                placeholder="写一条评论，支持文字和表情..."
                @keyup.enter="submitComment(item)"
              />
              <div class="emoji-picker-wrap" :ref="el => setEmojiWrapRef(item.id, el)">
                <button type="button" class="emoji-btn" :class="{ active: openEmojiId === item.id }" @click.stop="toggleEmoji(item)" title="插入表情">😀</button>
                <div v-show="openEmojiId === item.id" class="emoji-dropdown">
                  <button
                    v-for="e in commentEmojis"
                    :key="e"
                    type="button"
                    class="emoji-item"
                    @click.stop="insertEmoji(item, e)"
                  >{{ e }}</button>
                </div>
              </div>
            </div>
            <button @click="submitComment(item)" class="send-btn">发送</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="previewSrc" class="image-preview-overlay" @click.self="previewSrc = null">
      <img :src="previewSrc" alt="梦境配图" class="image-preview-img" />
      <button type="button" class="image-preview-close" @click="previewSrc = null" title="关闭">×</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import request from '../api/request'
import { useUserStore } from '../stores/user'
import { formatDate as formatDateUtil } from '../utils/date'

const route = useRoute()
const userStore = useUserStore()
const list = ref([])
const loading = ref(true)
const openEmojiId = ref(null)
const previewSrc = ref(null)

function previewImage(src) {
  previewSrc.value = src
}

function closePreview(e) {
  if (e.key === 'Escape') previewSrc.value = null
}
const commentInputRefs = {}
const commentEmojis = [
  '😀', '😊', '😂', '😍', '😭', '👍', '👏', '🙏', '❤️', '😘', '😅', '😢', '🤔', '😴', '🎉', '😱', '😡', '😌', '🥰', '😇', '💪', '✨', '🔥', '💯',
  '😄', '😁', '🤣', '😆', '😉', '😎', '🥳', '😋', '🤗', '😙', '😚', '🥲', '😤', '😠', '🤬', '😈', '👻', '💀', '🤡', '👽', '👾',
  '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '🙌', '👐', '🤲', '🤝',
  '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '❣️', '💔',
  '⭐', '🌟', '💫', '✅', '❌', '❗', '❓', '💡', '🎯', '🏆', '🎊', '🎈', '🎁', '🎀',
  '🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🦄', '🐲',
  '🌸', '🌺', '🌻', '🌹', '🌷', '💐', '🍀', '🌿', '🍃', '🌱', '🌾', '☀️', '🌙', '🌈', '☁️',
  '🍎', '🍕', '🍔', '🍟', '🍰', '🍩', '🍪', '☕', '🍵', '🍺', '🍷', '🥤', '🍿', '🍫', '🍬', '🍭', '🍦'
]

function setCommentInputRef(id, el) {
  if (el) commentInputRefs[id] = { input: el }
  else if (commentInputRefs[id]) delete commentInputRefs[id]
}

function setEmojiWrapRef(id, el) {
  if (commentInputRefs[id]) commentInputRefs[id].wrap = el || null
}

function toggleEmoji(item) {
  openEmojiId.value = openEmojiId.value === item.id ? null : item.id
}

function insertEmoji(item, emoji) {
  const ref = commentInputRefs[item.id]
  if (ref?.input) {
    const input = ref.input
    const start = input.selectionStart ?? item.newComment.length
    const end = input.selectionEnd ?? start
    const before = (item.newComment || '').slice(0, start)
    const after = (item.newComment || '').slice(end)
    item.newComment = before + emoji + after
    nextTick(() => {
      input.focus()
      input.setSelectionRange(start + emoji.length, start + emoji.length)
    })
  } else {
    item.newComment = (item.newComment || '') + emoji
  }
}

function closeEmojiOnClickOutside(e) {
  if (openEmojiId.value && !e.target.closest('.emoji-picker-wrap')) {
    openEmojiId.value = null
  }
}

onMounted(async () => {
  document.addEventListener('click', closeEmojiOnClickOutside)
  document.addEventListener('keydown', closePreview)
  try {
    list.value = await request.get('/community/shared')
    list.value.forEach(i => { i.showComments = false; i.comments = []; i.newComment = ''; i.liked = false })
    const highlightId = route.query.highlight
    if (highlightId) {
      const item = list.value.find(i => i.id === highlightId)
      if (item) await showComments(item)
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  document.removeEventListener('click', closeEmojiOnClickOutside)
  document.removeEventListener('keydown', closePreview)
})

function formatDate(str) {
  return formatDateUtil(str)
}

const EMOJI_TO_THEME = {
  '😊': 'theme-positive', '😄': 'theme-positive', '😁': 'theme-positive', '🥰': 'theme-positive', '😇': 'theme-positive',
  '😢': 'theme-sad', '😭': 'theme-sad', '😔': 'theme-sad',
  '😰': 'theme-anxious', '😨': 'theme-anxious', '😱': 'theme-anxious',
  '😤': 'theme-angry', '😠': 'theme-angry', '😡': 'theme-angry',
  '😌': 'theme-calm', '😴': 'theme-calm', '🥱': 'theme-calm', '😓': 'theme-calm',
  '🤯': 'theme-surprise', '😲': 'theme-surprise', '😮': 'theme-surprise',
  '😶': 'theme-neutral', '😵': 'theme-neutral', '🤔': 'theme-neutral',
}
function getCardTheme(item) {
  const emoji = (item.emotion || '').toString().trim()
  return EMOJI_TO_THEME[emoji] || 'theme-neutral'
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
    alert((e && e.message) || '操作失败')
  }
}

async function showComments(item) {
  if (item.showComments) {
    item.showComments = false
    return
  }
  list.value.forEach(i => { if (i !== item) i.showComments = false })
  try {
    item.comments = await request.get(`/community/${item.id}/comments`)
    item.showComments = true
  } catch (e) {
    if (e.message) alert(e.message)
  }
}

async function reportDream(item) {
  if (!confirm('确定要举报该梦境吗？举报后该梦境将不再对您显示，其他用户仍可看到，管理员会尽快处理。')) return
  try {
    const res = await request.post(`/community/report/${item.id}`)
    alert(res.message || '举报已提交')
    list.value = list.value.filter(i => i.id !== item.id)
  } catch (e) {
    alert((e && e.message) || '举报失败')
  }
}

async function submitComment(item) {
  if (!item.newComment?.trim()) return
  try {
    const c = await request.post(`/community/${item.id}/comment`, { content: item.newComment.trim() })
    item.comments.unshift({ ...c, likeCount: 0, liked: false })
    item.commentCount++
    item.newComment = ''
  } catch (e) {
    alert((e && e.message) || '评论失败')
  }
}

async function toggleCommentLike(item, c) {
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
</script>

<style scoped>
.community { padding: 0; display: flex; flex-direction: column; height: calc(100vh - 4rem - 3rem); min-height: 320px; }
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
.community h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
.subtitle { font-size: 0.9rem; margin-bottom: 0; }
.loading { text-align: center; padding: 3rem; }
.cards { display: flex; flex-direction: column; gap: 1.25rem; }
.card { border-radius: 12px; padding: 1.25rem 1.5rem; box-shadow: 0 4px 24px rgba(0,0,0,0.25); border-left: 4px solid transparent; transition: box-shadow 0.2s; backdrop-filter: blur(8px); background: linear-gradient(135deg, #f7f5f2 0%, #ede8e2 100%); }
.card-body { margin-bottom: 1rem; }
.card:hover { box-shadow: 0 6px 28px rgba(0,0,0,0.3); }
.card-cover { display: block; max-width: 100%; max-height: 160px; object-fit: contain; border-radius: 8px; margin-bottom: 0.75rem; cursor: pointer; transition: opacity 0.2s; background: #f5f5f5; }
.card-cover:hover { opacity: 0.9; }
.image-preview-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 2rem; }
.image-preview-img { max-width: 95%; max-height: 95%; object-fit: contain; border-radius: 8px; }
.image-preview-close { position: absolute; top: 1rem; right: 1rem; width: 40px; height: 40px; border: none; background: rgba(255,255,255,0.2); color: white; font-size: 1.5rem; border-radius: 50%; cursor: pointer; line-height: 1; }
.image-preview-close:hover { background: rgba(255,255,255,0.3); }
.card .content { line-height: 1.75; color: #333; margin-bottom: 0.75rem; font-size: 0.95rem; white-space: pre-wrap; }
.meta-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; font-size: 0.85rem; margin-bottom: 0.5rem; }
.meta-item { padding: 0.2rem 0.5rem; border-radius: 6px; }
.meta-item.emotion { font-size: 1.1rem; }
.meta-item.tags { color: #6b5b95; background: rgba(107,91,149,0.1); }
.meta-footer { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: #888; padding-top: 0.5rem; border-top: 1px solid rgba(0,0,0,0.06); }
.author { font-weight: 500; color: #6b5b95; }
.actions { display: flex; gap: 1rem; }
.action-btn { padding: 0.35rem 0.6rem; border: 1px solid #e0e0e0; border-radius: 8px; background: white; color: #666; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; line-height: 1; min-width: 3.5rem; }
.action-btn:hover { border-color: #8e7cc3; color: #6b5b95; background: #f8f6fc; }
.like-btn.liked { border-color: #e57373; color: #c62828; background: #ffebee; }
.report-btn:hover { border-color: #e57373; color: #c62828; background: #ffebee; }
.like-icon, .like-num, .comment-icon, .comment-num { font-size: inherit; }
.comment-icon, .like-icon { display: inline-block; width: 1.1em; text-align: center; }
.comments-panel { margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.02); border-radius: 8px; }
.comments-title { font-size: 0.9rem; font-weight: 500; color: #555; margin-bottom: 0.75rem; }
.comment-item { font-size: 0.9rem; margin-bottom: 0.6rem; padding: 0.4rem 0; border-bottom: 1px solid rgba(0,0,0,0.04); display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
.comment-item:last-of-type { border-bottom: none; }
.comment-main { flex: 1; min-width: 0; }
.comment-author { font-weight: 500; color: #6b5b95; margin-right: 0.5rem; }
.comment-content { color: #555; }
.comment-like-btn { flex-shrink: 0; padding: 0.2rem 0.3rem; border: none; background: transparent; color: #999; cursor: pointer; transition: color 0.2s; display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; line-height: 1; }
.comment-like-btn:hover { color: #6b5b95; }
.comment-like-btn.liked { color: #c62828; }
.comment-like-icon, .comment-like-num { font-size: inherit; }
.add-comment { display: flex; gap: 0.5rem; margin-top: 0.75rem; align-items: flex-end; }
.comment-input-wrap { flex: 1; position: relative; display: flex; align-items: center; }
.comment-input-wrap input { width: 100%; padding: 0.5rem 2.5rem 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9rem; }
.emoji-picker-wrap { position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); }
.emoji-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; padding: 0.2rem; opacity: 0.7; border-radius: 4px; }
.emoji-btn:hover, .emoji-btn.active { opacity: 1; background: rgba(0,0,0,0.06); }
.emoji-dropdown { position: absolute; bottom: 100%; right: 0; margin-bottom: 4px; padding: 0.5rem; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); z-index: 10; display: grid; grid-template-columns: repeat(10, 1fr); gap: 0.25rem; max-height: 220px; overflow-y: auto; }
.emoji-item { padding: 0.35rem; font-size: 1.25rem; border: none; border-radius: 6px; background: transparent; cursor: pointer; min-width: 32px; min-height: 32px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.emoji-item:hover { background: #f8f6fc; transform: scale(1.1); }
.send-btn { padding: 0.5rem 1rem; background: linear-gradient(135deg, #6b5b95, #8e7cc3); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem; flex-shrink: 0; }
.send-btn:hover { opacity: 0.95; }

/* 情绪主题色 - 与我的梦境保持一致 */
.card.theme-positive { background: linear-gradient(135deg, #fff2ed 0%, #ffe4d9 100%) !important; border-left-color: #e87a5a; }
.card.theme-sad { background: linear-gradient(135deg, #f3efff 0%, #e8e0ff 100%) !important; border-left-color: #7c6bcc; }
.card.theme-anxious { background: linear-gradient(135deg, #f8f0ff 0%, #f0e6ff 100%) !important; border-left-color: #9b6bcc; }
.card.theme-angry { background: linear-gradient(135deg, #fff0f0 0%, #ffe0e0 100%) !important; border-left-color: #e85a5a; }
.card.theme-calm { background: linear-gradient(135deg, #f0f8f5 0%, #e8f4f0 100%) !important; border-left-color: #52a88a; }
.card.theme-surprise { background: linear-gradient(135deg, #fffce8 0%, #fff4c4 100%) !important; border-left-color: #e5b84d; }
.card.theme-neutral { background: linear-gradient(135deg, #f7f5f2 0%, #ede8e2 100%) !important; border-left-color: #a89f95; }
</style>
