import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Absolute base: the app uses clean URLs such as /kjv/jhn/3, so assets must not resolve relative to them.
  base: '/',
  plugins: [react(), tailwindcss()]
})
