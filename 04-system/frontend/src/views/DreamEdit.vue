<template>
  <div class="dream-edit">
    <h1>{{ isEdit ? '编辑梦境' : '记录新梦境' }}</h1>
    <form @submit.prevent="save">
      <div class="form-group">
        <div class="content-label-row">
          <label>梦境内容 *</label>
          <button
            type="button"
            class="voice-btn"
            :class="{ recording: isRecording }"
            :title="isRecording ? '点击停止' : '语音输入'"
            :disabled="!speechSupported"
            @click="toggleVoice"
          >
            <span class="voice-icon">{{ isRecording ? '⏹' : '🎤' }}</span>
            {{ isRecording ? '停止' : '语音输入' }}
          </button>
        </div>
        <textarea v-model="form.content" rows="6" placeholder="写下你梦到的内容，或点击上方「语音输入」口述梦境..." required></textarea>
        <p v-if="!speechSupported" class="voice-hint">当前浏览器不支持语音输入，请使用 Chrome、Edge 或 Safari</p>
      </div>
      <div class="form-group">
        <label>标签</label>
        <div class="tag-row">
          <span v-for="t in tags" :key="t.id" class="tag" :class="{ active: form.tagIds.includes(t.id) }" @click="toggleTag(t.id)">
            {{ t.name }}
          </span>
          <div class="tag-add">
            <input
              v-model="customTagName"
              placeholder="输入自定义标签，回车添加"
              maxlength="20"
              @keyup.enter="addCustomTag"
            />
            <button type="button" class="tag-add-btn" @click="addCustomTag">添加</button>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label>情绪</label>
        <div class="emotion-picker" ref="emotionPickerRef">
          <button type="button" class="emotion-select" @click.stop="emotionOpen = !emotionOpen">
            <span class="emotion-display" :class="{ placeholder: !form.emotion }">{{ form.emotion || '请选择情绪' }}</span>
            <span class="emotion-arrow">▼</span>
          </button>
          <div v-show="emotionOpen" class="emotion-dropdown">
            <button type="button" class="emotion-item emotion-clear" @click="form.emotion = ''; emotionOpen = false">
              清除
            </button>
            <button
              v-for="e in emotionOptions"
              :key="e.value"
              type="button"
              class="emotion-item"
              :title="e.label"
              @click="form.emotion = e.value; emotionOpen = false"
            >
              {{ e.value }}
            </button>
          </div>
        </div>
      </div>
      <div class="form-group" v-if="locationStatus">
        <div class="location-label-row">
          <label>记录地点</label>
          <button
            v-if="locationSupported"
            type="button"
            class="relocate-btn"
            :disabled="locationFetching"
            title="重新获取当前位置"
            @click="handleRelocate"
          >
            {{ locationFetching ? '定位中...' : '重新定位' }}
          </button>
        </div>
        <p class="location-text">{{ locationStatus }}</p>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="actions">
        <button type="submit" class="btn-primary">保存</button>
        <router-link to="/" class="btn-outline">取消</router-link>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '../api/request'
import { useDreamStore } from '../stores/dream'

const route = useRoute()
const router = useRouter()
const dreamStore = useDreamStore()
const isEdit = computed(() => !!route.params.id)
const tags = ref([])
const customTagName = ref('')
const error = ref('')

const emotionOpen = ref(false)
const emotionPickerRef = ref(null)

const isRecording = ref(false)
const speechSupported = ref(false)
let recognition = null
const emotionOptions = [
  { value: '😊', label: '开心' }, { value: '😄', label: '大笑' }, { value: '😁', label: '兴奋' },
  { value: '😌', label: '平静' }, { value: '😇', label: '安详' }, { value: '🥰', label: '幸福' },
  { value: '😢', label: '悲伤' }, { value: '😭', label: '痛哭' }, { value: '😔', label: '沮丧' },
  { value: '😰', label: '焦虑' }, { value: '😨', label: '恐惧' }, { value: '😱', label: '惊恐' },
  { value: '😤', label: '愤怒' }, { value: '😠', label: '生气' }, { value: '😡', label: '暴怒' },
  { value: '😶', label: '困惑' }, { value: '😵', label: '眩晕' }, { value: '🤔', label: '思考' },
  { value: '😴', label: '困倦' }, { value: '🥱', label: '疲惫' }, { value: '😓', label: '无奈' },
  { value: '🤯', label: '震惊' }, { value: '😲', label: '惊讶' }, { value: '😮', label: '意外' }
]
const textToEmoji = { 愉快: '😊', 焦虑: '😰', 悲伤: '😢', 平静: '😌', 恐惧: '😨', 其他: '😶' }
const form = reactive({
  content: '',
  tagIds: [],
  emotion: '',
  latitude: null,
  longitude: null
})
const locationStatus = ref('')
const locationSupported = ref(typeof navigator !== 'undefined' && !!navigator.geolocation)
const locationFetching = ref(false)

