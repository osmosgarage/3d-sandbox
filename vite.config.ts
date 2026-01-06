import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: path.resolve(__dirname, 'src'),
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    sourcemap: true
  },
  server: {
    // Allow reverse-proxy traffic for the dev server through 3d.eijap.art
    allowedHosts: ['3d.eijap.art'],
    port: 5173,
    open: true
  }
});
