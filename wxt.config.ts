import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-vue'],
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    name: 'SolvFC',
    description: 'Solves EA FC Squad Building Challenges with the cheapest cards from your club.',
    permissions: ['storage'],
    content_security_policy: { extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'" },
  },
})
