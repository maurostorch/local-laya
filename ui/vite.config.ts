import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// laya-serve sends no CORS headers, so the browser reaches it through a same-origin proxy.
const layaUrl = process.env.LAYA_URL ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/v1': layaUrl,
      '/health': layaUrl,
    },
  },
})
