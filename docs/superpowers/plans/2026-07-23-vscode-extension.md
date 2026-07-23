# VS Code Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a VS Code extension to the monorepo so developers can right-click selected editor text to open IT Tools in a Webview Panel, with an "Open in Browser" button.

**Architecture:** The extension reuses the Chrome extension web bundle (`dist-ext/`) as the webview content. A new `src/vscode-extension/extension.ts` Node.js host registers editor context-menu commands, manages a single Webview Panel, and handles postMessage routing. The Vue app gains an `isVscodeMode` flag (mirroring `isModalMode`) that hides navigation and shows an "Open in Browser" button.

**Tech Stack:** Vue 3, Pinia, Vite (lib mode for Node.js CJS target), `@types/vscode`, `@vscode/vsce`

## Global Constraints

- VS Code engine requirement: `^1.85.0` (submenus API stable)
- Extension host output format: CommonJS (`cjs`) — VS Code requires it
- `vscode` package must be listed in `rollupOptions.external` — never bundled
- Webview `localResourceRoots` must be restricted to `dist-vscode/webview/` only
- One WebviewPanel instance at a time — reuse/reveal on subsequent commands
- `mode=vscode` query flag in hash URL — same detection pattern as `mode=modal`
- Hosted URL for "Open in Browser": `https://my-it-tools.web.app/#`
- Route for json-viewer is `/json-prettify` (the `/json-viewer` path is a redirect)
- All build scripts run on Linux CI (bash `&&` chaining is fine)

---

### Task 1: App — `mode=vscode` UI integration

Add `isVscodeMode` to the style store, a `useVscodeApi` composable, hide the sider in VS Code mode, and add an "Open in Browser" button.

**Files:**
- Modify: `src/stores/style.store.ts`
- Modify: `src/stores/style.store.test.ts`
- Create: `src/composable/useVscodeApi.ts`
- Modify: `src/components/MenuLayout.vue`
- Modify: `src/layouts/base.layout.vue`

**Interfaces:**
- Produces: `styleStore.isVscodeMode: boolean` — consumed by MenuLayout and base.layout
- Produces: `useVscodeApi(): VscodeApi | null` — consumed by base.layout's `openInBrowser()`

---

- [ ] **Step 1: Add failing tests for `isVscodeMode` in `style.store.test.ts`**

Append two new test cases inside the existing `describe('style store')` block:

```ts
// src/stores/style.store.test.ts  (append inside the describe block)

it('returns false for isVscodeMode by default', () => {
  const store = useStyleStore();
  expect(store.isVscodeMode).toBe(false);
});

it('detects isVscodeMode when mode=vscode is present in query', () => {
  mockRoute.query.mode = 'vscode';
  const store = useStyleStore();
  expect(store.isVscodeMode).toBe(true);
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run --environment jsdom src/stores/style.store.test.ts
```

Expected: 2 new tests FAIL with `store.isVscodeMode is not a function` or similar.

- [ ] **Step 3: Add `isVscodeMode` getter to `src/stores/style.store.ts`**

Add alongside the existing `isModalMode` getter:

```ts
// src/stores/style.store.ts
export const useStyleStore = defineStore('style', {
  state: () => {
    const isDarkTheme = useDark();
    const toggleDark = useToggle(isDarkTheme);
    const isSmallScreen = useMediaQuery('(max-width: 700px)');
    const isMenuCollapsed = useStorage('isMenuCollapsed', isSmallScreen.value) as Ref<boolean>;

    watch(isSmallScreen, v => (isMenuCollapsed.value = v));

    return {
      isDarkTheme,
      toggleDark,
      isMenuCollapsed,
      isSmallScreen,
    };
  },
  getters: {
    isModalMode: () => {
      const route = useRoute();
      return route?.query?.mode === 'modal';
    },
    isVscodeMode: () => {
      const route = useRoute();
      return route?.query?.mode === 'vscode';
    },
  },
});
```

- [ ] **Step 4: Create `src/composable/useVscodeApi.ts`**

