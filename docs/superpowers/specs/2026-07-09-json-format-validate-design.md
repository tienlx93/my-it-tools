# 2026-07-09 JSON Format/Validate Design

## Status
Proposed (Pending User Review)

---

## 1. Context & Goals
The existing `json-prettify` tool (located in `src/tools/json-viewer`) is a simple stacked tool that formats and sorts keys for JSON input.
We will enhance and replace it with a comprehensive "JSON Format/Validate" module which features:
1. A modern, responsive side-by-side layout (matching the user's reference image).
2. Advanced parsing options including standard JSON and loose JSON (JSON5).
3. Detailed validation output including syntax error highlighting with line/column context.
4. Integrated JSON Path evaluation support using the open-source `jsonpath-plus` library.
5. Indentation customization (2 spaces, 4 spaces, 1 space, Tab, Minified) and key sorting.
6. Settings persistence using local storage.

---

## 2. Requirements

### Core Features
1. **Side-by-Side Responsive Layout:**
   - **Input Section (Left Column):**
     - Action buttons: Format (Bolt icon), Clipboard (direct paste), Sample (pre-loads classic store JSON), Clear (clears the input), Settings (popover to toggle "Sort keys"), and Parser Type dropdown (JSON / JSON5).
     - Text editor for raw JSON input.
     - Validation Status Alert showing if JSON is valid, or listing precise parsing/syntax errors with line/column indicators.
   - **Output Section (Right Column):**
     - Action buttons: Indentation Dropdown ("Minified", "1 space", "2 spaces", "3 spaces", "4 spaces", "Tab"), Copy button (copies current output).
     - Syntax-highlighted output pane (read-only) dynamically rendered using Naive UI's code component with highlight.js.
   - **JSON Path Footer:**
     - An input bar for querying the JSON document via JSONPath expressions (e.g., `$.store.book[*].author`).
     - A help tooltip (`?` button) describing common JSONPath selectors.
     - Interactive evaluation: typing a path immediately filters the output; leaving it empty shows the full formatted JSON document.

2. **JSONPath Engine:**
   - Integrate `jsonpath-plus` to execute queries inside the browser.
   - Gracefully handle path compilation errors (invalid expressions) and empty/null/undefined results.

3. **Validation & Formatting:**
   - **JSON Mode:** Strict JSON validation using `JSON.parse` or similar, throwing errors for trailing commas, comments, and unquoted keys.
   - **JSON5 Mode:** Loose parser using `JSON5.parse`, allowing comments, trailing commas, single quotes, and unquoted keys.
   - Formatting preserves standard formatting indentation matching the selected spacing. Minified spacing collapses all whitespaces.
   - **Sorting Keys:** Alphabetically sorts object keys if enabled.

4. **State Persistence:**
   - Persist settings (`rawJson`, `parserMode`, `indentSize`, `sortKeys`, `jsonPath`) using `@vueuse/core`'s `useStorage`.

---

## 3. Architecture & Data Model

We will build the module directly inside `src/tools/json-viewer/` by refactoring `json-viewer.vue` and updating `index.ts`. We will also add `jsonpath-plus` as a dependency.

```
src/tools/json-viewer/
├── index.ts               # Register the JSON Format/Validate tool
├── json-viewer.vue        # The updated tool page with the side-by-side layout
├── json.models.ts         # Logic for formatting, sorting, and path evaluation
└── json.models.test.ts    # Unit tests for the core logic
```

### Data Structures & Inputs

```typescript
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
```

---

## 4. Key Mechanics & Algorithms

### 1. Unified Format & Query Engine
Our formatter will run inside a reactive wrapper:
1. **Step 1: Parsing & Validation**
   - Parse input JSON based on `parserMode`.
   - If parser fails, return validation errors to be displayed in the status alert.
2. **Step 2: Sorting (Optional)**
   - If `sortKeys` is active, recursively sort the object keys:
     ```typescript
     function sortObjectKeys(obj: any): any {
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
     ```
3. **Step 3: JSONPath Filtering**
   - If `jsonPath` is specified and not empty, use `JSONPath` to query the parsed and sorted object:
     ```typescript
     import { JSONPath } from 'jsonpath-plus';
     
     const results = JSONPath({ path: jsonPath, json: parsedJson });
     ```
4. **Step 4: Indentation & Formatting**
   - Determine spacing parameter:
     - `minified`: spacing is `undefined` (or empty string/custom logic) and collapsed.
     - `tab`: `'\t'`
     - `1`, `2`, `3`, `4`: number of spaces.
   - Stringify output:
     - If minified: `JSON.stringify(targetObject)`
     - Else: `JSON.stringify(targetObject, null, indentValue)`

### 2. Syntax Error Line/Column Extraction
To give developers precise error locations:
- For `json5.parse`: The thrown syntax error has `.line` and `.column` properties.
- For standard `JSON.parse`: Error messages in modern browsers include text like `at line 3 column 5` or we can fall back to general location scanning or a lightweight JSON validator if standard browser exception messages lack position details.

---

## 5. UI Layout

The interface will utilize Naive UI components for alignment, grid separation, icons, and menus:

1. **Input Column (Left):**
   - **Header bar:**
     - Left side: "Input:"
     - Right side:
       - `<c-button>` with Lightning Bolt icon (triggers formatting manually, if needed).
       - `<c-button>` "Clipboard" (reads text via navigator.clipboard and overrides the input).
       - `<c-button>` "Sample" (populates sample JSON).
       - `<c-button>` "Clear" (resets raw input).
       - `<c-button>` Settings (icon with `<n-popover>` displaying toggles).
       - `<c-select>` Dropdown for "JSON" / "JSON5".
   - **Textarea:**
     - Monospace font `<c-input-text>` with custom height, syncing size with the output pane.
   - **Validation Info:**
     - `<c-alert>` showing green "Valid JSON" or red error banner with error message details (line/column).

2. **Output Column (Right):**
   - **Header bar:**
     - Left side: "Output:"
     - Right side:
       - `<c-select>` Dropdown for Indentation (minified, 1, 2, 3, 4 spaces, Tab).
       - `<c-button>` "Copy" (copies current Output value).
   - **Viewport:**
     - A card containing `<n-scrollbar>` and `<n-code>` with syntax highlighting.
   - **Footer JSON Path Bar:**
     - `<n-input>` with prefix text `JSON Path:` and suffix help icon.
     - Suffix `?` help button triggering a small Popover listing common JSONPath selectors.

---

## 6. Testing Strategy

1. **Unit Tests (`json.models.test.ts`):**
   - Test standard JSON and JSON5 parsing, formatting, and key sorting.
   - Test `JSONPath` query filtering with different structures and edge cases.
   - Test invalid JSON path error handling.
2. **End-to-End & Lints:**
   - Run type-checker and linters to verify compliance with code formatting rules.
