<template>
  <div id="app">
    <header class="header">
      <router-link to="/" class="logo">梦境记录</router-link>
      <nav v-if="userStore.token">
        <router-link to="/">我的梦境</router-link>
        <router-link to="/community">梦境社区</router-link>
        <router-link to="/stats">我的统计</router-link>
        <span class="user">{{ userStore.nickname }}</span>
        <button @click="logout" class="btn-outline">退出</button>
      </nav>
      <nav v-else>
        <router-link to="/community">梦境社区</router-link>
        <router-link to="/login">登录</router-link>
        <router-link to="/register">注册</router-link>
      </nav>
    </header>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useUserStore } from './stores/user'

const userStore = useUserStore()

function logout() {
  userStore.logout()
  window.location.href = '/login'
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif; background: #f5f0eb; color: #2c2c2c; }
#app { min-height: 100vh; }
.header {
  background: linear-gradient(135deg, #6b5b95 0%, #8e7cc3 100%);
  color: white; padding: 0.75rem 1.5rem; display: flex; justify-content: space-between; align-items: center;
}
.logo { font-size: 1.25rem; font-weight: bold; text-decoration: none; color: white; }
.header nav { display: flex; gap: 1.5rem; align-items: center; }
.header nav a { color: rgba(255,255,255,0.9); text-decoration: none; }
.header nav a.router-link-active { color: white; font-weight: 600; }
.user { font-size: 0.9rem; opacity: 0.9; }
.btn-outline { background: transparent; border: 1px solid rgba(255,255,255,0.8); color: white; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
.btn-outline:hover { background: rgba(255,255,255,0.2); }
.main { max-width: 900px; margin: 0 auto; padding: 1.5rem; }
</style>