```ts
// src/composable/useVscodeApi.ts

interface VscodeApi {
  postMessage(data: unknown): void;
}

/**
 * Returns the VS Code API injected by the extension host init script,
 * or null when running outside a VS Code webview (web app, Chrome extension).
 */
export function useVscodeApi(): VscodeApi | null {
  return (window as Window & { __vscodeApi?: VscodeApi }).__vscodeApi ?? null;
}
```

- [ ] **Step 5: Update `src/components/MenuLayout.vue` to hide sider in VS Code mode**

The sider `v-if` and `:has-sider` binding currently check only `isModalMode`. Extend them to also handle `isVscodeMode`. Also apply the `modal-mode` class (which removes padding) when in VS Code mode:

```vue
<!-- src/components/MenuLayout.vue — full file replacement -->
<script setup lang="ts">
import { useStyleStore } from '@/stores/style.store';

const styleStore = useStyleStore();
const { isMenuCollapsed, isSmallScreen } = toRefs(styleStore);
const siderPosition = computed(() => (isSmallScreen.value ? 'absolute' : 'static'));
const hideSider = computed(() => styleStore.isModalMode || styleStore.isVscodeMode);
</script>

<template>
  <n-layout :has-sider="!hideSider">
    <n-layout-sider
      v-if="!hideSider"
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
    <n-layout class="content" :class="{ 'modal-mode': hideSider }">
      <slot name="content" />
      <div v-show="isSmallScreen && !isMenuCollapsed" class="overlay" @click="isMenuCollapsed = true" />
    </n-layout>
  </n-layout>
</template>

<style lang="less" scoped>
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #00000080;
  cursor: pointer;
}

.content {
  &.modal-mode {
    ::v-deep(.n-layout-scroll-container) {
      padding: 0;
    }
  }
  ::v-deep(.n-layout-scroll-container) {
    padding: 26px;
  }
}

.n-layout {
  height: 100vh;
}
</style>
```

- [ ] **Step 6: Update `src/layouts/base.layout.vue` — hide topbar + add "Open in Browser" button**

In the `<script setup>` section, add the import and function:

```ts
// Add inside <script setup lang="ts"> — after existing imports
import { useVscodeApi } from '@/composable/useVscodeApi';

const route = useRoute();

function openInBrowser() {
  const api = useVscodeApi();
  if (!api) { return; }
  const hostedBase = 'https://my-it-tools.web.app/#';
  const input = route.query.input ? `?input=${route.query.input}` : '';
  api.postMessage({ command: 'openInBrowser', url: `${hostedBase}${route.path}${input}` });
}
```

In the `<template #content>` section, change the existing topbar `v-if` and add the VS Code toolbar div **immediately after it**:

```html
<!-- BEFORE (line 93): -->
<div v-if="!styleStore.isModalMode" flex items-center justify-center gap-2>

<!-- AFTER: -->
<div v-if="!styleStore.isModalMode && !styleStore.isVscodeMode" flex items-center justify-center gap-2>
```

Add this block **right after** the topbar `</div>`, still inside `<template #content>`:

```html
<!-- VS Code mode toolbar -->
<div v-if="styleStore.isVscodeMode" style="display:flex;justify-content:flex-end;padding:8px 16px;">
  <c-button size="small" variant="text" @click="openInBrowser">
    🌐 Open in Browser
  </c-button>
</div>
```

- [ ] **Step 7: Run tests to confirm they now pass**

```bash
npx vitest run --environment jsdom src/stores/style.store.test.ts
```

Expected: All 4 tests PASS (2 existing + 2 new).

- [ ] **Step 8: Run full test suite, linter, and typecheck**

```bash
npx vitest run --environment jsdom
pnpm lint
pnpm typecheck
```

Expected: All pass with zero errors or warnings.

- [ ] **Step 9: Commit**

```bash
git add src/stores/style.store.ts src/stores/style.store.test.ts src/composable/useVscodeApi.ts src/components/MenuLayout.vue src/layouts/base.layout.vue
git commit -m "feat: add mode=vscode support with isVscodeMode flag and Open in Browser button"
```

