import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  define: {
    'import.meta.env.VITE_PREVIEW_BUILD': JSON.stringify('true'),
    'import.meta.env.VITE_DEMO_MODE': JSON.stringify('true'),
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(''),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(''),
  },
  build: {
    outDir: 'singlefile-output',
    emptyOutDir: true,
  },
})
