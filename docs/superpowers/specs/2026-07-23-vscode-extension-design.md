# VS Code Extension Design — my-it-tools

**Date:** 2026-07-23
**Status:** Approved
**Scope:** Editor right-click context menu → Webview Panel with IT Tools UI

---

## 1. Overview

Add a VS Code extension to the existing `my-it-tools` monorepo that allows developers to right-click selected text in any editor file and invoke supported IT Tools via a Webview Panel. The panel renders the existing Vue app — identical to the Chrome extension iframe, using the same `mode=vscode` URL flag to hide navigation chrome and add a "Open in Browser" button.

No new tool components are needed. The VS Code extension reuses the Chrome extension web bundle (`dist-ext/`) as its webview content.

---

## 2. Supported Tools

Tools exposed in the editor right-click submenu when text is selected:

| Command ID | Label | Route | Input |
|---|---|---|---|
| `my-it-tools.qr` | Generate QR Code | `qrcode-generator` | selected text |
| `my-it-tools.stats` | Text Statistics | `text-statistics` | selected text |
| `my-it-tools.datetime` | Date-Time Converter | `date-converter` | selected text |
| `my-it-tools.base64` | Base64 Encode | `base64-string-converter` | selected text |
| `my-it-tools.json` | JSON Viewer | `json-viewer` | selected text |
| `my-it-tools.url` | URL Encoder | `url-encoder` | selected text |
| `my-it-tools.hash` | Hash Text | `hash-text` | selected text |
| `my-it-tools.slugify` | Slugify String | `slugify-string` | selected text |

**Additional command (Command Palette only):**

| Command ID | Label |
|---|---|
| `my-it-tools.openAll` | IT Tools: Open All Tools |

---

## 3. Extension Structure

```
src/vscode-extension/
  extension.ts           # Extension host entry point (Node.js)

vscode.package.json      # VS Code extension manifest (contributes, commands, menus)

vite.config.vscode.ts    # Builds extension.ts → dist-vscode/extension.js (CJS, Node target)

dist-vscode/             # Full packaged extension (gitignored)
  extension.js           # Compiled extension host
  webview/               # Web app (copied from dist-ext/)
    index.html
    assets/
  package.json           # Copied from vscode.package.json at build time
```

New files only. No modification to existing tool components required beyond adding `mode=vscode` detection alongside the existing `mode=modal`.

---

## 4. User Flow

```
User selects text in VS Code editor
        │
        └─► Right-click → "IT Tools" submenu  (when: editorHasSelection)
                    ├── Generate QR Code
                    ├── Text Statistics
                    ├── Date-Time Converter
                    ├── Base64 Encode
                    ├── JSON Viewer
                    ├── URL Encoder
                    ├── Hash Text
                    └── Slugify String
                              │
                              ▼
                    extension.ts handles vscode.commands.registerCommand
                    reads editor.selection → selectedText
                              │
                              ▼
                    Creates (or reveals) WebviewPanel in ViewColumn.Beside
                    panel title: "IT Tools — <Tool Name>"
                    webview.html loads: webview/index.html#/<route>?input=<encoded>&mode=vscode
                              │
                              ▼
                    Vue app boots in webview
                    reads ?input= → :initialValue to tool component
                    nav hidden + "🌐 Open in Browser" button shown (mode=vscode)
                              │
                    User clicks "Open in Browser"
                              │
                              ▼
                    Webview postMessage({ command: 'openInBrowser', url: '...' })
                    extension.ts → vscode.env.openExternal()
                    Opens https://my-it-tools.vercel.app/#/<route>?input=<encoded>
```

---

## 5. Context Menu Registration (`vscode.package.json`)

```json
"contributes": {
  "submenus": [
    { "id": "my-it-tools.submenu", "label": "IT Tools" }
  ],
  "commands": [
    { "command": "my-it-tools.qr",       "title": "Generate QR Code" },
    { "command": "my-it-tools.stats",    "title": "Text Statistics" },
    { "command": "my-it-tools.datetime", "title": "Date-Time Converter" },
    { "command": "my-it-tools.base64",   "title": "Base64 Encode" },
    { "command": "my-it-tools.json",     "title": "JSON Viewer" },
    { "command": "my-it-tools.url",      "title": "URL Encoder" },
    { "command": "my-it-tools.hash",     "title": "Hash Text" },
    { "command": "my-it-tools.slugify",  "title": "Slugify String" },
    { "command": "my-it-tools.openAll",  "title": "IT Tools: Open All Tools" }
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
```

