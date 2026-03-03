<template>
  <div class="dream-edit">
    <h1>{{ isEdit ? '编辑梦境' : '记录新梦境' }}</h1>
    <form @submit.prevent="save">
      <div class="form-group">
        <label>梦境内容 *</label>
        <textarea v-model="form.content" rows="6" placeholder="写下你梦到的内容..." required></textarea>
      </div>
      <div class="form-group">
        <label>标签</label>
        <div class="tag-list">
          <span v-for="t in tags" :key="t.id" class="tag" :class="{ active: form.tagIds.includes(t.id) }" @click="toggleTag(t.id)">
            {{ t.name }}
          </span>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>情绪</label>
          <select v-model="form.emotion">
            <option value="">请选择</option>
            <option value="愉快">愉快</option>
            <option value="焦虑">焦虑</option>
            <option value="悲伤">悲伤</option>
            <option value="平静">平静</option>
            <option value="恐惧">恐惧</option>
            <option value="其他">其他</option>
          </select>
        </div>
        <div class="form-group">
          <label>睡眠质量 (1-5)</label>
          <select v-model.number="form.sleepQuality">
            <option :value="null">请选择</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>
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
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '../api/request'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const tags = ref([])
const error = ref('')
const form = reactive({
  content: '',
  tagIds: [],
  emotion: '',
  sleepQuality: null
})

onMounted(async () => {
  tags.value = await request.get('/user/tags')
  if (isEdit.value) {
    const dream = await request.get(`/dreams/${route.params.id}`)
    form.content = dream.content
    form.emotion = dream.emotion || ''
    form.sleepQuality = dream.sleepQuality
    if (dream.tags) {
      const names = dream.tags.split(',').map(s => s.trim()).filter(Boolean)
      form.tagIds = tags.value.filter(t => names.includes(t.name)).map(t => t.id)
    }
  }
})

function toggleTag(id) {
  const i = form.tagIds.indexOf(id)
  if (i >= 0) form.tagIds.splice(i, 1)
  else form.tagIds.push(id)
}

async function save() {
  error.value = ''
  try {
    if (isEdit.value) {
      await request.put(`/dreams/${route.params.id}`, form)
      router.push(`/dream/${route.params.id}`)
    } else {
      const res = await request.post('/dreams', form)
      router.push(`/dream/${res.id}`)
    }
  } catch (e) {
    error.value = e.message || '保存失败'
  }
}
</script>

<style scoped>
.dream-edit { max-width: 600px; }
.dream-edit h1 { margin-bottom: 1.5rem; font-size: 1.5rem; }
.form-group { margin-bottom: 1.25rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: #555; }
.form-group textarea { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; resize: vertical; }
.form-group select { padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; }
.form-row { display: flex; gap: 1.5rem; }
.tag-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.tag { padding: 0.35rem 0.75rem; border-radius: 20px; background: #f0f0f0; color: #666; cursor: pointer; font-size: 0.9rem; }
.tag.active { background: #e8e0f0; color: #6b5b95; }
.error { color: #c44; font-size: 0.9rem; margin-bottom: 0.5rem; }
.actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
.btn-primary { padding: 0.6rem 1.25rem; background: linear-gradient(135deg, #6b5b95, #8e7cc3); color: white; border: none; border-radius: 8px; cursor: pointer; }
.btn-outline { padding: 0.6rem 1.25rem; border: 1px solid #ddd; border-radius: 8px; color: #666; text-decoration: none; }
</style>
