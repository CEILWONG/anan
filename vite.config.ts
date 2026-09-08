import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    host: true, // 监听所有网卡（0.0.0.0），允许局域网手机访问
    strictPort: false,
    proxy: {
      // 本地开发：把 /api 转发到共享后端（需另开终端跑 npm run server）
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})