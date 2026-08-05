import { URL, fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import { createPlugins } from './vite.config.base.ts';

const baseUrl = process.env.BASE_URL ?? '/';

export default defineConfig({
  plugins: createPlugins({ pwa: true, baseUrl }),
  base: baseUrl,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(process.env.npm_package_version),
  },
  test: {
    exclude: [...configDefaults.exclude, '**/*.e2e.spec.ts'],
    deps: {
      optimizer: {
        web: { enabled: false },
        ssr: { enabled: false },
      },
    },
    server: {
      deps: {
        inline: ['@vue/test-utils'],
      },
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/js-tiktoken')) {
            return 'js-tiktoken';
          }
          if (id.includes('node_modules/monaco-editor')) {
            return 'monaco-editor';
          }
          if (id.includes('node_modules/@vicons/')) {
            return 'icons';
          }
        },
      },
    },
  },
});
