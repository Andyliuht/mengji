import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  { path: '/login', component: () => import('../views/Login.vue'), meta: { guest: true } },
  { path: '/register', component: () => import('../views/Register.vue'), meta: { guest: true } },
  { path: '/forgot-password', component: () => import('../views/ForgotPassword.vue'), meta: { guest: true } },
  { path: '/reset-password', component: () => import('../views/ResetPassword.vue'), meta: { guest: true } },
  { path: '/account-delete', component: () => import('../views/DeleteAccount.vue'), meta: { requiresAuth: true } },
  { path: '/', component: () => import('../views/DreamList.vue'), meta: { requiresAuth: true } },
  { path: '/dream/new', component: () => import('../views/DreamEdit.vue'), meta: { requiresAuth: true } },
  { path: '/dream/:id', component: () => import('../views/DreamDetail.vue'), meta: { requiresAuth: true } },
  { path: '/dream/:id/edit', component: () => import('../views/DreamEdit.vue'), meta: { requiresAuth: true } },
  { path: '/community', component: () => import('../views/Community.vue') },
  { path: '/dream-map', component: () => import('../views/DreamMap.vue') },
  { path: '/stats', component: () => import('../views/Stats.vue'), meta: { requiresAuth: true } },
  { path: '/notifications', component: () => import('../views/Notifications.vue'), meta: { requiresAuth: true } }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  if (to.meta.requiresAuth && !userStore.token) {
    next('/login')
  } else if (to.meta.guest && userStore.token) {
    next('/')
  } else {
    next()
  }
})

export default router
