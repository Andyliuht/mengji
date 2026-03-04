<template>
  <div id="app">
    <div class="bg-layer">
      <div class="bg-gradient"></div>
      <div class="bg-earth"></div>
      <div class="bg-stars"></div>
    </div>
    <header class="header" :class="{ 'header-admin': userStore.isAdmin }">
      <router-link to="/" class="logo">梦迹</router-link>
      <nav v-if="userStore.token">
        <router-link to="/">我的梦境</router-link>
        <router-link to="/community">梦境社区</router-link>
        <router-link to="/dream-map">梦迹地图</router-link>
        <router-link to="/stats">我的统计</router-link>
        <router-link to="/notifications">消息中心</router-link>
        <NotificationBell />
        <span class="user">{{ userStore.nickname }}</span>
        <button @click="logout" class="btn-outline">退出</button>
      </nav>
      <nav v-else>
        <router-link to="/community">梦境社区</router-link>
        <router-link to="/dream-map">梦迹地图</router-link>
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
import { useRouter } from 'vue-router'
import { useUserStore } from './stores/user'
import NotificationBell from './components/NotificationBell.vue'

const router = useRouter()
const userStore = useUserStore()

function logout() {
  userStore.logout()
  router.push('/login')
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif; color: #2c2c2c; overflow-x: hidden; }
#app { min-height: 100vh; position: relative; }

/* 银河地球背景 */
.bg-layer { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
.bg-gradient {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 80% 50% at 50% 100%, rgba(88,28,135,0.4) 0%, transparent 50%),
    radial-gradient(ellipse 60% 80% at 80% 20%, rgba(59,7,100,0.35) 0%, transparent 45%),
    radial-gradient(ellipse 50% 60% at 20% 80%, rgba(30,0,60,0.4) 0%, transparent 40%),
    linear-gradient(180deg, #0a0515 0%, #1a0a2e 35%, #0d0221 70%, #05010d 100%);
  animation: bgShift 20s ease-in-out infinite alternate;
}
@keyframes bgShift {
  0% { opacity: 1; filter: hue-rotate(-5deg); }
  100% { opacity: 0.95; filter: hue-rotate(5deg); }
}
.bg-earth {
  position: absolute; right: -8%; bottom: -15%; width: 55%; max-width: 520px; aspect-ratio: 1;
  background: url('https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/True_Color_Earth_viewed_from_GOES_16.jpg/512px-True_Color_Earth_viewed_from_GOES_16.jpg') center/cover;
  border-radius: 50%; box-shadow: inset -20px -20px 60px rgba(0,0,0,0.6), 0 0 120px rgba(100,50,180,0.25);
  opacity: 0.5; animation: earthRotate 240s linear infinite;
}
@keyframes earthRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.bg-stars {
  position: absolute; inset: 0;
  background-image:
    radial-gradient(2px 2px at 8% 20%, white, transparent),
    radial-gradient(1.5px 1.5px at 12% 45%, rgba(255,255,255,0.9), transparent),
    radial-gradient(2px 2px at 5% 70%, white, transparent),
    radial-gradient(1px 1px at 18% 15%, rgba(255,255,255,0.7), transparent),
    radial-gradient(2px 2px at 22% 85%, white, transparent),
    radial-gradient(1.5px 1.5px at 15% 55%, rgba(255,255,255,0.8), transparent),
    radial-gradient(1px 1px at 25% 30%, white, transparent),
    radial-gradient(2px 2px at 10% 90%, rgba(255,255,255,0.6), transparent),
    radial-gradient(2px 2px at 20% 30%, white, transparent),
    radial-gradient(2px 2px at 40% 70%, rgba(255,255,255,0.8), transparent),
    radial-gradient(1px 1px at 90% 10%, white, transparent),
    radial-gradient(2px 2px at 60% 50%, rgba(255,255,255,0.6), transparent);
  background-size: 100% 100%; opacity: 0.7; animation: starsTwinkle 8s ease-in-out infinite;
}
.bg-stars::before {
  content: ''; position: absolute; left: 0; top: 0; width: 45%; height: 100%;
  background: radial-gradient(ellipse 80% 60% at 15% 50%, rgba(150,120,200,0.12) 0%, transparent 70%);
  pointer-events: none;
}
@keyframes starsTwinkle { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.85; } }

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  min-height: 4rem;
  background: rgba(50,20,80,0.95); backdrop-filter: blur(12px);
  color: white; padding: 0.75rem 1.5rem; display: flex; justify-content: space-between; align-items: center;
  box-shadow: 0 2px 20px rgba(0,0,0,0.3);
  user-select: none;
}
.header-admin { background: rgba(20,60,140,0.95); }
.logo { font-size: 1.25rem; font-weight: bold; text-decoration: none; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.header nav { display: flex; gap: 1.5rem; align-items: center; }
.header nav a { color: rgba(255,255,255,0.95); text-decoration: none; text-shadow: 0 1px 2px rgba(0,0,0,0.4); }
.header nav a.router-link-active { color: white; font-weight: 600; }
.user { font-size: 0.9rem; opacity: 0.95; text-shadow: 0 1px 2px rgba(0,0,0,0.4); }
.btn-outline { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.9); color: white; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; text-shadow: 0 1px 2px rgba(0,0,0,0.4); }
.btn-outline:hover { background: rgba(255,255,255,0.25); }
.main { max-width: 900px; margin: 0 auto; padding: 1.5rem; padding-top: 4rem; position: relative; z-index: 1; }
.main h1 { color: #fff !important; text-shadow: 0 1px 6px rgba(0,0,0,0.6); }
.main .header-row h1 { color: #fff !important; }
.main .loading, .main .empty { color: rgba(255,255,255,0.95) !important; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.main a[href].back, .main .back { color: rgba(255,255,255,0.95) !important; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.main .subtitle { color: rgba(255,255,255,0.9) !important; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.main .select-all { color: rgba(255,255,255,0.95) !important; }
.main .community h1, .main .dream-map-page h1, .main .stats h1, .main .notifications-page h1 { color: #fff !important; }
/* 白底卡片内的 loading、empty 保持深色 */
.main .list-section .loading, .main .list-section .empty { color: #666 !important; text-shadow: none; }
/* 登录/注册等白底卡片内的文字保持深色 */
.main .auth-card h1 { color: #2c2c2c !important; text-shadow: none; }
.main .auth-card .subtitle { color: #555 !important; text-shadow: none; }
.main .auth-card .link { color: #555 !important; text-shadow: none; }
.main .auth-card .link a { color: #6b5b95 !important; }
.main .auth-card .success p { color: #2c2c2c !important; }
.main .auth-card .tip { color: #666 !important; }

/* 隐蔽滚动条样式 */
.scroll-area {
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.25) transparent;
}
.scroll-area::-webkit-scrollbar { width: 6px; }
.scroll-area::-webkit-scrollbar-track { background: transparent; }
.scroll-area::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.2);
  border-radius: 3px;
}
.scroll-area::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.35);
}
</style>
