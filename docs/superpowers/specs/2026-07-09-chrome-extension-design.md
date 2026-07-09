# Design Document: Chrome Extension Integration

**Date:** 2026-07-09  
**Status:** Approved  
**Author:** Antigravity  

---

## 1. Objectives

Provide a packaged Chrome Extension (Manifest V3) that wraps the `my-it-tools` application, allowing users to:
1. Highlight text or right-click links on any web page.
2. Open a context menu option under "IT Tools".
3. Render the specific tool (QR Code Generator, Text Statistics, Date-Time Converter, or Base64 Encode) inside a clean, modal iframe injected into the target page.
4. Hide all navigation chrome in modal mode.

## 2. Architecture & File Structure

```
.
├── manifest.json                  # Extension manifest at the project root
├── vite.config.base.ts            # Shared Vite plugins factory
├── vite.config.ext.ts             # Custom Vite build config for the extension target
├── scripts/
│   └── copy-manifest.mjs          # Cross-platform manifest file copier
└── src/
    ├── router.ts                  # Router check for hash history inside extension
    ├── stores/
    │   └── style.store.ts         # isModalMode flag detection
    └── extension/
        ├── background.ts          # Service worker for context menu registration & message dispatching
        └── content.ts             # Content script to mount the Shadow DOM modal iframe
```

---

## 3. Detailed Component Designs

### 3.1 Style Store & App Router
* **`src/stores/style.store.ts`**:
  Introduce `isModalMode` computed property to detect when `?mode=modal` query parameter is present:
  ```ts
  const route = useRoute();
  const isModalMode = computed(() => route?.query?.mode === 'modal');
  ```
* **`src/router.ts`**:
  Check if `chrome.runtime.id` is available. If yes, fall back to `createWebHashHistory` since extensions do not support server-rewrites for html5 history mode:
  ```ts
  const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id;
  const history = isExtension ? createWebHashHistory() : createWebHistory(config.app.baseUrl);
  ```

### 3.2 Layout & View adjustments
* **`src/components/MenuLayout.vue`**:
  Hide `NLayoutSider` sidebar completely and apply a custom `.modal-mode` class on the content panel.
  ```html
  <n-layout :has-sider="!styleStore.isModalMode">
    <n-layout-sider v-if="!styleStore.isModalMode" ...>
  ```
  Reduce scroll padding:
  ```css
  .content.modal-mode ::v-deep(.n-layout-scroll-container) {
    padding: 0;
  }
  ```
* **`src/layouts/base.layout.vue`**:
  Hide top navigation toolbar if `styleStore.isModalMode` is true.
  ```html
  <template #content>
    <div v-if="!styleStore.isModalMode" flex items-center justify-center gap-2> ... </div>
  ```
* **`src/App.vue`**:
  Pass `route.query.input` to the sub-component rendered in `<RouterView>` using:
  ```html
  <RouterView v-slot="{ Component }">
    <component :is="Component" :initial-value="(route.query.input as string)" />
  </RouterView>
  ```

### 3.3 Extension Scripts
* **`src/extension/background.ts`**:
  Register the parent menu (`it-tools`) and children items.
  Listen for context clicks and send a message to content script in the active tab with the parsed input (`selectionText` or `linkUrl`) and the target tool:
  ```ts
  chrome.contextMenus.onClicked.addListener((info, tab) => { ... });
  ```
* **`src/extension/content.ts`**:
  Listen for incoming messages from `background.ts`.
  Inject a Shadow DOM overlay wrapper containing a fullscreen `<iframe>` pointing to the extension's local `index.html` with route, `input`, and `mode=modal` query parameter:
  ```
  chrome-extension://<id>/index.html#/<route>?input=<encoded>&mode=modal
  ```
  Close modal when clicking backdrop or pressing the `Escape` key.

### 3.4 Build Pipeline
* **`vite.config.base.ts`**: Shared plugin setup (without PWA for extension).
* **`vite.config.ext.ts`**: Vite configuration targeting the custom `dist-ext` output directory, compiling the main `index.html`, `background.ts`, and `content.ts`.
* **`scripts/copy-manifest.mjs`**: Copy `manifest.json` from the root directory to `dist-ext/` in a cross-platform manner.

---

## 4. Verification & Testing

1. Validate linting rules: `pnpm lint`.
2. Validate compilation: `pnpm typecheck`.
3. Validate tests: `pnpm test`.
4. Run `pnpm build:ext` to confirm successful build under `dist-ext/`.
