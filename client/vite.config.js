import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './', // Already inside client/
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        user: resolve(__dirname, 'user.html'),
      },
    },
    outDir: 'dist',
  },
});
