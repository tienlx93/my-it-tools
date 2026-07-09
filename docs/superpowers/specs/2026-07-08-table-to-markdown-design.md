# 2026-07-08 Table to Markdown Generator Design

## Status
Proposed (Pending User Review)

---

## 1. Context & Goals
Markdown tables (GitHub Flavored Markdown) are extremely useful but tedious to write manually. There is a need for a modern, rich-text table editor within `my-it-tools` that allows developers to:
1. Create, edit, and format tables visually.
2. Intercept copy-paste events from spreadsheets (like Excel, Google Sheets) or HTML pages and auto-populate the table.
3. Edit cell contents with standard text formatting (Bold, Italic) visually.
4. Align columns (Left, Center, Right) visually and output the correct GFM alignment indicators.
5. Export clean GFM Markdown with options for compact mode, beautify/padded mode, and proper representation of cell line breaks (using HTML `<br>`).

---

## 2. Requirements

### Core Features
1. **Interactive Table Editor:**
   - Strict table header (the first row).
   - Spreadsheet-like grid with cells editable using HTML `contenteditable`.
   - Selection/Focus tracking for active column/row index.
   - **Keyboard Navigation & Editing:**
     - `Tab`: Move focus to the next cell. If on the last cell of the table, auto-insert a new row and focus its first cell.
     - `Shift + Tab`: Move focus to the previous cell.
     - `Enter`: Move focus to the cell directly below. If on the last row, auto-create a new row below and focus the corresponding cell.
     - `Shift + Enter`: Insert a line break (`<br>`) inside the current cell.
   - **Right-click Actions:** Right-clicking on column headers or row header numbers opens a context menu to insert/delete columns/rows and adjust alignment.
2. **Tabular Copy-Paste Interception:**
   - Copying tabular data from Excel, Google Sheets, Word, or web pages (which generate `text/html` `<table>` blocks) will populate the grid automatically.
   - Text formats like TSV/CSV or GFM Markdown tables pasted into the editor will be parsed.
3. **Rich Text Formatting:**
   - Inline formatting (Bold, Italic) visually rendered inside cells, mapped to GFM syntax (`**` and `*`) upon Markdown generation.
   - Keyboard shortcuts (`Ctrl+B` for bold, `Ctrl+I` for italic) and toolbar buttons.
4. **Column & Row Actions:**
   - Insert rows (above/below), insert columns (left/right).
   - Delete selected rows or columns.
   - Transpose the table (swap rows and columns).
   - Column alignment: left, center, right.
5. **Output Options & Live Preview:**
   - **Compact Mode:** Omit padding spaces around cell contents (e.g., `|Cell 1|Cell 2|`) for a minified, space-saving output format.
   - **Beautify Mode (Padded):** Pad column cells with trailing spaces so they align vertically in the raw Markdown text editor (e.g., `| Header 1 | Long Cell 2 |`).
   - **Line Break Representation:** Since Markdown tables do not support actual multi-line formatting inside a cell, any cell line breaks (e.g. from Shift+Enter) are translated into `<br>` tags to preserve formatting.
   - **Markdown Code Block:** Live Markdown result with a one-click copy button and download option.
   - **Rendered Preview:** Live HTML rendering of the generated Markdown to verify the result visually.

---

## 3. Architecture & Data Model

We will build the module in a dedicated folder: `src/tools/table-to-markdown/`.

```
src/tools/table-to-markdown/
├── index.ts                     # Tool definition & registration
├── table-to-markdown.vue         # Main layout wrapper
├── table-editor.vue              # Component for editable table grid
└── table-state.ts               # Core model & utility methods for table state
```

### Data Representation (`table-state.ts`)

```typescript
export interface Cell {
  html: string; // HTML string containing formatting tags (<b>, <i>, <strong>, <em>, code)
}

export type Alignment = 'left' | 'center' | 'right' | null;

export interface TableSnapshot {
  headers: Cell[];
  rows: Cell[][];
  alignments: Alignment[];
}

export class TableState {
  public headers: Cell[] = [];
  public rows: Cell[][] = [];
  public alignments: Alignment[] = [];

  // Undo/Redo history stacks
  private undoStack: TableSnapshot[] = [];
  private redoStack: TableSnapshot[] = [];

  constructor(initialRows = 3, initialCols = 3) {
    this.reset(initialRows, initialCols);
  }

  public reset(numRows: number, numCols: number) {
    this.headers = Array.from({ length: numCols }, () => ({ html: '' }));
    this.rows = Array.from({ length: numRows }, () =>
      Array.from({ length: numCols }, () => ({ html: '' }))
    );
    this.alignments = Array.from({ length: numCols }, () => null);
    this.clearHistory();
  }

  // State operations...
}
```

