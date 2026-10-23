import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative base so the build works under any GitHub Pages path.
  base: './',
  plugins: [react(), tailwindcss()]
})
