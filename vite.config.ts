import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path'
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: './',
  publicDir: path.resolve(__dirname, 'images'),
  root: path.resolve(__dirname, 'src/renderer'),
  build: { outDir: path.resolve(__dirname, 'dist') },
  plugins: [vue()]
});
