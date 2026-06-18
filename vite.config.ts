import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const serverPort = env.PORT || 3001;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': `http://localhost:${serverPort}`,
      },
    },
  };
});
