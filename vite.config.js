import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/groc-movera/',
  plugins: [react()],
  build: {
    assetsInlineLimit: 0,
  },
})
