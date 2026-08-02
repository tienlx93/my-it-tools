# JSON Table View Design Document

## Objective
Enhance `src/tools/json-viewer` by adding a full-width Table View below the JSON input/output columns. The table views the input JSON as tabular data by extracting combined array/object keys up to a configurable nesting depth (1-3 levels), rendering data values as stringified text, and providing column visibility control, column sorting, and column filtering.

---

## 1. Component & Layout Architecture

### Layout (`json-viewer.vue`)
- **Top Section**: Existing 2-column layout (Input JSON text area on the left, Output JSON preview on the right).
- **Bottom Section**: Full-width **JSON Table View** panel positioned below the input/output grid.
  - Rendered when valid JSON is available.
  - Standard container styling consistent with `my-it-tools`.

---

## 2. Table Controls & Header Capabilities

### Top Utility Toolbar
1. **Nested Header Depth Selector**:
   - Options: `Level 1` | `Level 2` | `Level 3` (default: 1).
   - Controls depth of key flattening for nested objects.
2. **Column Visibility Popover**:
   - Trigger button displaying column count (e.g. `Columns (4/5)`).
   - Popover containing checkboxes for each available column header.
   - Quick action buttons: "Select All", "Clear All".
3. **Table Summary / Quick Stats**:
   - Shows row count (e.g. `Displaying X of Y rows`).

### Table Header & Body
1. **Headers**:
   - Combined union of all keys across all array items/rows at the selected nesting level.
   - Sortable: Clicking a header toggles sort order: `unsorted` ➔ `ascending` ➔ `descending`. Sort icon indicator (`▲` / `▼`).
   - Column Filter Input: A filter text input inside each header cell to filter rows whose stringified value contains the filter query (case-insensitive).
2. **Body Cells**:
   - Primitive values (strings, numbers, booleans, null): displayed directly.
   - Objects / Arrays beyond selected depth: stringified with `JSON.stringify()`.
   - Empty/missing keys for a row: rendered as `—` (dash) or empty.

---

## 3. Data Processing Models (`json.models.ts`)

### Functions to Implement & Test
1. **`flattenObject(obj: any, maxDepth: number, currentDepth?: number, prefix?: string): Record<string, any>`**:
   - Recursively flattens nested object properties up to `maxDepth` (1 to 3).
   - Beyond `maxDepth`, nested objects/arrays are preserved as values (to be stringified).
2. **`extractTableData(rawParsed: any, maxDepth: number)`**:
   - Normalizes input into an array of objects (wraps single objects or primitives in `[rawParsed]`).
   - Flattens each row up to `maxDepth`.
   - Returns `{ headers: string[], rows: Record<string, any>[] }`.
3. **`filterAndSortRows(rows: Record<string, any>[], columnFilters: Record<string, string>, sortKey: string | null, sortOrder: 'asc' | 'desc' | null)`**:
   - Filters rows where cell values match the respective `columnFilters`.
   - Sorts rows by `sortKey` if specified.

---

## 4. Testing & Quality Assurance
- **Unit Tests (`json.models.test.ts`)**:
  - Test `flattenObject` for depth 1, 2, and 3.
  - Test `extractTableData` with arrays of objects, nested objects, mixed schemas, and primitives.
  - Test `filterAndSortRows` for filtering and ascending/descending sorts.
- **Verification Checklist**:
  - `pnpm lint` clean.
  - `pnpm typecheck` pass with 0 errors.
  - `npx vitest run --environment jsdom` all tests pass.
