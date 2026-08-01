import { defineConfig } from 'vite';

export default defineConfig({
  root: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: './index.html',
      output: {
        manualChunks(id) {
          // Firebase is statically needed at startup (auth gate + realtime listener),
          // so keep it in its own vendor chunk: the main entry stays lean and the
          // vendor chunk is cached/parallel-loaded separately.
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'vendor-firebase';
          }
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
