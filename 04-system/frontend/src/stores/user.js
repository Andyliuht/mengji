import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userId: localStorage.getItem('userId') || '',
    username: localStorage.getItem('username') || '',
    nickname: localStorage.getItem('nickname') || '',
    role: localStorage.getItem('role') || 'user'
  }),
  getters: {
    isAdmin: (state) => state.role === 'admin'
  },
  actions: {
    setUser(data) {
      this.token = data.token
      this.userId = data.userId
      this.username = data.username
      this.nickname = data.nickname || data.username
      this.role = data.role || 'user'
      localStorage.setItem('token', data.token)
      localStorage.setItem('userId', data.userId)
      localStorage.setItem('username', data.username)
      localStorage.setItem('nickname', this.nickname)
      localStorage.setItem('role', this.role)
    },
    logout() {
      this.token = ''
      this.userId = ''
      this.username = ''
      this.nickname = ''
      this.role = 'user'
      localStorage.removeItem('token')
      localStorage.removeItem('userId')
      localStorage.removeItem('username')
      localStorage.removeItem('nickname')
      localStorage.removeItem('role')
    }
  }
})
