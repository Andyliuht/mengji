<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>找回密码</h1>
      <p class="subtitle">输入用户名和注册时绑定的邮箱，我们将发送重置链接</p>
      <form v-if="!success" @submit.prevent="submit">
        <input v-model="username" type="text" placeholder="用户名" required />
        <input v-model="email" type="email" placeholder="邮箱" required />
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" class="btn-primary" :disabled="loading">发送重置链接</button>
      </form>
      <div v-else class="success">
        <p>已发送！请查收邮件并点击链接重置密码。</p>
        <p class="tip">未收到？请检查垃圾箱，或确认用户名与邮箱是否匹配。</p>
      </div>
      <p class="link"><router-link to="/login">返回登录</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import request from '../api/request'

const email = ref('')
const error = ref('')
const loading = ref(false)
const success = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await request.post('/auth/forgot-password', { username: username.value, email: email.value })
    success.value = true
  } catch (e) {
    error.value = (typeof e === 'string' ? e : e?.message) || '请求失败'
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
.tip { font-size: 0.85rem; color: #999; margin-top: 0.5rem; }
.link { margin-top: 1rem; font-size: 0.9rem; color: #666; }
.link a { color: #6b5b95; }
</style>
