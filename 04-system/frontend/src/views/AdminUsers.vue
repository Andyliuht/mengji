<template>
  <div class="admin-users-page">
    <div class="fixed-top">
      <h1>用户管理</h1>
      <p class="subtitle">管理员可查看用户注册时间、基本信息及活跃情况</p>
    </div>
    <div class="scroll-area">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="!list.length" class="empty">暂无用户数据</div>
      <div v-else class="users-table-wrap">
        <table class="users-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>昵称</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>注册时间</th>
              <th>梦境数</th>
              <th>分享数</th>
              <th>评论数</th>
              <th>最近活跃</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in list" :key="u.id" class="user-row">
              <td>{{ u.username }}</td>
              <td>{{ u.nickname }}</td>
              <td>{{ u.email || '-' }}</td>
              <td>
                <span class="role-badge" :class="u.role">{{ u.role === 'admin' ? '管理员' : '用户' }}</span>
              </td>
              <td>{{ formatDateTime(u.createdAt) }}</td>
              <td>{{ u.dreamCount }}</td>
              <td>{{ u.sharedCount }}</td>
              <td>{{ u.commentCount }}</td>
              <td>{{ u.lastActivityAt ? formatDateTime(u.lastActivityAt) : '暂无' }}</td>
              <td>
                <span v-if="u.isMuted" class="status-muted">禁言中</span>
                <span v-else class="status-active">正常</span>
              </td>
              <td>
                <button v-if="u.isMuted" type="button" class="btn-unmute" @click="unmuteUser(u)">
                  解除禁言
                </button>
                <span v-else class="no-action">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../api/request'
import { formatDateTime } from '../utils/date'

const list = ref([])
const loading = ref(true)

async function fetchUsers() {
  loading.value = true
  try {
    list.value = await request.get('/admin/users')
  } catch (e) {
    console.error(e)
    list.value = []
  } finally {
    loading.value = false
  }
}

async function unmuteUser(u) {
  if (!confirm(`确定要解除用户「${u.nickname || u.username}」的禁言吗？`)) return
  try {
    await request.post(`/admin/users/${u.id}/unmute`)
    alert('已解除禁言')
    await fetchUsers()
  } catch (e) {
    alert((e && e.message) || '操作失败')
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.admin-users-page {
  max-width: 960px;
  display: flex;
  flex-direction: column;
  min-height: 60vh;
}
.fixed-top {
  padding-top: 2rem;
  margin-bottom: 1rem;
  user-select: none;
}
.fixed-top h1 {
  font-size: 1.5rem;
  color: #fff;
}
.subtitle {
  font-size: 0.9rem;
  color: rgba(255,255,255,0.75);
  margin-top: 0.25rem;
}
.scroll-area {
  flex: 1;
  overflow-x: auto;
}
.loading, .empty {
  padding: 2rem;
  text-align: center;
  color: rgba(255,255,255,0.9);
}
.users-table-wrap {
  background: rgba(255,255,255,0.98);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.25);
  backdrop-filter: blur(8px);
}
.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.users-table th,
.users-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}
.users-table th {
  background: linear-gradient(135deg, rgba(107,91,149,0.15), rgba(142,124,195,0.1));
  color: #2c2c2c;
  font-weight: 600;
}
.users-table tbody tr:hover {
  background: rgba(107,91,149,0.04);
}
.role-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.8rem;
}
.role-badge.admin {
  background: rgba(107,91,149,0.2);
  color: #6b5b95;
}
.role-badge.user {
  background: rgba(0,0,0,0.06);
  color: #666;
}
.status-active {
  color: #2e7d32;
}
.status-muted {
  color: #c62828;
}
.btn-unmute {
  padding: 0.3rem 0.6rem;
  background: #2e7d32;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}
.btn-unmute:hover {
  background: #1b5e20;
}
.no-action {
  color: #999;
  font-size: 0.85rem;
}
</style>