---

### Task 2: VS Code extension host + build infrastructure

Create the VS Code extension manifest, the extension host entry point, the Vite build config for it, the asset copy script, and wire up `package.json` scripts.

**Files:**
- Create: `src/vscode-extension/extension.ts`
- Create: `vscode.package.json`
- Create: `vite.config.vscode.ts`
- Create: `scripts/copy-vscode-assets.mjs`
- Modify: `package.json` — add 4 scripts + 2 devDependencies
- Modify: `.gitignore` — add `dist-vscode/`

**Interfaces:**
- Consumes: `isVscodeMode` (from Task 1 — handled purely via URL hash, no import needed in extension host)
- Produces: `dist-vscode/` — a loadable VS Code extension directory containing `extension.js`, `webview/`, and `package.json`

---

- [ ] **Step 1: Install new dev dependencies**

```bash
pnpm add -D @types/vscode@^1.85.0 @vscode/vsce@^2.24.0
```

Expected: both packages added to `devDependencies` in `package.json`.

- [ ] **Step 2: Create `vscode.package.json`** (VS Code extension manifest — NOT the root package.json)

```json
{
  "name": "my-it-tools",
  "displayName": "MY IT Tools",
  "description": "Developer utilities accessible via right-click in the editor.",
  "version": "1.0.0",
  "publisher": "tienlx93",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Other"],
  "activationEvents": [],
  "main": "./extension.js",
  "contributes": {
    "submenus": [
      { "id": "my-it-tools.submenu", "label": "IT Tools" }
    ],
    "commands": [
      { "command": "my-it-tools.qr",       "title": "Generate QR Code" },
      { "command": "my-it-tools.stats",     "title": "Text Statistics" },
      { "command": "my-it-tools.datetime",  "title": "Date-Time Converter" },
      { "command": "my-it-tools.base64",    "title": "Base64 Encode" },
      { "command": "my-it-tools.json",      "title": "JSON Viewer" },
      { "command": "my-it-tools.url",       "title": "URL Encoder" },
      { "command": "my-it-tools.hash",      "title": "Hash Text" },
      { "command": "my-it-tools.slugify",   "title": "Slugify String" },
      { "command": "my-it-tools.openAll",   "title": "IT Tools: Open All Tools" }
    ],
    "menus": {
      "editor/context": [
        {
          "submenu": "my-it-tools.submenu",
          "when": "editorHasSelection",
          "group": "9_cutcopypaste@100"
        }
      ],
      "my-it-tools.submenu": [
        { "command": "my-it-tools.qr" },
        { "command": "my-it-tools.stats" },
        { "command": "my-it-tools.datetime" },
        { "command": "my-it-tools.base64" },
        { "command": "my-it-tools.json" },
        { "command": "my-it-tools.url" },
        { "command": "my-it-tools.hash" },
        { "command": "my-it-tools.slugify" }
      ]
    }
  }
}
```

- [ ] **Step 3: Create `src/vscode-extension/extension.ts`**

