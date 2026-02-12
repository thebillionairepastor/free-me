import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  const apiKey = process.env.API_KEY || env.API_KEY || '';

  if (!apiKey && mode === 'production') {
    console.warn('⚠️  WARNING: API_KEY is not set. The Gemini AI Advisor will not function in production.');
  }

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: './index.html'
      }
    },
    server: {
      port: 3000
    }
  };
});