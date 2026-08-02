# JSON Table View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-width interactive JSON Table View below the existing JSON input/output columns in `src/tools/json-viewer`.

**Architecture:** Extend `json.models.ts` with pure data-flattening, key union extraction, filtering, and sorting functions. Update `json-viewer.vue` to render a responsive table equipped with depth selector utility buttons (1-3 levels), column visibility toggles (checkbox popover), sortable headers, and inline column search filters.

**Tech Stack:** Vue 3 Composition API (`<script setup>`), Naive UI (`n-button`, `n-popover`, `n-checkbox`, `n-input`, `n-icon`, etc.), TypeScript (`vue-tsc`), Less CSS, Vitest.

## Global Constraints
- Must pass `pnpm lint` without warnings.
- Must pass `pnpm typecheck` with zero compilation errors.
- Must pass `npx vitest run --environment jsdom` with all unit tests passing.
- Custom wrappers in `src/ui` preferred where applicable; Naive UI components allowed for popover/dropdowns.

---

### Task 1: Data Model & Flattening Logic in `json.models.ts`

**Files:**
- Modify: `src/tools/json-viewer/json.models.ts`
- Test: `src/tools/json-viewer/json.models.test.ts`

**Interfaces:**
- Produces:
  - `flattenObject(obj: any, maxDepth: number, currentDepth?: number, prefix?: string): Record<string, any>`
  - `extractTableData(parsedData: any, maxDepth: number): { headers: string[]; rows: Record<string, any>[] }`
  - `filterAndSortRows(rows: Record<string, any>[], columnFilters: Record<string, string>, sortKey: string | null, sortOrder: 'asc' | 'desc' | null): Record<string, any>[]`

- [ ] **Step 1: Write unit tests in `json.models.test.ts`**

Create test cases covering:
1. `flattenObject`:
   - Level 1 flattening: `{ a: 1, b: { c: 2 } }` -> `{ a: 1, b: '{"c":2}' }` (stringified)
   - Level 2 flattening: `{ a: 1, b: { c: 2, d: { e: 3 } } }` -> `{ a: 1, 'b.c': 2, 'b.d': '{"e":3}' }`
   - Level 3 flattening: `{ a: { b: { c: 3 } } }` -> `{ 'a.b.c': 3 }`
2. `extractTableData`:
   - Array of objects: `[{ a: 1 }, { b: 2 }]` -> headers `['a', 'b']`, rows `[{ a: 1 }, { b: 2 }]`
   - Single object: `{ a: 1 }` -> headers `['a']`, rows `[{ a: 1 }]`
3. `filterAndSortRows`:
   - Column filtering: filter rows where `author` includes `'Melville'`
   - Column sorting: sort numbers ascending/descending, strings ascending/descending.

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run src/tools/json-viewer/json.models.test.ts --environment jsdom`
Expected: FAIL with missing exports `flattenObject`, `extractTableData`, `filterAndSortRows`.

- [ ] **Step 3: Implement data model functions in `json.models.ts`**

Implement `flattenObject`, `extractTableData`, and `filterAndSortRows` matching specifications.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/tools/json-viewer/json.models.test.ts --environment jsdom`
Expected: PASS all tests.

- [ ] **Step 5: Commit**

```bash
git add src/tools/json-viewer/json.models.ts src/tools/json-viewer/json.models.test.ts
git commit -m "feat(json-viewer): implement table data extraction, flattening, filtering, and sorting"
```

---

### Task 2: Localization Strings

**Files:**
- Modify: `locales/en.yml`
- Modify: `locales/vi.yml`

- [ ] **Step 1: Add localization keys under `json-prettify`**

Add keys:
```yaml
    table:
      title: Table View
      nested_levels: Nested Header Levels
      level_1: Level 1
      level_2: Level 2
      level_3: Level 3
      columns: Columns
      select_all: Select All
      clear_all: Clear All
      filter_placeholder: Filter...
      no_data: No valid JSON data to display as table
```

- [ ] **Step 2: Commit**

```bash
git add locales/en.yml locales/vi.yml
git commit -m "feat(json-viewer): add table view locale translations"
```

---

### Task 3: Build JSON Table View UI in `json-viewer.vue`

**Files:**
- Modify: `src/tools/json-viewer/json-viewer.vue`

- [ ] **Step 1: Import new models and icons**

Import `extractTableData`, `filterAndSortRows` from `./json.models`, and icons from `@vicons/tabler` (`ArrowUp`, `ArrowDown`, `Filter`, `Eye`, `Table`).

- [ ] **Step 2: Add reactive state for Table View**

Add reactive variables:
- `headerDepth` (1 | 2 | 3, default: 1)
- `visibleColumns` (Set/Array of string header names)
- `columnFilters` (Ref<Record<string, string>>)
- `sortKey` (Ref<string | null>)
- `sortOrder` (Ref<'asc' | 'desc' | null>)

Computed properties:
- `parsedTableData`: derives `{ headers, rows }` from valid parsed JSON input using `extractTableData(parsed, headerDepth.value)`.
- `filteredAndSortedRows`: computes result using `filterAndSortRows(parsedTableData.value.rows, columnFilters.value, sortKey.value, sortOrder.value)`.

- [ ] **Step 3: Build Table View template section below input/output grid**

Add a bottom section `<div class="table-view-section">`:
- Header title: `JSON Table View`
- Utility bar:
  - Button group for levels: `Level 1`, `Level 2`, `Level 3`
  - Popover dropdown for `Columns (visible/total)` with checkboxes for each header + "Select All" / "Clear All"
- Responsive table element (`<div class="table-wrapper"><table>...</table></div>`):
  - `<thead>`:
    - Header row containing key title, click-to-sort button/indicator (`▲` / `▼` / `↕`), and input search box for column filter.
  - `<tbody>`:
    - Render `filteredAndSortedRows`. If cell value is undefined/null, render `—`. If object/array, render stringified text.
    - Empty state if no data or no matching rows.

- [ ] **Step 4: Add CSS styles in `<style lang="less" scoped>`**

Add responsive table styles:
- Clean borders, sticky table headers on scroll.
- Hover states for rows and sortable header titles.
- Overflow scrolling wrapper for wide tables.

- [ ] **Step 5: Run typecheck and unit tests**

Run: `pnpm typecheck`
Run: `npx vitest run --environment jsdom`
Expected: Zero compilation errors and all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/tools/json-viewer/json-viewer.vue
git commit -m "feat(json-viewer): add interactive JSON Table View with depth levels, column toggles, sort, and filter"
```

---

### Task 4: Full Verification and Quality Gate

**Files:** All modified files.

- [ ] **Step 1: Run Linter**

Run: `pnpm lint`
Expected: Clean pass with 0 errors/warnings.

- [ ] **Step 2: Run Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 3: Run Vitest Suite**

Run: `npx vitest run --environment jsdom`
Expected: 100% tests pass.

- [ ] **Step 4: Final commit / push verification**
