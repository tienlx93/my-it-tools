import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/vscode-extension/extension.ts', import.meta.url)),
      formats: ['cjs'],
      fileName: () => 'extension.js',
    },
    outDir: 'dist-vscode',
    target: 'node18',
    rollupOptions: {
      external: ['vscode', 'node:fs', 'node:path', 'fs', 'path'],
    },
    emptyOutDir: false, // preserve webview/ assets already copied here
  },
});
