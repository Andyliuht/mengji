import { defineStore } from 'pinia'
import request from '../api/request'
import { useUserStore } from './user'

export const useDreamStore = defineStore('dream', {
  state: () => ({
    hasRecordedToday: false
  }),
  actions: {
    async refreshHasRecordedToday() {
      const userStore = useUserStore()
      if (!userStore.token) {
        this.hasRecordedToday = false
        return
      }
      try {
        const res = await request.get('/dreams/can-add-today')
        this.hasRecordedToday = res?.hasRecordedToday ?? false
      } catch {
        this.hasRecordedToday = false
      }
    }
  }
})
