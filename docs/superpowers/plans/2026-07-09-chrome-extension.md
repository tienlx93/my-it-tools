# Chrome Extension Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the existing Vue/Vite `my-it-tools` app as a Chrome extension so that users can access supported tools (QR Code Generator, Text Statistics, Date-Time Converter, Base64 Encode) via an in-page modal injected through a right-click context menu.

**Architecture:** Detect extension environment to use hash history routing, expose modal mode through StyleStore to hide navigation siders and top bars, and use a separate Vite config file to bundle the extension's entry points alongside background and content scripts.

**Tech Stack:** Vue 3, Vite, TypeScript, Chrome Extensions API (MV3), Vitest.

## Global Constraints

- Preserve all existing comments and docstrings that are unrelated to your code changes.
- Follow existing patterns for components and styling (Naive UI & Less).
- All changes must pass `pnpm lint`, `pnpm typecheck`, and `npx vitest run --environment jsdom`.

---

### Task 1: Style Store Modifications and Test

**Files:**
- Create: `src/stores/style.store.test.ts`
- Modify: `src/stores/style.store.ts`

**Interfaces:**
- Produces: `isModalMode: ComputedRef<boolean>` in StyleStore

- [ ] **Step 1: Write the failing unit test**

  Create `src/stores/style.store.test.ts`:
  ```ts
  import { describe, it, expect, beforeEach, vi } from 'vitest';
  import { setActivePinia, createPinia } from 'pinia';
  import { useStyleStore } from './style.store';

  const mockRoute = {
    query: { mode: '' }
  };

  vi.mock('vue-router', () => ({
    useRoute: () => mockRoute
  }));

  describe('style store', () => {
    beforeEach(() => {
      setActivePinia(createPinia());
      mockRoute.query.mode = '';
    });

    it('returns false for isModalMode by default', () => {
      const store = useStyleStore();
      expect(store.isModalMode).toBe(false);
    });

    it('detects isModalMode when mode=modal is present in query', () => {
      mockRoute.query.mode = 'modal';
      const store = useStyleStore();
      expect(store.isModalMode).toBe(true);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `npx vitest run src/stores/style.store.test.ts`
  Expected: FAIL with `TypeError: Cannot read properties of undefined (reading 'isModalMode')` or similar.

- [ ] **Step 3: Modify Style Store implementation**

  Modify `src/stores/style.store.ts` to add imports and the `isModalMode` property:
  ```ts
  import { useDark, useMediaQuery, useStorage, useToggle } from '@vueuse/core';
  import { defineStore } from 'pinia';
  import { type Ref, watch, computed } from 'vue';
  import { useRoute } from 'vue-router';

  export const useStyleStore = defineStore('style', {
    state: () => {
      const isDarkTheme = useDark();
      const toggleDark = useToggle(isDarkTheme);
      const isSmallScreen = useMediaQuery('(max-width: 700px)');
      const isMenuCollapsed = useStorage('isMenuCollapsed', isSmallScreen.value) as Ref<boolean>;

      watch(isSmallScreen, v => (isMenuCollapsed.value = v));

      const route = useRoute();
      const isModalMode = computed(() => route?.query?.mode === 'modal');

      return {
        isDarkTheme,
        toggleDark,
        isMenuCollapsed,
        isSmallScreen,
        isModalMode,
      };
    },
  });
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `npx vitest run src/stores/style.store.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**

  Run:
  ```bash
  git add src/stores/style.store.ts src/stores/style.store.test.ts
  git commit -m "feat: add isModalMode to style store with tests"
  ```

---

### Task 2: Router Configuration

**Files:**
- Modify: `src/router.ts`

**Interfaces:**
- Consumes: `chrome.runtime` extension API
- Produces: Router configured to use `createWebHashHistory()` when inside a Chrome Extension context

- [ ] **Step 1: Update routing history selection**

  Modify `src/router.ts` around line 1:
  ```ts
  import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router';
  ```

  And change the instantiation of `router` around line 21-22:
  ```ts
  const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

  const router = createRouter({
    history: isExtension
      ? createWebHashHistory()
      : createWebHistory(config.app.baseUrl),
    routes: [
  ```

- [ ] **Step 2: Verify typecheck passes**

  Run: `pnpm typecheck`
  Expected: Exit code 0, no compilation errors.

- [ ] **Step 3: Commit**

  Run:
  ```bash
  git add src/router.ts
  git commit -m "feat: use hash routing in chrome extension environment"
  ```

---

### Task 3: Layout Modifications

**Files:**
- Modify: `src/components/MenuLayout.vue`
- Modify: `src/layouts/base.layout.vue`

- [ ] **Step 1: Update MenuLayout.vue**

  Modify `src/components/MenuLayout.vue` to check `isModalMode` and hide the sider:
  ```html
  <template>
    <n-layout :has-sider="!styleStore.isModalMode">
      <n-layout-sider
        v-if="!styleStore.isModalMode"
        bordered
        collapse-mode="width"
        :collapsed-width="0"
        :width="240"
        :collapsed="isMenuCollapsed"
        :show-trigger="false"
        :native-scrollbar="false"
        :position="siderPosition"
      >
        <slot name="sider" />
      </n-layout-sider>
      <n-layout class="content" :class="{ 'modal-mode': styleStore.isModalMode }">
        <slot name="content" />
        <div v-show="isSmallScreen && !isMenuCollapsed" class="overlay" @click="isMenuCollapsed = true" />
      </n-layout>
    </n-layout>
  </template>
  ```

  Update the styles in `MenuLayout.vue` to remove padding when modal mode is active:
  ```less
  .content {
    // background-color: #f1f5f9;
    &.modal-mode {
      ::v-deep(.n-layout-scroll-container) {
        padding: 0;
      }
    }
    ::v-deep(.n-layout-scroll-container) {
      padding: 26px;
    }
  }
  ```

- [ ] **Step 2: Update base.layout.vue**

  Modify `src/layouts/base.layout.vue` to hide top navbar buttons in modal mode:
  ```html
  <template #content>
    <div v-if="!styleStore.isModalMode" flex items-center justify-center gap-2>
      <c-button
        circle
        variant="text"
        :aria-label="$t('home.toggleMenu')"
        @click="styleStore.isMenuCollapsed = !styleStore.isMenuCollapsed"
      >
        <NIcon size="25" :component="Menu2" />
      </c-button>
  
      <c-tooltip :tooltip="$t('home.home')" position="bottom">
        <c-button to="/" circle variant="text" :aria-label="$t('home.home')">
          <NIcon size="25" :component="Home2" />
        </c-button>
      </c-tooltip>
  
      <c-tooltip :tooltip="$t('home.uiLib')" position="bottom">
        <c-button v-if="config.app.env === 'development'" to="/c-lib" circle variant="text" :aria-label="$t('home.uiLib')">
          <icon-mdi:brush-variant text-20px />
        </c-button>
      </c-tooltip>
  
      <command-palette />
  
      <locale-selector v-if="!styleStore.isSmallScreen" />
  
      <div>
        <NavbarButtons v-if="!styleStore.isSmallScreen" />
      </div>
  
      <c-tooltip position="bottom" :tooltip="$t('home.support')">
        <c-button
          round
          href="https://www.buymeacoffee.com/cthmsst"
          rel="noopener"
          target="_blank"
          class="support-button"
          :bordered="false"
          @click="() => tracker.trackEvent({ eventName: 'Support button clicked' })"
        >
          {{ $t('home.buyMeACoffee') }}
          <NIcon v-if="!styleStore.isSmallScreen" :component="Heart" ml-2 />
        </c-button>
      </c-tooltip>
    </div>
    <slot />
  </template>
  ```

- [ ] **Step 3: Commit**

  Run:
  ```bash
  git add src/components/MenuLayout.vue src/layouts/base.layout.vue
  git commit -m "style: hide navigation and adjust scroll padding in modal mode"
  ```

---

### Task 4: RouterView Prop Binding

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Update RouterView component to bind route query input**

  Modify `src/App.vue` to dynamically pass the `input` query parameter as `initialValue` prop to all matched route components:
  ```html
  <component :is="layout">
    <RouterView v-slot="{ Component }">
      <component :is="Component" :initial-value="(route.query.input as string)" />
    </RouterView>
  </component>
  ```

- [ ] **Step 2: Commit**

  Run:
  ```bash
  git add src/App.vue
  git commit -m "feat: pass input query param to RouterView components"
  ```

---

### Task 5: Vite Plugins Extraction

**Files:**
- Create: `vite.config.base.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: Create base Vite config**

  Create `vite.config.base.ts` with shared plugin dependencies:
  ```ts
  import { resolve } from 'node:path';
  import VueI18n from '@intlify/unplugin-vue-i18n/vite';
  import vue from '@vitejs/plugin-vue';
  import vueJsx from '@vitejs/plugin-vue-jsx';
  import Unocss from 'unocss/vite';
  import AutoImport from 'unplugin-auto-import/vite';
  import IconsResolver from 'unplugin-icons/resolver';
  import Icons from 'unplugin-icons/vite';
  import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
  import Components from 'unplugin-vue-components/vite';
  import { VitePWA } from 'vite-plugin-pwa';
  import markdown from 'vite-plugin-vue-markdown';
  import svgLoader from 'vite-svg-loader';

  export function createPlugins({ pwa = true, baseUrl = '/' } = {}) {
    return [
      VueI18n({
        runtimeOnly: true,
        jitCompilation: true,
        compositionOnly: true,
        fullInstall: true,
        strictMessage: false,
        include: [
          resolve(__dirname, 'locales/**'),
        ],
      }),
      AutoImport({
        imports: [
          'vue',
          'vue-router',
          '@vueuse/core',
          'vue-i18n',
          {
            'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar'],
          },
        ],
        vueTemplate: true,
        eslintrc: {
          enabled: true,
        },
      }),
      Icons({ compiler: 'vue3' }),
      vue({
        include: [/\.vue$/, /\.md$/],
      }),
      vueJsx(),
      markdown(),
      svgLoader(),
      pwa && VitePWA({
        registerType: 'autoUpdate',
        strategies: 'generateSW',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,json}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        manifest: {
          name: 'IT Tools',
          description: 'Aggregated set of useful tools for developers.',
          display: 'standalone',
          lang: 'fr-FR',
          start_url: `${baseUrl}?utm_source=pwa&utm_medium=pwa`,
          orientation: 'any',
          theme_color: '#18a058',
          background_color: '#f1f5f9',
          icons: [
            {
              src: '/favicon-16x16.png',
              type: 'image/png',
              sizes: '16x16',
            },
            {
              src: '/favicon-32x32.png',
              type: 'image/png',
              sizes: '32x32',
            },
            {
              src: '/android-chrome-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/android-chrome-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
      Components({
        dirs: ['src/'],
        extensions: ['vue', 'md'],
        include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
        resolvers: [NaiveUiResolver(), IconsResolver({ prefix: 'icon' })],
      }),
      Unocss(),
    ].filter(Boolean);
  }
  ```

- [ ] **Step 2: Modify vite.config.ts**

  Update `vite.config.ts` to consume `createPlugins`:
  ```ts
  import { URL, fileURLToPath } from 'node:url';
  import { defineConfig } from 'vite';
  import { configDefaults } from 'vitest/config';
  import { createPlugins } from './vite.config.base';

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
    },
    build: {
      target: 'esnext',
    },
  });
  ```

- [ ] **Step 3: Run web build to verify base works**

  Run: `pnpm build`
  Expected: Successful production build without PWA errors.

- [ ] **Step 4: Commit**

  Run:
  ```bash
  git add vite.config.base.ts vite.config.ts
  git commit -m "refactor: extract vite plugins to shared base config"
  ```

---

### Task 6: Extension Background & Content Scripts

**Files:**
- Create: `src/extension/background.ts`
- Create: `src/extension/content.ts`

- [ ] **Step 1: Write background.ts**

  Create `src/extension/background.ts`:
  ```ts
  // Register context menu items on installation
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'it-tools',
      title: 'IT Tools',
      contexts: ['selection', 'link']
    });

    chrome.contextMenus.create({
      parentId: 'it-tools',
      id: 'qr',
      title: 'Generate QR Code',
      contexts: ['selection', 'link']
    });

    chrome.contextMenus.create({
      parentId: 'it-tools',
      id: 'stats',
      title: 'Text Statistics',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      parentId: 'it-tools',
      id: 'datetime',
      title: 'Date-Time Converter',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      parentId: 'it-tools',
      id: 'base64',
      title: 'Base64 Encode',
      contexts: ['selection']
    });
  });

  // Listen to menu clicks
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab?.id) return;

    let payload = '';
    if (info.menuItemId === 'qr' && info.linkUrl) {
      payload = info.linkUrl;
    } else if (info.selectionText) {
      payload = info.selectionText;
    }

    const toolMap: Record<string, string> = {
      qr: 'qr-code-generator',
      stats: 'text-statistics',
      datetime: 'date-time-converter',
      base64: 'base64-string-converter'
    };

    const targetRoute = toolMap[info.menuItemId];
    if (targetRoute) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'open-tool',
        route: targetRoute,
        input: payload
      });
    }
  });
  ```

- [ ] **Step 2: Write content.ts**

  Create `src/extension/content.ts`:
  ```ts
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'open-tool') {
      const { route, input } = message;
      showModal(route, input);
    }
  });

  function showModal(route: string, input: string) {
    // If modal already exists, remove it first
    const existing = document.getElementById('__it-tools-ext');
    if (existing) {
      existing.remove();
    }

    const host = document.createElement('div');
    host.id = '__it-tools-ext';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    // Styles for Shadow DOM
    const style = document.createElement('style');
    style.textContent = `
      .overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647;
      }
      iframe {
        width: 90%;
        height: 85%;
        border: none;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
        background-color: white;
      }
    `;
    shadow.appendChild(style);

    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const iframe = document.createElement('iframe');
    const encodedInput = encodeURIComponent(input);
    const extensionUrl = chrome.runtime.getURL(`index.html#/${route}?input=${encodedInput}&mode=modal`);
    iframe.src = extensionUrl;

    overlay.appendChild(iframe);
    shadow.appendChild(overlay);

    // Dismiss when clicking the overlay (outside iframe)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        host.remove();
      }
    });

    // Dismiss when Escape key is pressed
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        host.remove();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
  }
  ```

- [ ] **Step 3: Commit**

  Run:
  ```bash
  git add src/extension/background.ts src/extension/content.ts
  git commit -m "feat: implement extension background worker and content injector"
  ```

---

### Task 7: Extension Configurations & Manifest

**Files:**
- Create: `manifest.json`
- Create: `vite.config.ext.ts`
- Create: `scripts/copy-manifest.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create manifest.json**

  Create `manifest.json` at the root directory:
  ```json
  {
    "manifest_version": 3,
    "name": "my-it-tools",
    "description": "Developer utilities accessible via right-click on any page.",
    "version": "1.0.0",
    "action": {
      "default_title": "my-it-tools"
    },
    "background": {
      "service_worker": "background.js",
      "type": "module"
    },
    "content_scripts": [
      {
        "matches": ["<all_urls>"],
        "js": ["content.js"],
        "run_at": "document_idle"
      }
    ],
    "web_accessible_resources": [
      {
        "resources": ["index.html", "assets/*"],
        "matches": ["<all_urls>"]
      }
    ],
    "permissions": ["contextMenus", "activeTab"],
    "icons": {
      "16":  "favicon-16x16.png",
      "32":  "favicon-32x32.png",
      "128": "android-chrome-192x192.png"
    }
  }
  ```

