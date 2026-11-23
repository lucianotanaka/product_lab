import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  base: '/productlab/',
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: 5173,
    // Proxy: requisições /api são encaminhadas ao backend local.
    // Elimina a necessidade de VITE_API_URL absoluto e evita problemas de CORS em dev.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  define: {
    // Prefere a versão exportada pelo deploy.sh (VITE_APP_VERSION); fallback para package.json
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.VITE_APP_VERSION || pkg.version),
  },
})
