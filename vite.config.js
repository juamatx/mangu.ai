import { defineConfig } from 'vite'

export default defineConfig({
  base: '/mangu.ai/',
  build: {
    chunkSizeWarningLimit: 600,
  },
})