```ts
// src/vscode-extension/extension.ts
import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';

const TOOL_MAP: Record<string, { route: string; label: string }> = {
  'my-it-tools.qr':       { route: 'qrcode-generator',       label: 'Generate QR Code' },
  'my-it-tools.stats':    { route: 'text-statistics',         label: 'Text Statistics' },
  'my-it-tools.datetime': { route: 'date-converter',          label: 'Date-Time Converter' },
  'my-it-tools.base64':   { route: 'base64-string-converter', label: 'Base64 Encode' },
  'my-it-tools.json':     { route: 'json-prettify',           label: 'JSON Viewer' },
  'my-it-tools.url':      { route: 'url-encoder',             label: 'URL Encoder' },
  'my-it-tools.hash':     { route: 'hash-text',               label: 'Hash Text' },
  'my-it-tools.slugify':  { route: 'slugify-string',          label: 'Slugify String' },
};

let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  for (const [commandId, tool] of Object.entries(TOOL_MAP)) {
    context.subscriptions.push(
      vscode.commands.registerCommand(commandId, () => {
        const editor = vscode.window.activeTextEditor;
        const selected = editor ? editor.document.getText(editor.selection) : '';
        openPanel(context, tool.route, tool.label, selected);
      }),
    );
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('my-it-tools.openAll', () => {
      openPanel(context, '', 'IT Tools', '');
    }),
  );
}

function openPanel(
  context: vscode.ExtensionContext,
  route: string,
  label: string,
  input: string,
): void {
  const webviewDir = vscode.Uri.joinPath(context.extensionUri, 'webview');
  const title = route ? `IT Tools — ${label}` : 'IT Tools';

  if (currentPanel) {
    currentPanel.title = title;
    currentPanel.webview.html = buildHtml(currentPanel.webview, webviewDir, route, input);
    currentPanel.reveal(vscode.ViewColumn.Beside);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'my-it-tools',
    title,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [webviewDir],
      retainContextWhenHidden: true,
    },
  );

  panel.webview.html = buildHtml(panel.webview, webviewDir, route, input);

  panel.webview.onDidReceiveMessage((msg: { command: string; url: string }) => {
    if (msg.command === 'openInBrowser') {
      void vscode.env.openExternal(vscode.Uri.parse(msg.url));
    }
  });

  panel.onDidDispose(() => {
    currentPanel = undefined;
  }, null, context.subscriptions);

  currentPanel = panel;
}

function buildHtml(
  webview: vscode.Webview,
  webviewDir: vscode.Uri,
  route: string,
  input: string,
): string {
  const indexPath = path.join(webviewDir.fsPath, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  // Rewrite relative asset src/href to vscode-resource URIs
  const baseUri = webview.asWebviewUri(webviewDir).toString();
  html = html.replace(/src="(\.\/)?assets\//g, `src="${baseUri}/assets/`);
  html = html.replace(/href="(\.\/)?assets\//g, `href="${baseUri}/assets/`);

  // Build hash path for the Vue router
  const encodedInput = encodeURIComponent(input);
  const hash = route ? `/${route}?input=${encodedInput}&mode=vscode` : '/';

  // Inject init script: store vscode API + set initial hash before Vue boots
  const initScript = `<script>
try { window.__vscodeApi = acquireVsCodeApi(); } catch(e) {}
window.location.hash = ${JSON.stringify(hash)};
<\/script>`;
  html = html.replace('</head>', `${initScript}\n</head>`);

  return html;
}

export function deactivate(): void {
  currentPanel?.dispose();
}
```

- [ ] **Step 4: Create `vite.config.vscode.ts`**

```ts
// vite.config.vscode.ts
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
```

- [ ] **Step 5: Create `scripts/copy-vscode-assets.mjs`**

```js
// scripts/copy-vscode-assets.mjs
import fs from 'node:fs';
import path from 'node:path';

const distExt = path.resolve('dist-ext');
const distVscode = path.resolve('dist-vscode');
const webviewDir = path.join(distVscode, 'webview');
const manifestSrc = path.resolve('vscode.package.json');
const manifestDest = path.join(distVscode, 'package.json');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    }
    else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

fs.mkdirSync(webviewDir, { recursive: true });
copyDir(distExt, webviewDir);
console.log('✓ dist-ext/* copied to dist-vscode/webview/');

fs.copyFileSync(manifestSrc, manifestDest);
console.log('✓ vscode.package.json copied to dist-vscode/package.json');
```

- [ ] **Step 6: Add scripts to `package.json`**

In the `"scripts"` section, add these four entries:

```json
"build:vscode-webview": "vite build --config vite.config.ext.ts",
"build:vscode-host":    "vite build --config vite.config.vscode.ts",
"build:vscode":         "pnpm build:vscode-webview && node scripts/copy-vscode-assets.mjs && pnpm build:vscode-host",
"package:vscode":       "cd dist-vscode && vsce package --no-dependencies"
```

- [ ] **Step 7: Add `dist-vscode/` to `.gitignore`**

Append the following line after the existing `dist-ext` entry (line 14):

```
dist-vscode
```

- [ ] **Step 8: Verify the extension host compiles**

First build the webview bundle so `dist-ext/` exists:
```bash
pnpm build:vscode-webview
```

Then copy assets and build the host:
```bash
node scripts/copy-vscode-assets.mjs
pnpm build:vscode-host
```

Expected: `dist-vscode/extension.js` exists and is ~a few KB (only the extension host code, no Vue bundle). `dist-vscode/webview/index.html` exists.

- [ ] **Step 9: Run linter and typecheck**

```bash
pnpm lint
pnpm typecheck
```

Expected: Zero errors or warnings. Note: `@types/vscode` provides the `vscode` module types — if typecheck complains about `tsconfig.app.json` not covering `src/vscode-extension/`, add `src/vscode-extension` to the `include` array in `tsconfig.app.json`.

- [ ] **Step 10: Commit**

```bash
git add src/vscode-extension/extension.ts vscode.package.json vite.config.vscode.ts scripts/copy-vscode-assets.mjs package.json pnpm-lock.yaml .gitignore
git commit -m "feat: add VS Code extension host, manifest, and build pipeline"
```

---

### Task 3: CI/CD pipeline + README

Wire up the VSIX packaging into the existing GitHub release workflow and document the VS Code extension in the README.

**Files:**
- Modify: `.github/workflows/releases.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: `pnpm build:vscode` and `pnpm package:vscode` scripts (from Task 2)

---

- [ ] **Step 1: Update `.github/workflows/releases.yml` — add VSIX build steps**

Inside the `github-release` job, after the existing "Zip extension" step (line 84) and before the "Get changelog" step (line 86), insert:

```yaml
      - name: Build VS Code extension
        run: pnpm build:vscode

      - name: Package VSIX
        run: pnpm package:vscode
```

Also update the "Create Release" step's `files` glob to include VSIX files. Change line 98 from:

```yaml
          files: my-it-tools-*.zip
```

to:

```yaml
          files: |
            my-it-tools-*.zip
            dist-vscode/*.vsix
```

- [ ] **Step 2: Update `README.md` — add VS Code extension section**

The README already has a `## Chrome Extension` section (line 33). Add a new `## VS Code Extension` section immediately after the Chrome Extension section. Insert after line 58 (end of the Chrome Extension section):

```markdown
## VS Code Extension

Use `my-it-tools` directly inside VS Code — select any text in the editor, right-click, and choose **IT Tools** to open the tool in a panel beside your code.

**Available tools via right-click on selected text:**
- Generate QR Code
- Text Statistics
- Date-Time Converter
- Base64 Encode
- JSON Viewer
- URL Encoder
- Hash Text
- Slugify String

A **🌐 Open in Browser** button in the panel header opens the current tool on the hosted web app.

### Install from Release

1. Download `my-it-tools-X.X.X.vsix` from the [Releases](https://github.com/tienlx93/my-it-tools/releases) page.
2. Open VS Code.
3. Go to the **Extensions** panel (`Ctrl+Shift+X` / `Cmd+Shift+X`).
4. Click the **···** menu (top-right of the panel) → **Install from VSIX…**
5. Select the downloaded `.vsix` file.

### Build from Source

1. Clone the repository and install dependencies: `pnpm install`.
2. Build and package the extension:
   ```sh
   pnpm build:vscode
   pnpm package:vscode
   ```
3. Install the generated `.vsix` from `dist-vscode/` via **Install from VSIX…** as above.
```

- [ ] **Step 3: Verify full test suite, linter, and typecheck**

```bash
npx vitest run --environment jsdom
pnpm lint
pnpm typecheck
```

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/releases.yml README.md
git commit -m "feat: add VSIX release step to CI and VS Code extension docs to README"
```
