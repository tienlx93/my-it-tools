<!-- eslint-disable vue/no-mutating-props -->
<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TableState } from './table-state';

const props = defineProps<{
  state: TableState
}>();

const { t } = useI18n();

const containerRef = ref<HTMLElement | null>(null);

// Dropdown/Context Menu State
const showDropdown = ref(false);
const x = ref(0);
const y = ref(0);
const dropdownType = ref<'column' | 'row' | null>(null);
const targetIndex = ref<number>(-1);

// Focused Cell Tracking State
const focusedCell = ref<{
  type: 'header' | 'body'
  rowIdx?: number
  colIdx: number
} | null>(null);

const initialCellHtml = ref<string>('');

function isCellFocused(type: 'header' | 'body', rowIdx: number | undefined, colIdx: number): boolean {
  if (!focusedCell.value) {
    return false;
  }
  if (focusedCell.value.type !== type) {
    return false;
  }
  if (focusedCell.value.colIdx !== colIdx) {
    return false;
  }
  if (type === 'body') {
    return focusedCell.value.rowIdx === rowIdx;
  }
  return true;
}

// Selection options based on right-clicked header or row index
const dropdownOptions = computed(() => {
  if (dropdownType.value === 'column') {
    return [
      { label: t('tools.table-to-markdown.alignLeft'), key: 'align-left' },
      { label: t('tools.table-to-markdown.alignCenter'), key: 'align-center' },
      { label: t('tools.table-to-markdown.alignRight'), key: 'align-right' },
      { key: 'd1', type: 'divider' },
      { label: t('tools.table-to-markdown.insertColLeft'), key: 'insert-col-left' },
      { label: t('tools.table-to-markdown.insertColRight'), key: 'insert-col-right' },
      { key: 'd2', type: 'divider' },
      {
        label: t('tools.table-to-markdown.deleteCol'),
        key: 'delete-col',
        disabled: props.state.headers.length <= 1,
      },
    ];
  }
  else if (dropdownType.value === 'row') {
    return [
      { label: t('tools.table-to-markdown.insertRowAbove'), key: 'insert-row-above' },
      { label: t('tools.table-to-markdown.insertRowBelow'), key: 'insert-row-below' },
      { key: 'd3', type: 'divider' },
      {
        label: t('tools.table-to-markdown.deleteRow'),
        key: 'delete-row',
        disabled: props.state.rows.length <= 1,
      },
    ];
  }
  return [];
});

// Focus helper using DOM query inside table container
function focusCell(type: 'header' | 'body', rIdx: number | undefined, cIdx: number) {
  let selector = '';
  if (type === 'header') {
    selector = `[data-cell-type="header"][data-col="${cIdx}"]`;
  }
  else {
    selector = `[data-cell-type="body"][data-row="${rIdx}"][data-col="${cIdx}"]`;
  }

  const el = containerRef.value?.querySelector(selector) as HTMLElement | null;
  if (el) {
    el.focus();
    try {
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false); // Move caret to the end
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    catch (e) {
      console.error('Error setting caret selection:', e);
    }
  }
}

// Handlers for focus and blur
function onCellFocus(type: 'header' | 'body', rowIdx: number | undefined, colIdx: number, event: FocusEvent) {
  focusedCell.value = { type, rowIdx, colIdx };
  const target = event.target as HTMLElement;
  initialCellHtml.value = target.innerHTML;
}

function onCellBlur(type: 'header' | 'body', rowIdx: number | undefined, colIdx: number, event: FocusEvent) {
  const target = event.target as HTMLElement;
  const currentHtml = target.innerHTML;

  if (currentHtml !== initialCellHtml.value) {
    props.state.saveHistory();
  }

  if (focusedCell.value && focusedCell.value.type === type && focusedCell.value.colIdx === colIdx) {
    if (type === 'header' || focusedCell.value.rowIdx === rowIdx) {
      focusedCell.value = null;
    }
  }
}

// Handler for keystroke input
function onCellInput(type: 'header' | 'body', rowIdx: number | undefined, colIdx: number, event: Event) {
  const target = event.target as HTMLElement;
  const newHtml = target.innerHTML;
  if (type === 'header') {
    props.state.headers[colIdx].html = newHtml;
  }
  else {
    props.state.rows[rowIdx!][colIdx].html = newHtml;
  }
}

