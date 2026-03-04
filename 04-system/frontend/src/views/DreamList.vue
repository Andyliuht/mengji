<template>
  <div class="dream-list">
    <div class="fixed-top">
      <div class="header-row">
        <h1>我的梦境</h1>
        <div class="header-actions">
          <button @click="deleteSelected" class="btn-danger" :class="{ invisible: !selectedIds.length }">删除选中 ({{ selectedIds.length }})</button>
          <button @click="selectedIds = []" class="btn-outline" :class="{ invisible: !selectedIds.length }">取消选择</button>
          <router-link to="/dream/new" class="btn-primary">记录新梦境</router-link>
        </div>
      </div>
      <div class="select-all-row" v-if="dreams.length && !loading">
        <label class="select-all">
          <input type="checkbox" :checked="selectedIds.length === dreams.length" :indeterminate="selectedIds.length > 0 && selectedIds.length < dreams.length" @change="toggleSelectAll" />
          全选
        </label>
      </div>
    </div>
    <div class="scroll-area">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="dreams.length === 0" class="empty">
        <p>还没有记录过梦境</p>
        <router-link to="/dream/new" class="btn-primary">记录第一个梦</router-link>
      </div>
      <div v-else class="cards">
      <div v-for="d in dreams" :key="d.id" class="card" :class="getCardTheme(d)">
        <label class="card-checkbox">
          <input type="checkbox" :value="d.id" v-model="selectedIds" />
        </label>
        <div class="card-content">
          <p class="content">{{ (d.content || '').slice(0, 100) }}{{ (d.content || '').length > 100 ? '...' : '' }}</p>
          <div class="meta-row">
            <span v-if="d.emotion" class="meta-item emotion">{{ d.emotion }}</span>
            <span v-if="d.tags" class="meta-item tags">{{ d.tags }}</span>
            <span v-if="formatLocation(d)" class="meta-item location" :title="formatLocation(d)">📍 {{ (formatLocation(d) || '').length > 20 ? (formatLocation(d) || '').slice(0, 20) + '…' : formatLocation(d) }}</span>
          </div>
          <div class="meta-row meta-footer">
            <span class="date">{{ formatDate(d.createdAt) }}</span>
            <div class="card-actions">
              <span v-if="d.isShared" class="badge">{{ d.shareType === 'public' ? '实名分享' : '匿名分享' }}</span>
              <router-link :to="`/dream/${d.id}`" class="btn-link">查看</router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
    <div v-if="dreamQuote" class="dream-quote-wrap">
      <blockquote class="dream-quote">
        <p>「{{ dreamQuote.text }}」</p>
        <cite>—— {{ dreamQuote.author }}</cite>
      </blockquote>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../api/request'
import { useUserStore } from '../stores/user'
import { formatDate } from '../utils/date'

const DREAM_QUOTES = [
  // 经典名言
  { text: '梦是愿望的满足', author: '西格蒙德·弗洛伊德' },
  { text: '梦境是通往潜意识的神圣之路', author: '卡尔·荣格' },
  { text: '梦是灵魂深处最隐秘的小门，通向意识诞生之前的宇宙之夜', author: '卡尔·荣格' },
  { text: '我们都是由梦构成的，我们渺小的生命被睡眠所环绕', author: '威廉·莎士比亚' },
  { text: '我们所见所感，不过是一场梦中之梦', author: '爱伦·坡' },
  { text: '梦是一个一定要谈话的妻子，睡眠是一个默默地忍受的丈夫', author: '泰戈尔' },
  { text: '梦是潜意识的创造。做梦的同时，创造就已完成', author: '杨绛' },
  { text: '梦虽无理，而却有情', author: '傅抱石' },
  { text: '梦是相思的止渴剂，痛苦的逋逃薮，希望的回音壁，补天的五彩石', author: '柯灵' },
  { text: '梦把人们从桎梏般的现实中释放了出来，使他在云中翱翔', author: '冰心' },
  { text: '单调的生活中，梦是个更换；困苦的生活中，梦是个慰安', author: '冰心' },
  { text: '枕上片时春梦中，行尽江南数千里', author: '唐·岑参' },
  { text: '若问生涯原是梦，除梦里，没人知', author: '清·纳兰性德' },
  { text: '梦是人生奇境，可遇而不可求', author: '周瘦鹃' },
  { text: '梦是生活潜层的万花筒，是通向人们心灵深处的幽径', author: '翟墨' },
  { text: '一个人在睡梦里往往可以见到真实的事情', author: '莎士比亚' },
  { text: '梦想还是要有的，万一实现了呢', author: '马云' },
  { text: '我们所有的梦想都能实现，只要我们有勇气去追求它们', author: '华特·迪士尼' },
  { text: '不要放弃你的梦想。梦想没有了以后，你还可以活着，但虽生犹死', author: '马克·吐温' },
  { text: '梦想是生活的翅膀', author: '海伦·凯勒' },
  { text: '梦是灵魂的剧场，在黑暗中上演我们最深的渴望', author: '古希腊谚语' },
  { text: '梦想家是那些只能看到梦想的人，而实干家则让梦想成真', author: '奥斯卡·王尔德' },
  { text: '梦是心灵在夜晚的旅行', author: '佚名' },
  { text: '梦想如同星辰，看似遥不可及，却指引我们前行', author: '佚名' },
  { text: '我梦想有一天，幽谷上升，高山下降，坎坷之路成坦途', author: '马丁·路德·金' },
  { text: '梦是灵魂的镜子，映照出我们未曾言说的自我', author: '佚名' },
  { text: '所有的梦都是我们内心世界的反映', author: '心理学格言' },
  { text: '梦想是人们与生俱来的重要宝藏之一', author: '佚名' },
  { text: '梦是心灵的语言，它告诉我们内心最深处的渴望', author: '佚名' },
  { text: '每一个梦都是一次与自己的对话', author: '佚名' },
  { text: '梦是夜晚赠予白天的礼物', author: '佚名' },
  { text: '记录梦境，就是记录灵魂的足迹', author: '佚名' },
  { text: '梦是潜意识的信使，带来我们忽略的讯息', author: '佚名' },
  { text: '在梦中，我们遇见最真实的自己', author: '佚名' },
  // 梦境趣事与冷知识
  { text: '人一生平均花费约6年时间做梦，做梦次数超过10万个', author: '梦的冷知识' },
  { text: '醒来后5分钟内会忘记50%的梦，10分钟内忘记90%', author: '梦的冷知识' },
  { text: '约80%的梦是彩色的，童年看黑白电视的人更容易做黑白梦', author: '梦的冷知识' },
  { text: '约50%的人体验过「清醒梦」——知道自己在做梦却仍在睡眠中', author: '梦的冷知识' },
  { text: '梦中只能看到生活中见过的真实面孔，大脑不会创造新面孔', author: '梦的冷知识' },
  { text: '盲人也做梦，先天盲人的梦由声音、触觉、味觉和嗅觉构成', author: '梦的冷知识' },
  { text: '全球各地的人都会做相似的梦：被追逐、坠落、迟到、考试', author: '梦的冷知识' },
  { text: '做梦时身体肌肉处于「瘫痪」状态，防止把梦中动作做出来', author: '梦的冷知识' },
]