- [ ] **Step 2: Create vite.config.ext.ts**

  Create `vite.config.ext.ts`:
  ```ts
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
  ```

- [ ] **Step 3: Create copy-manifest.mjs script**

  Create `scripts/copy-manifest.mjs`:
  ```js
  import fs from 'node:fs';
  import path from 'node:path';

  const src = path.resolve('manifest.json');
  const dest = path.resolve('dist-ext', 'manifest.json');

  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log('✓ manifest.json successfully copied to dist-ext');
  } catch (error) {
    console.error('Failed to copy manifest.json:', error);
    process.exit(1);
  }
  ```

- [ ] **Step 4: Update scripts in package.json**

  Modify `package.json` to append the build scripts:
  ```json
      "release": "node ./scripts/release.mjs",
      "build:ext": "vue-tsc --noEmit && vite build --config vite.config.ext.ts",
      "postbuild:ext": "node scripts/copy-manifest.mjs"
  ```

- [ ] **Step 5: Run Extension Build locally to test**

  Run: `pnpm build:ext`
  Expected: Exit code 0, `dist-ext` contains `manifest.json`, `index.html`, `background.js`, `content.js` and `assets/`.

- [ ] **Step 6: Commit**

  Run:
  ```bash
  git add manifest.json vite.config.ext.ts scripts/copy-manifest.mjs package.json
  git commit -m "chore: setup extension manifest, build targets, and build scripts"
  ```