// Keyboard Shortcuts override
function onCellKeydown(event: KeyboardEvent, type: 'header' | 'body', rowIdx: number | undefined, colIdx: number) {
  if (event.key === 'Tab') {
    event.preventDefault();
    if (event.shiftKey) {
      // Shift + Tab (navigate backward)
      if (type === 'header') {
        if (colIdx > 0) {
          focusCell('header', undefined, colIdx - 1);
        }
      }
      else {
        if (colIdx > 0) {
          focusCell('body', rowIdx, colIdx - 1);
        }
        else {
          if (rowIdx! > 0) {
            focusCell('body', rowIdx! - 1, props.state.headers.length - 1);
          }
          else {
            focusCell('header', undefined, props.state.headers.length - 1);
          }
        }
      }
    }
    else {
      // Tab (navigate forward)
      if (type === 'header') {
        if (colIdx < props.state.headers.length - 1) {
          focusCell('header', undefined, colIdx + 1);
        }
        else if (props.state.rows.length > 0) {
          focusCell('body', 0, 0);
        }
      }
      else {
        if (colIdx < props.state.headers.length - 1) {
          focusCell('body', rowIdx, colIdx + 1);
        }
        else {
          if (rowIdx! < props.state.rows.length - 1) {
            focusCell('body', rowIdx! + 1, 0);
          }
          else {
            props.state.insertRow(rowIdx!, 'below');
            nextTick(() => {
              focusCell('body', rowIdx! + 1, 0);
            });
          }
        }
      }
    }
  }
  else if (event.key === 'Enter') {
    if (!event.shiftKey) {
      event.preventDefault();
      // Enter (navigate to cell below)
      if (type === 'header') {
        if (props.state.rows.length > 0) {
          focusCell('body', 0, colIdx);
        }
      }
      else {
        if (rowIdx! < props.state.rows.length - 1) {
          focusCell('body', rowIdx! + 1, colIdx);
        }
        else {
          props.state.insertRow(rowIdx!, 'below');
          nextTick(() => {
            focusCell('body', rowIdx! + 1, colIdx);
          });
        }
      }
    }
    // Shift + Enter is allowed to insert visual <br> (default browser action)
  }
}

// Context Menu Handlers
function onHeaderContextMenu(event: MouseEvent, colIdx: number) {
  showDropdown.value = false;
  dropdownType.value = 'column';
  targetIndex.value = colIdx;
  nextTick(() => {
    x.value = event.clientX;
    y.value = event.clientY;
    showDropdown.value = true;
  });
}

// Context Menu Handlers for Row Indexes
function onRowContextMenu(event: MouseEvent, rowIdx: number) {
  showDropdown.value = false;
  dropdownType.value = 'row';
  targetIndex.value = rowIdx;
  nextTick(() => {
    x.value = event.clientX;
    y.value = event.clientY;
    showDropdown.value = true;
  });
}

function handleSelect(key: string) {
  showDropdown.value = false;
  const idx = targetIndex.value;
  if (idx === -1) {
    return;
  }

  if (dropdownType.value === 'column') {
    if (key === 'align-left') {
      props.state.setColumnAlignment(idx, 'left');
    }
    else if (key === 'align-center') {
      props.state.setColumnAlignment(idx, 'center');
    }
    else if (key === 'align-right') {
      props.state.setColumnAlignment(idx, 'right');
    }
    else if (key === 'insert-col-left') {
      props.state.insertColumn(idx, 'left');
    }
    else if (key === 'insert-col-right') {
      props.state.insertColumn(idx, 'right');
    }
    else if (key === 'delete-col') {
      props.state.deleteColumn(idx);
    }
  }
  else if (dropdownType.value === 'row') {
    if (key === 'insert-row-above') {
      props.state.insertRow(idx, 'above');
    }
    else if (key === 'insert-row-below') {
      props.state.insertRow(idx, 'below');
    }
    else if (key === 'delete-row') {
      props.state.deleteRow(idx);
    }
  }
}

// Global Grid Paste Handling
function onTablePaste(event: ClipboardEvent) {
  const html = event.clipboardData?.getData('text/html') || '';
  const text = event.clipboardData?.getData('text/plain') || '';

  // Intercept paste if it contains a table structure, TSV tabs or row newlines
  const isTablePaste = html.includes('<table') || text.includes('\t') || text.includes('\n');

  if (isTablePaste) {
    event.preventDefault();
    props.state.parsePaste(html, text);
    // Blur to refresh active inputs
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }
}

// Custom directive to update innerHTML without resetting cursor selection during active typing
const vSafeHtml = {
  mounted(el: HTMLElement, binding: any) {
    el.innerHTML = binding.value ?? '';
  },
  updated(el: HTMLElement, binding: any) {
    if (binding.value !== binding.oldValue) {
      if (document.activeElement !== el) {
        el.innerHTML = binding.value ?? '';
      }
    }
  },
};
</script>

