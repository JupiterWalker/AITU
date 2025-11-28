import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // Nginx 暴露端口
        changeOrigin: true
        // 不 rewrite，保持 /api/* 结构
      }
    }
  }
})