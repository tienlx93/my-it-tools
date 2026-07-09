# Renovate Version Upgrade Checklist (Categorized)

This document groups the proposed package upgrades into **Major Upgrades** (semantic breaking changes) and **Minor/Patch/Unchanged Upgrades** (low/no risk) to help guide safe dependency updates.

---

## 🟥 1. Major Upgrades (Potential Breaking Changes)
These updates cross major SemVer boundaries (or `0.x` to `0.y` boundaries). They should be tested and updated individually or in small batches.

### 💻 Engines, CI/CD, & GitHub Actions
- [ ] **Node.js**: `18.18.2` → `20.20.8` (or `24.18.0`)
- [ ] **pnpm**: `9.11.0` → `11.10.0`
- [ ] **@tsconfig/node18** (replaces dependency with `@tsconfig/node20`)
- [ ] **all GHA Node Runner**: `Node 20` → `Node 24`
- [ ] **actions/checkout**: `v3` → `v6` (via digest update)
- [ ] **actions/setup-node**: `v3` → `v6`
- [ ] **docker/login-action**: `v3` → `v4`
- [ ] **docker/setup-qemu-action**: `v3` → `v4`
- [ ] **docker/setup-buildx-action**: `v3` → `v4`
- [ ] **docker/build-push-action**: `v5` → `v7`

### 🚀 Production Dependencies (`dependencies`)
- [ ] **@sindresorhus/slugify**: `^2.2.1` → `^3.0.0`
- [ ] **@tiptap/pm**: `2.1.6` → `3.27.3`
- [ ] **@tiptap/starter-kit**: `2.1.6` → `3.27.3`
- [ ] **@tiptap/vue-3**: `2.0.3` → `3.27.3`
- [ ] **@vicons/material**: `^0.12.0` → `^0.13.0` (0.x major bump)
- [ ] **@vicons/tabler**: `^0.12.0` → `^0.13.0` (0.x major bump)
- [ ] **@vueuse/core**: `^10.11.1` → `^14.0.0`
- [ ] **@vueuse/head**: `^1.3.1` → `^2.0.0`
- [ ] **@vueuse/router**: `^10.0.0` → `^14.0.0`
- [ ] **bcryptjs**: `^2.4.3` → `^3.0.0`
- [ ] **change-case**: `^4.1.2` → `^5.0.0`
- [ ] **cronstrue**: `^2.26.0` → `^3.0.0`
- [ ] **date-fns**: `^2.29.3` → `^4.0.0`
- [ ] **emojilib**: `^3.0.10` → `^4.0.0`
- [ ] **figue**: `^1.2.0` → `^3.0.0`
- [ ] **fuse.js**: `^6.6.2` → `^7.0.0`
- [ ] **jwt-decode**: `^3.1.2` → `^4.0.0`
- [ ] **marked**: `^10.0.0` → `^18.0.0`
- [ ] **mathjs**: `^11.9.1` → `^15.0.0`
- [ ] **mime-types**: `^2.1.35` → `^3.0.0`
- [ ] **monaco-editor**: `^0.43.0` → `^0.55.0` (0.x major bump)
- [ ] **pinia**: `^2.0.34` → `^3.0.0`
- [ ] **sql-formatter**: `^13.0.0` → `^15.0.0`
- [ ] **ua-parser-js**: `^1.0.35` → `^2.0.0`
- [ ] **ulid**: `^2.3.0` → `^3.0.0`
- [ ] **unicode-emoji-json**: `^0.4.0` → `^0.9.0` (0.x major bump)
- [ ] **unplugin-auto-import**: `^0.16.4` → `^21.0.0` (0.x major bump)
- [ ] **uuid**: `^9.0.0` → `^14.0.0`
- [ ] **vue-i18n**: `^9.9.1` → `^11.0.0`
- [ ] **vue-router**: `^4.1.6` → `^5.0.0`
- [x] **vue-tsc**: `^1.8.1` → `^3.0.0` (Upgraded to v3 to support TypeScript 5.9)

