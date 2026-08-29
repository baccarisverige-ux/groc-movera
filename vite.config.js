import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Movera-host1/',
  plugins: [react()],
  build: {
    assetsInlineLimit: 0,
  },
})
