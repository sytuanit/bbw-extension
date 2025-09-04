// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: new URL('index.html', import.meta.url).pathname,
        options: new URL('options.html', import.meta.url).pathname,
        'dom-helpers': new URL('src/injected/dom-helpers.ts', import.meta.url).pathname,
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Giữ đường dẫn cố định cho helper
          if (chunkInfo.name === 'dom-helpers') return 'injected/dom-helpers.js'
          return '[name].js'
        },
      },
    },
  },
})