---

## 4. Key Mechanics & Algorithms

### 1. Clipboard Paste Parser
When pasting data into the editor:
- **HTML Table (`text/html`):** Parse via DOMParser. Extract the first `<table>` element. Map headers (`<th>` or first row `<td>`s) and rows (`<td>`s). Cell HTML is sanitized using DOMPurify to preserve only formatting tags (`<b>`, `<strong>`, `<i>`, `<em>`, `<code>`, `<br>`).
- **CSV / TSV (`text/plain`):** Check if content contains tabs or commas. Split rows by `\n` and cells by `\t` (Excel plain text copy) or `,`.
- **GFM Table (`text/plain`):** Check if content matches markdown table syntax. If yes, parse cell Markdown contents and convert standard GFM to HTML.

### 2. GFM Cell Content Translation
For each cell's HTML content, we perform a lightweight translation:
- Replace `<strong>` / `<b>` elements with `**` wrapping the inner text.
- Replace `em` / `i` elements with `*` wrapping the inner text.
- Replace `code` elements with `` ` `` wrapping the inner text.
- Convert visual line breaks (like `<br>`, block elements, or `\n` characters) to HTML `<br>` tags.
- Escape any raw pipe characters (`|` -> `\|`) to prevent breaking the Markdown table structure.
- Strip any other unexpected HTML elements while keeping their text.

### 3. Markdown Generator
```typescript
public toMarkdown(options: { compact: boolean }): string {
  // 1. Convert cell HTML to inline markdown text:
  //    - Formatting (bold, italic, code) -> Markdown tokens
  //    - Line breaks -> '<br>'
  //    - Escape pipe symbols -> '\|'
  // 2. If beautifying (compact = false):
  //    - Calculate the maximum string length of each column's cells (including headers)
  //    - Pad each cell with spaces to match the maximum length
  // 3. Format header row
  // 4. Format separator row based on alignments with matching padding:
  //    - Left:   :--- or :--- [padding]
  //    - Center: :---: or :---: [padding]
  //    - Right:  ---: or [padding] ---:
  // 5. Format body rows
  // 6. Join all rows with newlines
}
```

---

## 5. UI Layout

The UI will follow the premium dark/light mode aesthetics of `my-it-tools` using Naive UI controls:

1. **Toolbar:**
   - **Table Settings:** Preset size dialog, Clear, Transpose.
   - **Column Options:** Left/Center/Right Align. Insert Left, Insert Right, Delete Column.
   - **Row Options:** Insert Above, Insert Below, Delete Row.
   - **Undo/Redo:** Back and Forward history buttons.
2. **Table Editor Grid:**
   - Styled HTML `<table>` with borders.
   - Header cells and row index handles styled distinctively.
   - Each cell contains a `div` with `contenteditable="true"`.
   - Right-click handlers on column headers (th) and row indices (td.index-column) to show a context-sensitive `<n-dropdown>` context menu.
     - **Column context menu options:** Align Left, Align Center, Align Right, Insert Column Left, Insert Column Right, Delete Column.
     - **Row context menu options:** Insert Row Above, Insert Row Below, Delete Row.
   - Hover elements to show target add/remove action icons at the border of columns/rows.
3. **Output & Preview:**
   - Standard GFM markdown output textarea with copy and download buttons.
   - Beautifully rendered tab for visual preview of the markdown.

---

## 6. Testing Strategy

1. **Unit Tests (`table-state.test.ts`):**
   - Test table initialization and resizing.
   - Test insertion & deletion of rows and columns at specific indexes.
   - Test column alignments.
   - Test CSV/TSV, HTML table, and GFM markdown pasting/parsing.
   - Test markdown translation (bold, italic, and escaping pipe symbols).
   - Test Undo/Redo history stack operations.
2. **Component Tests (`table-to-markdown.test.ts`):**
   - Verify tool rendering, button clicks, and basic data binding.