async function handleRelocate() {
  if (!locationSupported.value || locationFetching.value) return
  locationFetching.value = true
  locationStatus.value = '正在重新获取位置...'
  await fetchLocation()
  locationFetching.value = false
}

function closeEmotionOnClickOutside(e) {
  if (emotionPickerRef.value && !emotionPickerRef.value.contains(e.target)) {
    emotionOpen.value = false
  }
}

function initSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) return
  speechSupported.value = true
  recognition = new SpeechRecognition()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'zh-CN'
  recognition.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        const transcript = e.results[i][0].transcript
        if (transcript) {
          const sep = form.content && !form.content.endsWith(' ') ? ' ' : ''
          form.content += sep + transcript
        }
      }
    }
  }
  recognition.onerror = (e) => {
    if (e.error !== 'no-speech' && e.error !== 'aborted') {
      error.value = '语音识别出错，请重试'
    }
    isRecording.value = false
  }
  recognition.onend = () => {
    isRecording.value = false
  }
}

function toggleVoice() {
  if (!recognition) return
  if (isRecording.value) {
    recognition.stop()
    isRecording.value = false
  } else {
    error.value = ''
    recognition.start()
    isRecording.value = true
  }
}

function fetchLocation() {
  if (!navigator.geolocation) {
    locationStatus.value = '当前浏览器不支持定位'
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.latitude = pos.coords.latitude
        form.longitude = pos.coords.longitude
        locationStatus.value = `${form.latitude.toFixed(4)}°, ${form.longitude.toFixed(4)}°`
        resolve()
      },
      (err) => {
        locationStatus.value = err.code === 1 ? '已跳过定位（用户拒绝）' : '定位失败，可稍后重试'
        resolve()
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  })
}

