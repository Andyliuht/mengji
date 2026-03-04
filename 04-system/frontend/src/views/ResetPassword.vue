<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>重置密码</h1>
      <p class="subtitle">请输入新密码</p>
      <form v-if="!success" @submit.prevent="submit">
        <input v-model="newPassword" type="password" placeholder="新密码（至少6位）" required minlength="6" />
        <input v-model="confirmPassword" type="password" placeholder="确认新密码" required minlength="6" />
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" class="btn-primary" :disabled="loading">确认重置</button>
      </form>
      <div v-else class="success">
        <p>密码已重置！请使用新密码登录。</p>
      </div>
      <p class="link"><router-link to="/login">返回登录</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '../api/request'

const route = useRoute()
const router = useRouter()
const token = computed(() => route.query.token)
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)
const success = ref(false)

onMounted(() => {
  if (!token.value) {
    error.value = '无效的重置链接，请从邮件中重新点击'
  }
})

async function submit() {
  if (!token.value) return
  error.value = ''
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  if (newPassword.value.length < 6) {
    error.value = '密码至少 6 位'
    return
  }
  loading.value = true
  try {
    await request.post('/auth/reset-password', {
      token: token.value,
      newPassword: newPassword.value
    })
    success.value = true
    setTimeout(() => router.push('/login'), 2000)
  } catch (e) {
    error.value = (typeof e === 'string' ? e : e?.message) || '重置失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.auth-card { background: rgba(255,255,255,0.98); padding: 2rem; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); width: 100%; max-width: 360px; backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.3); }
.auth-card h1 { font-size: 1.5rem; margin-bottom: 0.25rem; color: #2c2c2c; }
.subtitle { color: #666; font-size: 0.9rem; margin-bottom: 1.5rem; }
.auth-card input { width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }
.auth-card input:focus { outline: none; border-color: #8e7cc3; }
.btn-primary { width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #6b5b95, #8e7cc3); color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; box-shadow: 0 4px 16px rgba(107,91,149,0.5); font-weight: 500; }
.btn-primary:hover:not(:disabled) { opacity: 0.95; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.error { color: #c44; font-size: 0.9rem; margin-bottom: 0.5rem; }
.success { margin-bottom: 1rem; }
.success p { color: #2c2c2c; }
.link { margin-top: 1rem; font-size: 0.9rem; color: #666; }
.link a { color: #6b5b95; }
</style>
