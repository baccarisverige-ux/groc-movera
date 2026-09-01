import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const base = process.env.MOVERA_TEST_BASE === 'root' ? '/' : '/groc-movera/'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    assetsInlineLimit: 0,
  },
})
