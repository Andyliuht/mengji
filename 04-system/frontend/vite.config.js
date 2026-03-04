import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dns from 'node:dns'

// 修复 Windows 上 localhost 无法访问：确保 DNS 解析顺序一致（Vite 官方推荐）
dns.setDefaultResultOrder('verbatim')

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
