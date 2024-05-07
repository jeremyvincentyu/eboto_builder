import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import react from '@vitejs/plugin-react'
// Thanks to https://stackoverflow.com/questions/70714690/buffer-is-not-defined-in-react-vite for the answer that recommends installing vite-plugin-node-polyfills
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills()],
  build: {
    terserOptions: {
      compress: {
        drop_console: false
      }
    },
    sourcemap: true
  }
})