The submenu only appears `when: editorHasSelection` — no clutter on empty selections.

---

## 6. Webview Panel

- Created via `vscode.window.createWebviewPanel()` in `ViewColumn.Beside`.
- Only **one panel instance** at a time: on a second command, the existing panel is revealed and its `webview.html` is reassigned with the new route + input.
- Panel title: `"IT Tools — <Tool Name>"` (e.g. `"IT Tools — JSON Viewer"`).
- `localResourceRoots` restricted to `dist-vscode/webview/` only.
- CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:`.

### URL Scheme

```
<webviewBaseUri>/index.html#/<route>?input=<encoded>&mode=vscode
```

### Webview → Host Message Protocol

```ts
// Webview sends (from Vue app when "Open in Browser" is clicked):
acquireVsCodeApi().postMessage({
  command: 'openInBrowser',
  url: 'https://my-it-tools.vercel.app/#/json-viewer?input=...',
})

// extension.ts receives:
panel.webview.onDidReceiveMessage(msg => {
  if (msg.command === 'openInBrowser') {
    vscode.env.openExternal(vscode.Uri.parse(msg.url))
  }
})
```

---

## 7. App — VS Code Mode (`mode=vscode`)

Extends the existing `isModalMode` pattern in `useStyleStore`:

```ts
// src/stores/style.store.ts
const isModalMode = computed(() => route.query.mode === 'modal')
const isVscodeMode = computed(() => route.query.mode === 'vscode')
```

When `isVscodeMode` is true:
- Hides `NLayoutSider` (sidebar) and `NavbarButtons` (top nav) — same as modal mode.
- Shows a **"🌐 Open in Browser"** button in the top-right of the tool view.
- The button constructs the hosted URL (`https://my-it-tools.vercel.app/#/<route>?input=<encoded>`) and calls `window.vscodeApi.postMessage(...)`.

VS Code API is acquired once at app boot (guarded by `typeof acquireVsCodeApi !== 'undefined'`) and stored in a composable (`useVscodeApi`).

---

## 8. Vite Build — VS Code Extension Host

`vite.config.vscode.ts` builds only the Node.js extension host:

```ts
export default defineConfig({
  build: {
    lib: {
      entry: 'src/vscode-extension/extension.ts',
      formats: ['cjs'],
      fileName: () => 'extension.js',
    },
    outDir: 'dist-vscode',
    target: 'node18',
    rollupOptions: {
      external: ['vscode'],  // VS Code API provided by host, never bundled
    },
    emptyOutDir: false,      // Preserve webview assets copied in prior step
  },
})
```

---

## 9. Build Pipeline & Scripts

```json
"build:vscode-webview": "vite build --config vite.config.ext.ts",
"build:vscode-host":    "vite build --config vite.config.vscode.ts",
"build:vscode":         "run-s build:vscode-webview script:vscode:copy-assets build:vscode-host",
"package:vscode":       "cd dist-vscode && vsce package --no-dependencies"
```

`script:vscode:copy-assets` (a Node.js script in `scripts/`):
1. Copies `dist-ext/*` → `dist-vscode/webview/`
2. Copies `vscode.package.json` → `dist-vscode/package.json`

---

## 10. VS Code Extension Manifest (`vscode.package.json`)

Key fields:

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
  "contributes": { "..." }
}
```

`activationEvents: []` — VS Code 1.74+ activates extensions automatically based on `contributes.commands` entries; no explicit events needed.

---

## 11. GitHub Actions — Release Asset

Attaches `.vsix` to every tagged release alongside the Chrome extension zip:

```yaml
- name: Build VS Code extension
  run: pnpm build:vscode

- name: Package VSIX
  run: pnpm package:vscode

- name: Upload VSIX asset
  uses: softprops/action-gh-release@v1
  with:
    files: dist-vscode/*.vsix
```

---

## 12. README Update

Add an **"Extensions"** section to `README.md` covering:
- **Chrome extension** — installation from zip (existing content, reorganised under new heading).
- **VS Code extension** — installation from `.vsix` via Extensions panel → "Install from VSIX…".
- Brief description of the right-click UX and which tools are available in each.

---

## 13. Out of Scope (v1)

- VS Code Marketplace submission.
- Explorer/file context menu (right-click on files in sidebar).
- Output channel / status bar integration.
- Extension settings / configuration page.
- Firefox / Edge browser extension.
- Keyboard shortcut bindings for individual tools.