### 🔧 Development Dependencies (`devDependencies`)
- [ ] **@antfu/eslint-config**: `^0.41.0` → `^9.0.0` (flat config transition)
- [ ] **@intlify/unplugin-vue-i18n**: `^2.0.0` → `^11.0.0`
- [ ] **@tsconfig/node18**: `^18.2.0` → `^20.1.0`
- [ ] **@types/bcryptjs**: `^2.4.2` → `^3.0.0`
- [ ] **@types/jsdom**: `^21.0.0` → `^28.0.0`
- [ ] **@types/mime-types**: `^2.1.1` → `^3.0.0`
- [ ] **@types/node**: `^18.15.11` → `^24.0.0`
- [ ] **@types/uuid**: `^9.0.0` → `^11.0.0`
- [ ] **@unocss/eslint-config**: `^0.57.0` → `^66.0.0` (0.x major bump)
- [ ] **@vitejs/plugin-vue**: `^4.3.2` → `^6.0.0`
- [ ] **@vitejs/plugin-vue-jsx**: `^3.0.2` → `^5.0.0`
- [ ] **@vue/tsconfig**: `^0.4.0` → `^0.9.0` (0.x major bump)
- [ ] **eslint**: `^8.47.0` → `^10.0.0`
- [ ] **jsdom**: `^22.0.0` → `^29.0.0`
- [ ] **typescript**: `~5.2.0` → `~7.0.0` (Upgraded to ~5.9.0 minor option)
- [ ] **unocss**: `^0.65.1` → `^66.0.0` (0.x major bump)
- [ ] **unocss-preset-scrollbar**: `^0.2.1` → `^4.0.0` (0.x major bump)
- [ ] **unplugin-icons**: `^0.17.0` → `^23.0.0` (0.x major bump)
- [ ] **unplugin-vue-components**: `^0.25.0` → `^32.0.0` (0.x major bump)
- [ ] **vite**: `^4.4.9` → `^8.0.0`
- [ ] **vite-plugin-pwa**: `^0.16.0` → `^1.0.0` (0.x major bump)
- [ ] **vite-svg-loader**: `^4.0.0` → `^5.0.0`
- [ ] **vitest**: `^0.34.0` → `^4.0.0` (0.x major bump)
- [ ] **zx**: `^7.2.1` → `^8.0.0`

---

## 🟩 2. Minor/Patch/Unchanged Updates (Low/No Risk)
These updates are backward-compatible. They can generally be upgraded directly or grouped into a single dependency update batch.

### 🚀 Production Dependencies (`dependencies`)
- [ ] **@tabler/icons-vue**: `^3.20.0` → `^3.20.0` (unchanged/no major bump)
- [x] **@tiptap/pm**: `2.1.6` → `2.27.2` (Updated)
- [x] **@tiptap/starter-kit**: `2.1.6` → `2.27.2` (Updated)
- [x] **@tiptap/vue-3**: `2.0.3` → `2.27.2` (Updated)
- [ ] **@types/figlet**: `^1.5.8` → `^1.5.8` (unchanged)
- [ ] **@vueuse/integrations**: `^14.3.0` (already updated/no change)
- [ ] **country-code-lookup**: `^0.1.0` → `^0.1.0` (unchanged)
- [ ] **cron-validator**: `^1.3.1` → `^1.3.1` (unchanged)
- [ ] **crypto-js**: `^4.1.1` → `^4.1.1` (unchanged)
- [ ] **dompurify**: `^3.0.6` → `^3.0.6` (unchanged)
- [ ] **figlet**: `^1.7.0` → `^1.7.0` (unchanged)
- [ ] **highlight.js**: `^11.7.0` → `^11.7.0` (unchanged)
- [ ] **iarna-toml-esm**: `^3.0.5` (no change)
- [ ] **ibantools**: `^4.3.3` → `^4.3.3` (unchanged)
- [ ] **js-base64**: `^3.7.6` → `^3.7.6` (unchanged)
- [ ] **json5**: `^2.2.3` (no change)
- [ ] **libphonenumber-js**: `^1.10.28` → `^1.10.28` (unchanged)
- [ ] **lodash**: `^4.17.21` → `^4.17.21` (unchanged)
- [ ] **markdown-it**: `^14.0.0` → `^14.0.0` (unchanged)
- [ ] **naive-ui**: `^2.35.0` → `^2.35.0` (unchanged)
- [ ] **netmask**: `^2.0.2` → `^2.0.2` (unchanged)
- [ ] **node-forge**: `^1.3.1` → `^1.3.1` (unchanged)
- [ ] **oui-data**: `^1.0.10` → `^1.0.10` (unchanged)
- [ ] **pdf-signature-reader**: `^1.4.2` → `^1.4.2` (unchanged)
- [ ] **plausible-tracker**: `^0.3.8` → `^0.3.8` (unchanged)
- [ ] **qrcode**: `^1.5.1` → `^1.5.1` (unchanged)
- [ ] **randexp**: `^0.5.3` (no change)
- [ ] **turndown**: `^7.2.4` (no change)
- [x] **unplugin-auto-import**: `^0.16.4` → `^0.19.0` (Updated)
- [ ] **vue**: `^3.3.4` → `^3.3.4` (unchanged)
- [ ] **vue-shadow-dom**: `^4.2.0` (no change)
- [ ] **vuedraggable**: `^4.1.0` (no change)
- [ ] **xml-formatter**: `^3.3.2` → `^3.3.2` (unchanged)
- [ ] **xml-js**: `^1.6.11` (no change)
- [ ] **yaml**: `^2.2.1` → `^2.2.1` (unchanged)

