<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  ArrowBack,
  ArrowForwardUp,
  Download,
  Exchange,
  Plus,
  Trash,
} from '@vicons/tabler';
import { TableState } from './table-state';
import TableEditor from './table-editor.vue';
import TextareaCopyable from '@/components/TextareaCopyable.vue';

const { t } = useI18n();

// Initialize TableState
const state = reactive(new TableState(3, 3)) as TableState;

// Compact Mode
const compactMode = ref(false);

// Active Tab for Output: 'markdown' or 'preview'
const activeTab = ref('markdown');

const tabOptions = computed(() => [
  { label: t('tools.table-to-markdown.markdownOutput'), value: 'markdown' },
  { label: t('tools.table-to-markdown.visualPreview'), value: 'preview' },
]);

// Modal State
const showNewTableModal = ref(false);
const newTableRows = ref(3);
const newTableCols = ref(3);

function openNewTableModal() {
  newTableRows.value = state.rows.length;
  newTableCols.value = state.headers.length;
  showNewTableModal.value = true;
}

function confirmNewTable() {
  if (newTableRows.value >= 1 && newTableCols.value >= 1) {
    state.reset(newTableRows.value, newTableCols.value);
  }
  showNewTableModal.value = false;
}

// Actions
function transposeTable() {
  state.transpose();
}

function clearTable() {
  // Clear all cell contents but preserve size and alignments
  state.saveHistory();
  state.headers.forEach((h) => {
    h.html = '';
  });
  state.rows.forEach((row) => {
    row.forEach((cell) => {
      cell.html = '';
    });
  });
}

function undoAction() {
  state.undo();
}

function redoAction() {
  state.redo();
}

// Computed Markdown output
const markdownOutput = computed(() => {
  return state.toMarkdown({ compact: compactMode.value });
});