<template>
  <div ref="containerRef" class="table-editor-container" @paste="onTablePaste">
    <table class="table-editor">
      <thead>
        <tr>
          <th class="row-index-header">
            #
          </th>
          <!-- Contenteditable column headers -->
          <th
            v-for="(header, colIdx) in state.headers"
            :key="`h-${colIdx}`"
            v-safe-html="header.html"
            contenteditable="true"
            data-cell-type="header"
            :data-col="colIdx"
            :style="{ textAlign: state.alignments[colIdx] || 'left' }"
            :class="{ 'is-focused': isCellFocused('header', undefined, colIdx) }"
            @focus="onCellFocus('header', undefined, colIdx, $event)"
            @blur="onCellBlur('header', undefined, colIdx, $event)"
            @input="onCellInput('header', undefined, colIdx, $event)"
            @keydown="onCellKeydown($event, 'header', undefined, colIdx)"
            @contextmenu.prevent="onHeaderContextMenu($event, colIdx)"
          />
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIdx) in state.rows" :key="`r-${rowIdx}`">
          <!-- Row index cell containing row number -->
          <td
            class="row-index-cell"
            @contextmenu.prevent="onRowContextMenu($event, rowIdx)"
          >
            {{ rowIdx + 1 }}
          </td>
          <!-- Contenteditable body cells -->
          <td
            v-for="(cell, colIdx) in row"
            :key="`c-${colIdx}`"
            v-safe-html="cell.html"
            contenteditable="true"
            data-cell-type="body"
            :data-row="rowIdx"
            :data-col="colIdx"
            :style="{ textAlign: state.alignments[colIdx] || 'left' }"
            :class="{ 'is-focused': isCellFocused('body', rowIdx, colIdx) }"
            @focus="onCellFocus('body', rowIdx, colIdx, $event)"
            @blur="onCellBlur('body', rowIdx, colIdx, $event)"
            @input="onCellInput('body', rowIdx, colIdx, $event)"
            @keydown="onCellKeydown($event, 'body', rowIdx, colIdx)"
          />
        </tr>
      </tbody>
    </table>

    <n-dropdown
      placement="bottom-start"
      trigger="manual"
      :x="x"
      :y="y"
      :show="showDropdown"
      :options="dropdownOptions"
      @clickoutside="showDropdown = false"
      @select="handleSelect"
    />
  </div>
</template>

<style scoped lang="less">
.table-editor-container {
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--cell-bg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  margin: 16px 0;
  width: 100%;

  --border-color: #efeff5;
  --header-bg: #fafafc;
  --index-bg: #f5f5f7;
  --cell-bg: #ffffff;
  --text-color: #333639;
  --index-text-color: #8e8e93;
  --primary-color: #18a058;
}

.dark .table-editor-container {
  --border-color: #303033;
  --header-bg: #18181c;
  --index-bg: #101014;
  --cell-bg: #18181c;
  --text-color: #d7dae2;
  --index-text-color: #767c82;
  --primary-color: #18a058;
}

.table-editor {
  width: 100%;
  border-collapse: collapse;
  font-family: inherit;
  font-size: 14px;
  color: var(--text-color);

  th,
  td {
    border: 1px solid var(--border-color);
    padding: 12px 16px;
    min-width: 100px;
    position: relative;
    box-sizing: border-box;
  }

  th {
    background-color: var(--header-bg);
    font-weight: 600;
    outline: none;

    &[contenteditable="true"]:focus {
      outline: none;
      box-shadow: inset 0 0 0 2px var(--primary-color);
      background-color: rgba(24, 160, 88, 0.04);
    }
  }

  td {
    outline: none;

    &[contenteditable="true"]:focus {
      outline: none;
      box-shadow: inset 0 0 0 2px var(--primary-color);
      background-color: rgba(24, 160, 88, 0.04);
    }
  }

  .row-index-header {
    background-color: var(--index-bg);
    color: var(--index-text-color);
    font-weight: 600;
    text-align: center;
    width: 45px;
    min-width: 45px;
    max-width: 45px;
    cursor: default;
    border-right: 2px solid var(--border-color);
    user-select: none;
  }

  .row-index-cell {
    background-color: var(--index-bg);
    color: var(--index-text-color);
    font-weight: 600;
    text-align: center;
    width: 45px;
    min-width: 45px;
    max-width: 45px;
    cursor: context-menu;
    user-select: none;
    border-right: 2px solid var(--border-color);

    &:hover {
      background-color: rgba(24, 160, 88, 0.08);
      color: var(--primary-color);
    }
  }
}
</style>