### 🔧 Development Dependencies (`devDependencies`)
- [x] **@antfu/eslint-config**: `^0.41.0` → `^0.43.0` (Updated)
- [ ] **@iconify-json/mdi**: `^1.1.50` → `^1.1.50` (unchanged)
- [ ] **@playwright/test**: `^1.32.3` → `^1.32.3` (unchanged)
- [ ] **@rushstack/eslint-patch**: `^1.2.0` → `^1.2.0` (unchanged)
- [ ] **@types/crypto-js**: `^4.1.1` → `^4.1.1` (unchanged)
- [ ] **@types/dompurify**: `^3.0.5` → `^3.0.5` (unchanged)
- [ ] **@types/lodash**: `^4.14.192` → `^4.14.192` (unchanged)
- [ ] **@types/netmask**: `^2.0.0` → `^2.0.0` (unchanged)
- [ ] **@types/node-forge**: `^1.3.2` → `^1.3.2` (unchanged)
- [ ] **@types/qrcode**: `^1.5.0` → `^1.5.0` (unchanged)
- [ ] **@types/turndown**: `^5.0.6` (no change)
- [ ] **@types/ua-parser-js**: `^0.7.36` → `^0.7.36` (unchanged)
- [ ] **@types/markdown-it**: `^13.0.7` → `^14.0.0` (Minor type update)
- [x] **@unocss/eslint-config**: `^0.57.0` → `^0.65.0` (Updated)
- [ ] **@vue/compiler-sfc**: `^3.2.47` → `^3.2.47` (unchanged)
- [ ] **@vue/runtime-dom**: `^3.3.4` → `^3.3.4` (unchanged)
- [x] **@vue/test-utils**: `^2.3.2` → `^2.4.11` (Updated to support TypeScript 5.9 compatibility)
- [ ] **consola**: `^3.0.2` → `^3.0.2` (unchanged)
- [ ] **hygen**: `^6.2.11` (no change)
- [ ] **less**: `^4.1.3` → `^4.1.3` (unchanged)
- [ ] **prettier**: `^3.0.0` → `^3.0.0` (unchanged)
- [x] **typescript**: `~5.2.0` → `~5.9.0` (Updated)
- [x] **unocss-preset-scrollbar**: `^0.2.1` → `^0.3.0` (Updated)
- [x] **unplugin-icons**: `^0.17.0` → `^0.22.0` (Updated)
- [x] **unplugin-vue-components**: `^0.25.0` → `^0.28.0` (Updated)
- [x] **vite-plugin-pwa**: `^0.16.0` → `^0.21.0` (Updated & Configured File Size Limit to 5MB)
- [ ] **vite-plugin-vue-markdown**: `^0.23.5` → `^0.23.5` (unchanged)
- [ ] **workbox-window**: `^7.0.0` → `^7.0.0` (unchanged)
