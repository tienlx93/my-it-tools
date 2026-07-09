# Gemini Agent Guide: my-it-tools

Welcome to `my-it-tools`! This guide outlines the project structure, architecture, coding guidelines, and commands to help you develop, test, and maintain this codebase.

## Tech Stack
- **Framework:** Vue 3 (using `<script setup>` Composition API)
- **Build Tool:** Vite
- **TypeScript Type Checker:** `vue-tsc` (due to `.vue` imports type constraints)
- **Styling:** Less CSS, Vanilla CSS, Naive UI
- **Testing:** Vitest (with `jsdom` environment)
- **Linting:** ESLint

## Directory Layout
- `src/tools/`: Location of all developer tools. Each tool resides in its own sub-folder.
  - To create a new tool, run `pnpm run script:create:tool my-tool-name`.
  - To register the tool, import and register it in `src/tools/index.ts`.
- `src/layouts/`: Layout layouts wrapping pages (`base.layout.vue`, `tool.layout.vue`).
- `src/ui/`: Local design system and generic components prefixed with `c-` (e.g. `c-input-text`, `c-button`).
- `locales/`: Localization files (`en.yml`, `de.yml`, `vi.yml`). All user-facing text should be localized.

## Development & Build Commands
- **Install Dependencies:** `pnpm install`
- **Development Server:** `pnpm dev`
- **Unit Testing:** `pnpm test` or `npx vitest run --environment jsdom`
- **Linter:** `pnpm lint`
- **Typecheck (TypeScript compilation):** `pnpm typecheck`
- **Production Build:** `pnpm build`

## Code Guidelines

### UI Components
- Always prefer using the custom `c-` wrappers in `src/ui` (such as `<c-input-text>`, `<c-button>`, `<c-select>`) over raw inputs or raw Naive UI elements.
- When adding props or editing UI components, ensure that you follow the established design rules and update corresponding unit tests in the same directory (e.g., `*.test.ts`).

### Intercepting Clipboard Paste for HTML
- If a component needs to allow pasting raw HTML from the clipboard rather than plain text, set the `pasteHtml` prop to `true` on `<c-input-text>`.
- The `@paste` event handler in `c-input-text.vue` will intercept the clipboard data, extract the HTML fragment (handling the standard `<!--StartFragment-->` headers), and insert the raw HTML code at the cursor location.

### Layout Widths
- The main developer tools are wrapped by `src/layouts/tool.layout.vue`.
- Container maximum width is set to `1200px` on desktop.
- Components are designed to be responsive, scaling up to `100%` width in single-column mode or wrapping side-by-side with a base width of `600px`.

### Verification Checklist before Completion
1. **Run Linter:** `pnpm lint` must pass cleanly without warnings.
2. **Typecheck:** `npx vue-tsc --noEmit` must pass with zero compilation errors.
3. **Run Unit Tests:** `npx vitest run --environment jsdom` must succeed with all tests passing.