onMounted(async () => {
  document.addEventListener('click', closeEmotionOnClickOutside)
  initSpeech()
  if (!isEdit.value) {
    const { canAdd } = await request.get('/dreams/can-add-today')
    if (!canAdd) {
      alert('您今天已记录过梦境，请先删除今日梦境后再记录新梦境。')
      router.push('/')
      return
    }
  }
  tags.value = await request.get('/user/tags')
  if (isEdit.value) {
    const dream = await request.get(`/dreams/${route.params.id}`)
    form.content = dream.content
    form.emotion = textToEmoji[dream.emotion] || dream.emotion || ''
    form.latitude = dream.latitude ?? null
    form.longitude = dream.longitude ?? null
    if (dream.latitude != null && dream.longitude != null) {
      locationStatus.value = `${dream.latitude.toFixed(4)}°, ${dream.longitude.toFixed(4)}°`
    }
    if (dream.tags) {
      const names = dream.tags.split(',').map(s => s.trim()).filter(Boolean)
      form.tagIds = tags.value.filter(t => names.includes(t.name)).map(t => t.id)
    }
  } else {
    locationStatus.value = '正在获取位置...'
    await fetchLocation()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', closeEmotionOnClickOutside)
  if (recognition) try { recognition.stop() } catch (_) {}
})

function toggleTag(id) {
  const i = form.tagIds.indexOf(id)
  if (i >= 0) form.tagIds.splice(i, 1)
  else form.tagIds.push(id)
}

async function addCustomTag() {
  const name = customTagName.value.trim()
  if (!name) return
  if (tags.value.some(t => t.name === name)) {
    const t = tags.value.find(t => t.name === name)
    if (!form.tagIds.includes(t.id)) form.tagIds.push(t.id)
    customTagName.value = ''
    return
  }
  try {
    const tag = await request.post('/user/tags', { name })
    if (!tags.value.some(t => t.id === tag.id)) tags.value.push(tag)
    if (!form.tagIds.includes(tag.id)) form.tagIds.push(tag.id)
    customTagName.value = ''
  } catch (e) {
    error.value = e.message || '添加标签失败'
  }
}

async function save() {
  error.value = ''
  try {
    if (isEdit.value) {
      await request.put(`/dreams/${route.params.id}`, form)
      router.push(`/dream/${route.params.id}`)
    } else {
      const res = await request.post('/dreams', form)
      dreamStore.refreshHasRecordedToday()
      router.push(`/dream/${res.id}`)
    }
  } catch (e) {
    error.value = e.message || '保存失败'
  }
}
</script>

<style scoped>
.dream-edit { max-width: 600px; margin-top: 1.5rem; background: rgba(255,255,255,0.98); padding: 2rem; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.25); backdrop-filter: blur(8px); }
.dream-edit h1 { margin-bottom: 1.5rem; font-size: 1.5rem; }
.form-group { margin-bottom: 1.25rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: #555; }
.content-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.content-label-row label { margin-bottom: 0; }
.form-group textarea { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; resize: vertical; }
.voice-btn { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-size: 0.85rem; color: #666; transition: all 0.2s; }
.voice-btn:hover:not(:disabled) { border-color: #8e7cc3; color: #6b5b95; background: #f8f6fc; }
.voice-btn.recording { background: #ffe8e8; border-color: #e57373; color: #c62828; animation: pulse 1.5s infinite; }
.voice-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.voice-icon { font-size: 1rem; }
.voice-hint { margin-top: 0.35rem; font-size: 0.8rem; color: #999; }
@keyframes pulse { 50% { opacity: 0.8; } }
.form-group select { padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; }
.location-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.location-label-row label { margin-bottom: 0; }
.relocate-btn { padding: 0.35rem 0.75rem; border: 1px solid #8e7cc3; border-radius: 6px; background: #f8f6fc; color: #6b5b95; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
.relocate-btn:hover:not(:disabled) { background: #e8e0f0; }
.relocate-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.location-text { margin: 0; padding: 0.5rem 0; font-size: 0.95rem; color: #555; }
.emotion-picker { position: relative; }
.emotion-select { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-size: 1rem; }
.emotion-select:hover { border-color: #8e7cc3; }
.emotion-display { font-size: 1.5rem; }
.emotion-display.placeholder { font-size: 0.95rem; color: #999; }
.emotion-arrow { font-size: 0.6rem; color: #888; }
.emotion-dropdown { position: absolute; top: 100%; left: 0; min-width: 420px; margin-top: 4px; padding: 0.75rem; border: 1px solid #ddd; border-radius: 10px; background: white; box-shadow: 0 6px 20px rgba(0,0,0,0.12); z-index: 10; display: grid; grid-template-columns: repeat(8, 1fr); gap: 0.5rem; max-height: 340px; overflow-y: auto; }
.emotion-clear { font-size: 0.9rem; color: #888; grid-column: 1 / -1; padding: 0.5rem; }
.emotion-item { padding: 0.4rem; font-size: 1.4rem; border: none; border-radius: 8px; background: transparent; cursor: pointer; min-height: 36px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.emotion-item:hover { background: #f8f6fc; transform: scale(1.08); }
.tag-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.tag { padding: 0.35rem 0.75rem; border-radius: 20px; background: #f0f0f0; color: #666; cursor: pointer; font-size: 0.9rem; }
.tag.active { background: #e8e0f0; color: #6b5b95; }
.tag-add { display: flex; gap: 0.5rem; align-items: stretch; margin-left: auto; }
.tag-add input { flex: 1; max-width: 200px; padding: 0.4rem 0.6rem; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9rem; }
.tag-add input:focus { outline: none; border-color: #8e7cc3; }
.tag-add-btn { padding: 0 0.8rem; border: 1px solid #8e7cc3; border-radius: 8px; background: #f8f6fc; color: #6b5b95; font-size: 0.9rem; cursor: pointer; }
.tag-add-btn:hover { background: #e8e0f0; }
.error { color: #c44; font-size: 0.9rem; margin-bottom: 0.5rem; }
.actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
.btn-primary { padding: 0.6rem 1.25rem; background: linear-gradient(135deg, #6b5b95, #8e7cc3); color: white; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 12px rgba(107,91,149,0.4); font-weight: 500; }
.btn-outline { padding: 0.6rem 1.25rem; border: 1px solid rgba(255,255,255,0.6); border-radius: 8px; background: rgba(255,255,255,0.9); color: #444; text-decoration: none; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
</style>
