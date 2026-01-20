import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // Load environment variables from .env files for local development.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Captures the API_KEY from Netlify (process.env) or local .env (env)
  const apiKey = process.env.API_KEY || env.API_KEY || '';

  return {
    plugins: [react()],
    define: {
      // This hard-codes the API key into your JavaScript during the build process.
      'process.env.API_KEY': JSON.stringify(apiKey),
      // Prevents "process is not defined" errors in the browser.
      'process.env': {}
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