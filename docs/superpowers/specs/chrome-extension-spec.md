# Chrome Extension Spec — my-it-tools

**Version:** 1.0  
**Base app:** [tienlx93/my-it-tools](https://github.com/tienlx93/my-it-tools)  
**Manifest version:** MV3  
**Build strategy:** Full bundle (no live app dependency)

---

## 1. Overview

Wrap the existing `my-it-tools` Vue/Vite app as a Chrome extension that allows users to right-click selected text on any webpage and invoke supported tools via an in-page modal. The modal renders the tool component directly — identical to the existing in-app modal introduced in commit `153e1ef` — with navigation hidden.

---

## 2. Supported Tools

Derived from the modal implementation in `src/App.vue` (commit `153e1ef`):

| Tool Key | Component | `initialValue` prop | Context menu label |
|---|---|---|---|
| `qr` | `QRCodeGenerator` | Selected text / link URL | Generate QR Code |
| `stats` | `TextStatistics` | Selected text | Text Statistics |
| `datetime` | `DateTimeConverter` | Selected text | Date-Time Converter |
| `base64` | `Base64StringConverter` | Selected text | Base64 Encode |

All four components already accept `initialValue?: string` and watch it for changes (added in `153e1ef`).

---

## 3. Extension Structure

```
src/extension/
  manifest.json         # MV3 manifest
  background.ts         # Service worker: context menu registration + routing
  content.ts            # Injected into all pages: receives messages, mounts modal iframe

dist-ext/               # Extension build output (separate from dist/)
```

New files only. No modification to existing tool components required.

---

## 4. User Flow

```
User selects text on any webpage
        │
        └─► Right-click → context submenu "IT Tools"
                    ├── Generate QR Code
                    ├── Text Statistics
                    ├── Date-Time Converter
                    └── Base64 Encode
                              │
                              ▼
                    background.ts receives contextMenus.onClicked
                    extracts: info.selectionText | info.linkUrl
                              │
                              ▼
                    chrome.tabs.sendMessage → content.ts
                              │
                              ▼
                    content.ts injects <iframe> in shadow DOM
                    src = chrome-extension://<id>/index.html#/<route>?input=<encoded>
                              │
                              ▼
                    Vue app boots in iframe
                    reads ?input= from URL → passes as :initialValue to tool component
                    nav hidden via ?mode=modal query flag
                              │
                    User closes modal → iframe + shadow host removed from DOM
```

---

## 5. Context Menu Registration

```
IT Tools (parent)
├── Generate QR Code     [contexts: selection, link]
├── Text Statistics      [contexts: selection]
├── Date-Time Converter  [contexts: selection]
└── Base64 Encode        [contexts: selection]
```

- Parent item `it-tools` is always visible; children appear only in applicable contexts.
- `info.linkUrl` is used as input for QR when triggered from a link context (no text selected).
- `info.selectionText` is used for all other tools.

---

## 6. Content Script — Modal Injection

- Injected on `<all_urls>` at `document_idle`.
- Uses **Shadow DOM** (`mode: open`) to isolate styles from host page.
- Renders a single fullscreen `<iframe>` pointing to the bundled `index.html`.
- Only one modal instance at a time: if one exists, remove it before creating a new one.
- Clicking the backdrop (outside iframe) closes the modal.
- `Escape` key closes the modal.

### Shadow DOM structure

```
<div id="__it-tools-ext">        ← appended to document.body
  #shadow-root
    <style>                      ← minimal reset + overlay styles
    <div class="overlay">        ← backdrop, click to close
    <iframe src="...index.html#/qr-code-generator?input=...&mode=modal" />
```

---

## 7. App — Modal Mode

When `mode=modal` is present in the URL query string, the app must hide all navigation chrome so the iframe presents only the tool UI.

### Detection — `useStyleStore`

Add `isModalMode` as a computed getter to the existing `useStyleStore` (no new file needed):

```ts
// src/stores/style.store.ts
import { useRoute } from 'vue-router'

export const useStyleStore = defineStore('style', () => {
  // ...existing state (isDark, etc.)

  const route = useRoute()
  const isModalMode = computed(() => route.query.mode === 'modal')

  return {
    // ...existing
    isModalMode,
  }
})
```

`useRoute()` works here because `useStyleStore` is always called from `App.vue` setup, at which point the router is already mounted.

### What to hide

The layout wrapping `<RouterView />` renders a sidebar/top nav. When `isModalMode` is true:

- Hide `NLayoutSider` (sidebar navigation).
- Hide the top navbar / `NavbarButtons`.
- Remove outer padding/margin so the tool fills the iframe.

In the layout component:

```ts
const styleStore = useStyleStore()
```

```html
<NLayoutSider v-if="!styleStore.isModalMode" ... />
<NavbarButtons v-if="!styleStore.isModalMode" ... />
```

No prop drilling or provide/inject needed — consistent with how `isDark` is already consumed across the app.

### Route handling

The iframe URL uses hash routing:

```
chrome-extension://<id>/index.html#/qr-code-generator?input=<encoded>&mode=modal
```

`mode=modal` lives in the hash query, read automatically by `useRoute().query`.

---

## 8. Router — Hash Mode for Extension

The existing `createWebHistory()` does not work in an extension context (no server to handle path rewrites).

```ts
// src/router/index.ts
import { createWebHashHistory, createWebHistory, createRouter } from 'vue-router'

const isExtension = typeof chrome !== 'undefined'
  && !!chrome.runtime?.id

const router = createRouter({
  history: isExtension
    ? createWebHashHistory()
    : createWebHistory(import.meta.env.BASE_URL),
  routes,
})
```

No route definitions change.

---

## 9. Vite Build — Extension Target

Use a **separate config file** rather than branching inside `vite.config.ts`. This keeps the web build entirely unchanged and avoids `mergeConfig` plugin-array concatenation issues (which would leave VitePWA active in both builds).

### Extract shared plugins to a factory

```ts
// vite.config.base.ts  (new file)
export function createPlugins({ pwa = true } = {}) {
  return [
    VueI18n({...}),
    AutoImport({...}),
    Icons({...}),
    vue({...}),
    vueJsx(),
    markdown(),
    svgLoader(),
    pwa && VitePWA({...}),    // ← excluded for extension
    Components({...}),
    Unocss(),
  ].filter(Boolean)
}
```

### `vite.config.ts` — web build, unchanged behavior

```ts
import { createPlugins } from './vite.config.base'

export default defineConfig({
  plugins: createPlugins({ pwa: true }),
  base: process.env.BASE_URL ?? '/',
  build: { target: 'esnext' },
  // ...rest unchanged
})
```

### `vite.config.ext.ts` — extension build (new file)

```ts
import { createPlugins } from './vite.config.base'

export default defineConfig({
  plugins: createPlugins({ pwa: false }),
  base: './',                           // relative paths required for extensions
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
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
      output: { format: 'es', entryFileNames: '[name].js' },
    },
  },
})
```

### `package.json` scripts

```json
"build":          "vite build",
"build:ext":      "vite build --config vite.config.ext.ts",
"postbuild:ext":  "cp manifest.json dist-ext/manifest.json"
```

---

## 10. Manifest

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
    "16": "favicon-16x16.png",
    "32": "favicon-32x32.png",
    "128": "android-chrome-192x192.png"
  }
}
```

Place `manifest.json` at project root (not inside `src/`). Copy it to `dist-ext/` as part of the build — either via a Vite plugin or a `postbuild:ext` script:

```json
"postbuild:ext": "cp manifest.json dist-ext/manifest.json"
```

---

## 11. Permissions Rationale

| Permission | Reason |
|---|---|
| `contextMenus` | Register right-click menu items |
| `activeTab` | Send message to the current tab's content script |

No `host_permissions` are required. No `storage`, `tabs`, or broad host access needed for v1.

---

## 12. GitHub Actions — Release Asset

Attach the extension zip to every tagged release alongside the regular web build:

```yaml
- name: Build extension
  run: pnpm build:ext

- name: Zip extension
  run: zip -r my-it-tools-ext-${{ github.ref_name }}.zip dist-ext/

- name: Upload release asset
  uses: softprops/action-gh-release@v1
  with:
    files: my-it-tools-ext-*.zip
```

---

## 13. Installation (Unpacked — Developer Mode)

For users installing from a GitHub Release zip:

1. Download `my-it-tools-ext-vX.X.X.zip` from the Releases page.
2. Unzip the file.
3. Navigate to `chrome://extensions`.
4. Enable **Developer mode** (toggle, top-right corner).
5. Click **Load unpacked** and select the unzipped folder.

> Chrome will show a persistent banner warning that developer mode extensions are active. This is expected and cannot be suppressed for unpacked extensions.

---

## 14. Out of Scope (v1)

- Options page (no user-configurable settings needed).
- Toolbar popup (icon click action).
- Firefox / Edge compatibility.
- Chrome Web Store submission.
- Hybrid mode (live app fallback) — full bundle is sufficient given 4MB dist size.
