import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// درخواست‌های /api به backend فرستاده می‌شوند (کوکی نشست same-origin می‌ماند و CORS لازم نیست)
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
});
