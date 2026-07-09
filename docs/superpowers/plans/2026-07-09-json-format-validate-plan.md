# JSON Format/Validate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the existing JSON Prettify tool (`json-viewer`) into a robust JSON Format/Validate tool with side-by-side layout, JSON5 support, validation feedback, and JSON Path querying using the `jsonpath-plus` library.

**Architecture:** Use Vue 3 Composition API with reactive states. We'll add `jsonpath-plus` as a dependency, use custom logic in `json.models.ts` for parsing, sorting, and path evaluation, and render a side-by-side split grid inside `json-viewer.vue`.

**Tech Stack:** Vue 3, Vite, TypeScript, Less, Naive UI, jsonpath-plus, json5.

## Global Constraints
* Use custom `c-` components (like `<c-input-text>`, `<c-button>`) instead of raw inputs or raw Naive UI elements where appropriate.
* The container maximum width is `1200px` on desktop.
* Persist reactive settings in Local Storage.
* No new unit tests are required for this implementation.

---

### Task 1: Install `jsonpath-plus` Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install `jsonpath-plus` package**
  Run: `pnpm install jsonpath-plus`
  Expected: Package added to `package.json` dependencies and `pnpm-lock.yaml` updated.

- [ ] **Step 2: Commit dependency change**
  Commit: `git commit -a -m "chore: add jsonpath-plus dependency"`

---

### Task 2: Implement Utility Core Logic

**Files:**
- Modify: `src/tools/json-viewer/json.models.ts`

- [ ] **Step 1: Rewrite formatting, sorting, and query execution utilities**
  We will update the core functions in `json.models.ts` to support JSON5, sorting, custom indents, and JSON Path evaluation using `jsonpath-plus`.
  
  ```typescript
  import JSON5 from 'json5';
  import { JSONPath } from 'jsonpath-plus';

  export interface FormatOptions {
    rawJson: string;
    indentSize: string | number; // '2', '4', '1', 'tab', 'minified'
    sortKeys: boolean;
    parserMode: 'json' | 'json5';
    jsonPath?: string;
  }

  export interface ValidationResult {
    isValid: boolean;
    error?: {
      message: string;
      line?: number;
      column?: number;
    };
  }

  export function sortObjectKeys(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(sortObjectKeys);
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce((acc: any, key) => {
          acc[key] = sortObjectKeys(obj[key]);
          return acc;
        }, {});
    }
    return obj;
  }

  export function validateJson(rawJson: string, mode: 'json' | 'json5'): ValidationResult {
    if (!rawJson.trim()) {
      return { isValid: true };
    }
    try {
      if (mode === 'json') {
        JSON.parse(rawJson);
      } else {
        JSON5.parse(rawJson);
      }
      return { isValid: true };
    } catch (e: any) {
      // Extract line and column numbers
      let line: number | undefined;
      let column: number | undefined;
      if (e.line !== undefined) {
        line = e.line;
        column = e.column;
      } else {
        // Fallback parse of the error message for line/column
        const match = e.message.match(/at line (\d+), column (\d+)/i) || 
                      e.message.match(/position (\d+)/i) ||
                      e.message.match(/line (\d+) column (\d+)/i);
        if (match) {
          if (match[2] !== undefined) {
            line = parseInt(match[1], 10);
            column = parseInt(match[2], 10);
          } else {
            // position index fallback
            const pos = parseInt(match[1], 10);
            const before = rawJson.substring(0, pos);
            const lines = before.split('\n');
            line = lines.length;
            column = lines[lines.length - 1].length + 1;
          }
        }
      }
      return {
        isValid: false,
        error: {
          message: e.message,
          line,
          column,
        },
      };
    }
  }

  export function formatAndQueryJson(options: FormatOptions): string {
    const { rawJson, indentSize, sortKeys, parserMode, jsonPath } = options;
    if (!rawJson.trim()) {
      return '';
    }

    let parsed: any;
    if (parserMode === 'json') {
      parsed = JSON.parse(rawJson);
    } else {
      parsed = JSON5.parse(rawJson);
    }

    if (sortKeys) {
      parsed = sortObjectKeys(parsed);
    }

    let queryResult = parsed;
    if (jsonPath && jsonPath.trim()) {
      queryResult = JSONPath({
        path: jsonPath.trim(),
        json: parsed,
        preventEval: true,
      });
    }

    if (queryResult === undefined) {
      return 'undefined';
    }

    // Determine indentation spacing
    let spacing: string | number = 2;
    if (indentSize === 'minified') {
      return JSON.stringify(queryResult);
    } else if (indentSize === 'tab') {
      spacing = '\t';
    } else {
      spacing = parseInt(String(indentSize), 10);
      if (isNaN(spacing)) {
        spacing = 2;
      }
    }

    return JSON.stringify(queryResult, null, spacing);
  }
  ```

- [ ] **Step 2: Commit utility changes**
  Commit: `git commit -a -m "feat: update JSON parsing, sorting, and JSONPath utility in json.models.ts"`

---

### Task 3: Refactor the Main JSON-Viewer Component

**Files:**
- Modify: `src/tools/json-viewer/json-viewer.vue`

- [ ] **Step 1: Rewrite component code**
  Implement the responsive layout, toolbars, settings, spacing dropdown, clipboard paste functionality, sample loader, and JSON Path footer querying inside `json-viewer.vue`.
  We will use Naive UI grid (`<n-grid>`, `<n-grid-item>`), icon imports from `@tabler/icons-vue` or `@vicons/tabler`, and reactive Vueuse storage for all input settings.
  
- [ ] **Step 2: Commit component updates**
  Commit: `git commit -a -m "feat: implement JSON Format/Validate responsive side-by-side layout in json-viewer.vue"`

---

### Task 4: Verify Compilation & Quality

- [ ] **Step 1: Check build & types**
  Run: `pnpm typecheck`
  Expected: Zero compilation errors.

- [ ] **Step 2: Run linter**
  Run: `pnpm lint`
  Expected: Zero linting errors.

- [ ] **Step 3: Run existing unit tests**
  Run: `pnpm test`
  Expected: All existing unit tests pass successfully.

- [ ] **Step 4: Commit changes & complete task**
  Commit: `git commit -a -m "chore: verify build and styling standards"`
