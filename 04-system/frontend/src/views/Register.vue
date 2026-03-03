<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>注册账号</h1>
      <p class="subtitle">加入梦境记录平台</p>
      <form @submit.prevent="register">
        <input v-model="username" type="text" placeholder="用户名" required />
        <input v-model="password" type="password" placeholder="密码" required />
        <input v-model="nickname" type="text" placeholder="昵称（可选）" />
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" class="btn-primary">注册</button>
      </form>
      <p class="link">已有账号？<router-link to="/login">去登录</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import request from '../api/request'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const username = ref('')
const password = ref('')
const nickname = ref('')
const error = ref('')

async function register() {
  error.value = ''
  try {
    const data = await request.post('/auth/register', {
      username: username.value,
      password: password.value,
      nickname: nickname.value || undefined
    })
    userStore.setUser(data)
    router.push('/')
  } catch (e) {
    error.value = e.message || '注册失败'
  }
}
</script>

<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #6b5b95 0%, #8e7cc3 50%, #a8a4c4 100%); }
.auth-card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); width: 100%; max-width: 360px; }
.auth-card h1 { font-size: 1.5rem; margin-bottom: 0.25rem; color: #2c2c2c; }
.subtitle { color: #666; font-size: 0.9rem; margin-bottom: 1.5rem; }
.auth-card input { width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }
.auth-card input:focus { outline: none; border-color: #8e7cc3; }
.btn-primary { width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #6b5b95, #8e7cc3); color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; }
.btn-primary:hover { opacity: 0.95; }
.error { color: #c44; font-size: 0.9rem; margin-bottom: 0.5rem; }
.link { margin-top: 1rem; font-size: 0.9rem; color: #666; }
.link a { color: #6b5b95; }
</style>
