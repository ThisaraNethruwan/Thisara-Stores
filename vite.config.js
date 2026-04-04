import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['jspdf', 'jspdf-autotable'],
  },
  build: {
    commonjsOptions: {
      include: [/jspdf/, /jspdf-autotable/, /node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:   ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          pdf:      ['jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
})