// Download helper
function downloadText(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadBinary(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download handlers
function downloadJson() {
  downloadText(state.toJson(), 'table.json', 'application/json');
}

function downloadYaml() {
  downloadText(state.toYaml(), 'table.yaml', 'text/yaml');
}

function downloadSql() {
  downloadText(state.toSqlInsert(), 'table.sql', 'text/plain');
}

function downloadCsvComma() {
  downloadText(state.toCsv(','), 'table.csv', 'text/csv');
}

function downloadCsvSemicolon() {
  downloadText(state.toCsv(';'), 'table_semicolon.csv', 'text/csv');
}

function downloadCsvTab() {
  downloadText(state.toCsv('\t'), 'table.tsv', 'text/tab-separated-values');
}

function downloadMarkdown() {
  downloadText(state.toMarkdownExport(compactMode.value), 'table.md', 'text/markdown');
}

function downloadXlsx() {
  downloadBinary(state.toXlsxBuffer(), 'table.xlsx');
}

// CSV dropdown options
const csvDropdownOptions = computed(() => [
  { label: t('tools.table-to-markdown.csvComma'), key: 'csv-comma' },
  { label: t('tools.table-to-markdown.csvSemicolon'), key: 'csv-semicolon' },
  { label: t('tools.table-to-markdown.csvTab'), key: 'csv-tab' },
]);

function handleCsvSelect(key: string) {
  if (key === 'csv-comma') {
    downloadCsvComma();
  }
  else if (key === 'csv-semicolon') {
    downloadCsvSemicolon();
  }
  else if (key === 'csv-tab') {
    downloadCsvTab();
  }
}
</script>

<template>
  <div class="table-to-markdown-tool">
    <!-- Toolbar -->
    <c-card class="toolbar-card" mb-4>
      <div class="toolbar-container">
        <n-space align="center" class="flex-wrap">
          <c-button @click="openNewTableModal">
            <n-icon :component="Plus" class="mr-1" />
            {{ t('tools.table-to-markdown.newTable') }}
          </c-button>

          <c-button @click="transposeTable">
            <n-icon :component="Exchange" class="mr-1" />
            {{ t('tools.table-to-markdown.transpose') }}
          </c-button>

          <c-button @click="clearTable">
            <n-icon :component="Trash" class="mr-1" />
            {{ t('tools.table-to-markdown.clear') }}
          </c-button>

          <n-divider vertical />

          <c-button :disabled="!state.canUndo" @click="undoAction">
            <n-icon :component="ArrowBack" class="mr-1" />
            {{ t('tools.table-to-markdown.undo') }}
          </c-button>

          <c-button :disabled="!state.canRedo" @click="redoAction">
            <n-icon :component="ArrowForwardUp" class="mr-1" />
            {{ t('tools.table-to-markdown.redo') }}
          </c-button>
        </n-space>

        <n-space align="center">
          <span class="text-sm font-medium">{{ t('tools.table-to-markdown.compactMode') }}</span>
          <n-switch v-model:value="compactMode" />
        </n-space>
      </div>
    </c-card>

    <!-- Table Editor Workspace -->
    <c-card class="editor-container-card" mb-4>
      <div class="editor-section">
        <h3 class="section-title mb-2">
          Table Editor
        </h3>
        <TableEditor :state="state" />
        <div class="instructions">
          Tip: Right-click column (#) or row headers to add/delete/align columns and rows. Tab/Enter to navigate. You can paste spreadsheet tables or CSV data directly!
        </div>
      </div>
    </c-card>

    <!-- Output Workspace -->
    <div class="output-container">
      <div class="output-header">
        <h3 class="section-title">
          Output
        </h3>
        <c-buttons-select v-model:value="activeTab" :options="tabOptions" />
      </div>

      <div v-show="activeTab === 'markdown'" class="markdown-output-wrapper">
        <TextareaCopyable :value="markdownOutput" language="markdown" />
      </div>

      <div v-show="activeTab === 'preview'" class="preview-output-wrapper">
        <c-card class="preview-card">
          <div class="preview-content">
            <c-markdown :markdown="markdownOutput" />
          </div>
        </c-card>
      </div>
    </div>

    <!-- Download Buttons -->
    <c-card class="download-card" mt-4>
      <div class="download-section">
        <h3 class="section-title mb-3">
          <n-icon :component="Download" class="mr-1" />
          {{ t('tools.table-to-markdown.downloadAs') }}
        </h3>
        <div class="download-buttons">
          <c-button class="download-btn" @click="downloadJson">
            JSON
          </c-button>
          <c-button class="download-btn" @click="downloadYaml">
            YAML
          </c-button>
          <c-button class="download-btn" @click="downloadSql">
            SQL INSERT
          </c-button>
          <n-dropdown
            trigger="click"
            :options="csvDropdownOptions"
            @select="handleCsvSelect"
          >
            <c-button class="download-btn download-btn--csv">
              CSV ▾
            </c-button>
          </n-dropdown>
          <c-button class="download-btn" @click="downloadMarkdown">
            Markdown
          </c-button>
          <c-button class="download-btn download-btn--xlsx" @click="downloadXlsx">
            XLSX
          </c-button>
        </div>
      </div>
    </c-card>

    <!-- New Table Presets Modal -->
    <c-modal v-model:open="showNewTableModal">
      <c-card :title="t('tools.table-to-markdown.newTableTitle')">
        <n-space vertical size="large">
          <n-form-item :label="t('tools.table-to-markdown.rows')">
            <n-input-number v-model:value="newTableRows" :min="1" :max="100" />
          </n-form-item>
          <n-form-item :label="t('tools.table-to-markdown.columns')">
            <n-input-number v-model:value="newTableCols" :min="1" :max="100" />
          </n-form-item>
          <n-space justify="end" class="mt-4">
            <c-button @click="showNewTableModal = false">
              {{ t('tools.table-to-markdown.cancel') }}
            </c-button>
            <c-button type="primary" @click="confirmNewTable">
              {{ t('tools.table-to-markdown.create') }}
            </c-button>
          </n-space>
        </n-space>
      </c-card>
    </c-modal>
  </div>
</template>

<style scoped lang="less">
.table-to-markdown-tool {
  max-width: 100%;
}

.toolbar-card {
  border-radius: 8px;
  background-color: var(--card-bg, #ffffff);
}

.toolbar-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.editor-container-card {
  margin-top: 16px;
  margin-bottom: 24px;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color, #1f2225);
  display: flex;
  align-items: center;
}

.dark .section-title {
  color: #e5e7eb;
}

.instructions {
  margin-top: 8px;
  font-size: 12px;
  color: #8e8e93;
}

.output-container {
  margin-top: 24px;
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.preview-card {
  padding: 24px;
  border-radius: 8px;
  background-color: var(--card-bg, #ffffff);
  border: 1px solid var(--border-color, #efeff5);
}

.preview-content {
  overflow-x: auto;
  font-family: inherit;

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;

    th,
    td {
      border: 1px solid var(--border-color, #efeff5);
      padding: 10px 14px;
      text-align: left;
    }

    th {
      background-color: var(--header-bg, #fafafc);
      font-weight: 600;
    }
  }
}

.download-card {
  border-radius: 8px;
}

.download-section {
  padding: 4px 0;
}

.download-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.download-btn {
  font-weight: 500;
  letter-spacing: 0.02em;
}

.download-btn--csv {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #ffffff;
  border: none;

  &:hover {
    background: linear-gradient(135deg, #059669, #047857);
  }
}

.download-btn--xlsx {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #ffffff;
  border: none;

  &:hover {
    background: linear-gradient(135deg, #16a34a, #15803d);
  }
}

.dark {
  .preview-card {
    border-color: #303033;
    background-color: #18181c;
  }
  .preview-content {
    :deep(table) {
      th,
      td {
        border-color: #303033;
      }
      th {
        background-color: #18181c;
      }
    }
  }
}
</style>
