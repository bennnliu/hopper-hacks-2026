import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), nodePolyfills({
      // Buffer and process are the two things @solana/web3.js needs
      include:  ['buffer', 'process'],
      globals: {
        Buffer:  true,
        process: true,
      },
    }),],
  
})
