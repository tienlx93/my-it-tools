import { resolve } from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { createPlugins } from './vite.config.base';

export default defineConfig({
  plugins: createPlugins({ pwa: false }),
  base: './', // relative paths required for extensions
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(process.env.npm_package_version),
  },
  build: {
    outDir: 'dist-ext',
    target: 'esnext',
    rollupOptions: {
      input: {
        main: 'index.html',
        background: 'src/extension/background.ts',
        content: 'src/extension/content.ts',
      },
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
