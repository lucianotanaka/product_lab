import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  base: '/productlab/',
  plugins: [react()],
  define: {
    // Injeta a versão do package.json como variável de ambiente
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
})