const userStore = useUserStore()
const dreams = ref([])
const selectedIds = ref([])
const loading = ref(true)
const dreamQuote = ref(null)

onMounted(async () => {
  dreamQuote.value = DREAM_QUOTES[Math.floor(Math.random() * DREAM_QUOTES.length)]
  if (!userStore.token) return
  try {
    dreams.value = await request.get('/dreams')
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

function formatLocation(d) {
  if (d.location) return d.location
  if (d.latitude != null && d.longitude != null) return `${d.latitude.toFixed(4)}°, ${d.longitude.toFixed(4)}°`
  return ''
}

function toggleSelectAll(e) {
  if (e.target.checked) {
    selectedIds.value = dreams.value.map(d => d.id)
  } else {
    selectedIds.value = []
  }
}

async function deleteSelected() {
  if (!selectedIds.value.length) return
  if (!confirm(`确定要删除选中的 ${selectedIds.value.length} 条梦境吗？`)) return
  try {
    const res = await request.post('/dreams/batch-delete', { ids: [...selectedIds.value] })
    dreams.value = dreams.value.filter(d => !selectedIds.value.includes(d.id))
    selectedIds.value = []
    alert(typeof res === 'object' && res?.message ? res.message : '删除成功')
  } catch (e) {
    alert((typeof e === 'string' ? e : e?.message) || '删除失败')
  }
}

// emoji -> 背景主题
const EMOJI_TO_THEME = {
  '😊': 'theme-positive', '😄': 'theme-positive', '😁': 'theme-positive', '🥰': 'theme-positive', '😇': 'theme-positive',
  '😢': 'theme-sad', '😭': 'theme-sad', '😔': 'theme-sad',
  '😰': 'theme-anxious', '😨': 'theme-anxious', '😱': 'theme-anxious',
  '😤': 'theme-angry', '😠': 'theme-angry', '😡': 'theme-angry',
  '😌': 'theme-calm', '😴': 'theme-calm', '🥱': 'theme-calm', '😓': 'theme-calm',
  '🤯': 'theme-surprise', '😲': 'theme-surprise', '😮': 'theme-surprise',
  '😶': 'theme-neutral', '😵': 'theme-neutral', '🤔': 'theme-neutral',
}
function getCardTheme(d) {
  const emoji = (d.emotion || '').toString().trim()
  return EMOJI_TO_THEME[emoji] || 'theme-neutral'
}
</script>

<style scoped>
.dream-list { padding: 0; display: flex; flex-direction: column; height: calc(100vh - 4rem - 2rem); min-height: 360px; }
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
  margin-top: 1rem;
}
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.75rem; }
.header-row h1 { font-size: 1.5rem; color: #2c2c2c; }
.header-actions { display: flex; gap: 0.5rem; align-items: center; margin-top: 0.75rem; }
.header-actions .invisible { visibility: hidden; pointer-events: none; }
.header-actions .btn-danger,
.header-actions .btn-outline,
.header-actions .btn-primary { min-width: 7.5rem; height: 2.25rem; padding: 0 1rem; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; }
.btn-danger { background: #dc3545; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem; box-shadow: 0 2px 12px rgba(220,53,69,0.4); font-weight: 500; }
.btn-danger:hover { background: #c82333; box-shadow: 0 4px 16px rgba(220,53,69,0.5); }
.btn-outline { border: 1px solid rgba(255,255,255,0.6); border-radius: 8px; background: rgba(255,255,255,0.9); color: #444; cursor: pointer; font-size: 0.9rem; text-decoration: none; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.select-all-row { margin-bottom: 0.5rem; user-select: none; }
.select-all { font-size: 0.9rem; color: #666; cursor: pointer; display: inline-flex; align-items: center; gap: 0.35rem; }
.card { display: flex; gap: 0.75rem; align-items: flex-start; }
.card-checkbox { flex-shrink: 0; padding-top: 0.25rem; cursor: pointer; }
.card-checkbox input { width: 1.1rem; height: 1.1rem; cursor: pointer; }
.card .card-content { flex: 1; min-width: 0; }
.btn-primary { padding: 0.5rem 1rem; background: linear-gradient(135deg, #6b5b95, #8e7cc3); color: white; border-radius: 8px; text-decoration: none; font-size: 0.9rem; box-shadow: 0 2px 12px rgba(107,91,149,0.4); font-weight: 500; }
.btn-primary:hover { opacity: 0.95; box-shadow: 0 4px 16px rgba(107,91,149,0.5); }
.loading, .empty { text-align: center; padding: 3rem; color: #666; }
.empty .btn-primary { display: inline-block; margin-top: 1rem; }
.cards { display: flex; flex-direction: column; gap: 1rem; }
.card { border-radius: 12px; padding: 1.25rem 1.5rem; box-shadow: 0 4px 24px rgba(0,0,0,0.25); border-left: 4px solid transparent; transition: box-shadow 0.2s; backdrop-filter: blur(8px); background: linear-gradient(135deg, #f7f5f2 0%, #ede8e2 100%); }
.card:hover { box-shadow: 0 6px 28px rgba(0,0,0,0.3); }
.card-content {}
.card-content .content { color: #333; line-height: 1.7; margin-bottom: 0.75rem; font-size: 0.95rem; }
.meta-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; font-size: 0.85rem; }
.meta-item { padding: 0.2rem 0.5rem; border-radius: 6px; }
.meta-item.emotion { font-size: 1.1rem; }
.meta-item.tags { color: #6b5b95; background: rgba(107,91,149,0.1); }
.meta-footer { margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(0,0,0,0.06); justify-content: space-between; }
.date { color: #888; font-size: 0.8rem; }
.card-actions { display: flex; gap: 0.5rem; align-items: center; }
.btn-link { color: #6b5b95; text-decoration: none; font-size: 0.9rem; font-weight: 500; }
.btn-link:hover { text-decoration: underline; }
.badge { font-size: 0.75rem; background: rgba(107,91,149,0.2); color: #6b5b95; padding: 0.2rem 0.5rem; border-radius: 4px; }

/* 情绪主题色（暖色系，易区分）- 使用 !important 确保覆盖 */
.card.theme-positive { background: linear-gradient(135deg, #fff2ed 0%, #ffe4d9 100%) !important; border-left-color: #e87a5a; }
.card.theme-sad { background: linear-gradient(135deg, #f3efff 0%, #e8e0ff 100%) !important; border-left-color: #7c6bcc; }
.card.theme-anxious { background: linear-gradient(135deg, #f8f0ff 0%, #f0e6ff 100%) !important; border-left-color: #9b6bcc; }
.card.theme-angry { background: linear-gradient(135deg, #fff0f0 0%, #ffe0e0 100%) !important; border-left-color: #e85a5a; }
.card.theme-calm { background: linear-gradient(135deg, #f0f8f5 0%, #e8f4f0 100%) !important; border-left-color: #52a88a; }
.card.theme-surprise { background: linear-gradient(135deg, #fffce8 0%, #fff4c4 100%) !important; border-left-color: #e5b84d; }
.card.theme-neutral { background: linear-gradient(135deg, #f7f5f2 0%, #ede8e2 100%) !important; border-left-color: #a89f95; }

.dream-quote-wrap {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 3rem;
  box-sizing: border-box;
  padding: 2.5rem 1.5rem 0.5rem;
}
.dream-quote {
  margin: 0;
  padding: 0;
  background: none;
  border: none;
  font-style: italic;
  text-align: center;
}
.dream-quote p { margin: 0 0 0.2rem; color: rgba(255, 255, 255, 0.85); font-size: 0.8rem; line-height: 1.5; }
.dream-quote cite { display: block; font-size: 0.75rem; color: rgba(255, 255, 255, 0.7); font-style: normal; }
</style>
