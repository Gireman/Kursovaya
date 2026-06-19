import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const serverPort = env.API_PORT || 8080;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': `http://127.0.0.1:${serverPort}`,
      },
    },
  };
});
