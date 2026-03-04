<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>注销账号</h1>
      <p class="subtitle">请输入您的用户名或邮箱及密码以确认注销，此操作不可恢复。</p>
      <form @submit.prevent="submit">
        <input v-model="usernameOrEmail" type="text" placeholder="用户名或邮箱" required />
        <input v-model="password" type="password" placeholder="密码" required />
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" class="btn-danger" :disabled="loading">{{ loading ? '注销中...' : '确认注销' }}</button>
      </form>
      <p class="link"><router-link to="/">返回首页</router-link></p>
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
const usernameOrEmail = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  if (!usernameOrEmail.value.trim() || !password.value) {
    error.value = '请输入用户名或邮箱及密码'
    return
  }
  if (!confirm('确定要注销账号吗？您的所有梦境、评论等数据将被永久删除，此操作不可恢复。')) return
  loading.value = true
  try {
    await request.post('/auth/delete-account', {
      usernameOrEmail: usernameOrEmail.value.trim(),
      password: password.value
    })
    userStore.logout()
    alert('账号已注销')
    router.push('/')
  } catch (e) {
    error.value = (typeof e === 'string' ? e : e?.message) || '注销失败'
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
.btn-danger { width: 100%; padding: 0.75rem; background: #dc3545; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 500; }
.btn-danger:hover:not(:disabled) { background: #c82333; }
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
.error { color: #c44; font-size: 0.9rem; margin-bottom: 0.5rem; }
.link { margin-top: 1rem; font-size: 0.9rem; color: #666; }
.link a { color: #6b5b95; }
</style>
