<script setup lang="ts">
import { useStorage } from '@vueuse/core';
import { Bolt, Clipboard, Help, Settings, Trash } from '@vicons/tabler';
import { formatAndQueryJson, validateJson } from './json.models';
import TextareaCopyable from '@/components/TextareaCopyable.vue';

// Reactive settings stored in local storage
const rawJson = useStorage('json-prettify:raw-json', '{"hello": "world", "foo": "bar"}');
const parserMode = useStorage<'json' | 'json5'>('json-prettify:parser-mode', 'json');
const indentSize = useStorage<string>('json-prettify:indent-size', '2');
const sortKeys = useStorage<boolean>('json-prettify:sort-keys', true);
const jsonPath = useStorage<string>('json-prettify:json-path', '');

// Sample book store JSON for quick testing
const sampleJson = `{
  "store": {
    "book": [
      {
        "category": "reference",
        "author": "Nigel Rees",
        "title": "Sayings of the Century",
        "price": 8.95
      },
      {
        "category": "fiction",
        "author": "Evelyn Waugh",
        "title": "Sword of Honour",
        "price": 12.99
      },
      {
        "category": "fiction",
        "author": "Herman Melville",
        "title": "Moby Dick",
        "isbn": "0-553-21311-3",
        "price": 8.99
      },
      {
        "category": "fiction",
        "author": "J. R. R. Tolkien",
        "title": "The Lord of the Rings",
        "isbn": "0-395-19395-8",
        "price": 22.99
      }
    ],
    "bicycle": {
      "color": "red",
      "price": 19.95
    }
  }
}`;

function loadSample() {
  rawJson.value = sampleJson;
  parserMode.value = 'json';
}

function clearInput() {
  rawJson.value = '';
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    rawJson.value = text;
  }
  catch (err) {
    console.error('Failed to read clipboard', err);
  }
}

// Format the input itself inside the raw JSON textarea
function formatRawJson() {
  if (!rawJson.value.trim()) {
    return;
  }
  try {
    rawJson.value = formatAndQueryJson({
      rawJson: rawJson.value,
      indentSize: indentSize.value,
      sortKeys: sortKeys.value,
      parserMode: parserMode.value,
    });
  }
  catch (_err) {
    // If invalid, keep the input as is
  }
}

// Inline validation reactive computed property
const validation = computed(() => {
  return validateJson(rawJson.value, parserMode.value);
});

// Dynamic formatted and queried output JSON
const outputJson = computed(() => {
  if (!validation.value.isValid) {
    return '';
  }
  try {
    return formatAndQueryJson({
      rawJson: rawJson.value,
      indentSize: indentSize.value,
      sortKeys: sortKeys.value,
      parserMode: parserMode.value,
      jsonPath: jsonPath.value,
    });
  }
  catch (err: any) {
    return `Error: ${err.message}`;
  }
});

const inputElement = ref<any>(null);
</script>

<template>
  <div class="json-viewer-container">
    <!-- Left Column: Input and validation -->
    <div class="column-item">
      <div flex flex-col gap-2>
        <div flex flex-wrap items-center justify-between gap-2>
          <span text-lg fw-600>Input:</span>
          <div flex flex-wrap items-center gap-2>
            <!-- Format input button -->
            <c-tooltip tooltip="Format & Prettify raw JSON input">
              <c-button @click="formatRawJson">
                <n-icon :component="Bolt" mr-1 />
                Format
              </c-button>
            </c-tooltip>

            <!-- Paste from clipboard button -->
            <c-tooltip tooltip="Paste from clipboard">
              <c-button @click="pasteFromClipboard">
                <n-icon :component="Clipboard" mr-1 />
                Paste
              </c-button>
            </c-tooltip>

            <!-- Sample button -->
            <c-tooltip tooltip="Load sample JSONPath dataset">
              <c-button @click="loadSample">
                Sample
              </c-button>
            </c-tooltip>

            <!-- Clear button -->
            <c-tooltip tooltip="Clear input">
              <c-button @click="clearInput">
                <n-icon :component="Trash" mr-1 />
                Clear
              </c-button>
            </c-tooltip>

            <!-- Settings popover -->
            <n-popover trigger="click" placement="bottom">
              <template #trigger>
                <div>
                  <c-tooltip tooltip="Settings">
                    <c-button>
                      <n-icon :component="Settings" />
                    </c-button>
                  </c-tooltip>
                </div>
              </template>
              <div flex flex-col gap-2 pa-3>
                <n-checkbox v-model:checked="sortKeys">
                  Sort object keys alphabetically
                </n-checkbox>
              </div>
            </n-popover>

            <!-- Parser mode select dropdown -->
            <div style="width: 100px">
              <c-select
                v-model:value="parserMode"
                :options="[
                  { label: 'JSON', value: 'json' },
                  { label: 'JSON5', value: 'json5' },
                ]"
              />
            </div>
          </div>
        </div>

        <!-- Raw text area input -->
        <c-input-text
          ref="inputElement"
          v-model:value="rawJson"
          placeholder="Paste your raw JSON or JSON5 here..."
          rows="25"
          multiline
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          monospace
        />

        <!-- Validation Alert Status -->
        <div mt-2>
          <n-alert v-if="validation.isValid && rawJson.trim()" type="success" title="Valid JSON" />
          <c-alert v-else-if="!validation.isValid" type="error" title="Invalid JSON">
            <div flex flex-col>
              <span>{{ validation.error?.message }}</span>
              <span v-if="validation.error?.line" mt-1 text-xs fw-600>
                Line: {{ validation.error?.line }}, Column: {{ validation.error?.column }}
              </span>
            </div>
          </c-alert>
        </div>
      </div>
    </div>

    <!-- Right Column: Output and JSON Path -->
    <div class="column-item">
      <div flex flex-col gap-2>
        <div flex flex-wrap items-center justify-between gap-2>
          <span text-lg fw-600>Output:</span>
          <div flex items-center gap-2>
            <span text-sm op-80>Indentation:</span>
            <div style="width: 130px">
              <c-select
                v-model:value="indentSize"
                :options="[
                  { label: 'Minified', value: 'minified' },
                  { label: '1 Space', value: '1' },
                  { label: '2 Spaces', value: '2' },
                  { label: '3 Spaces', value: '3' },
                  { label: '4 Spaces', value: '4' },
                  { label: 'Tab', value: 'tab' },
                ]"
              />
            </div>
          </div>
        </div>

        <!-- Highlighted read-only Output view -->
        <TextareaCopyable
          :value="outputJson"
          language="json"
          :follow-height-of="inputElement"
        />

        <!-- JSON Path Footer filter -->
        <div mt-2>
          <n-input
            v-model:value="jsonPath"
            placeholder="Filter output using JSONPath, e.g. $.store.book[*].author"
            clearable
          >
            <template #prefix>
              <span mr-2 fw-600>JSON Path:</span>
            </template>
            <template #suffix>
              <n-popover trigger="click" placement="top-end" style="max-width: 320px">
                <template #trigger>
                  <div>
                    <c-button variant="text" size="small" circle>
                      <n-icon :component="Help" />
                    </c-button>
                  </div>
                </template>
                <div pa-3>
                  <h4 mb-2 fw-600>
                    JSONPath Selectors:
                  </h4>
                  <ul style="padding-left: 16px; margin: 0; display: flex; flex-direction: column; gap: 4px;">
                    <li><code>$</code>: The root object or array</li>
                    <li><code>@</code>: The current node</li>
                    <li><code>.key</code> or <code>['key']</code>: Child member</li>
                    <li><code>..key</code>: Recursive descent</li>
                    <li><code>*</code>: Wildcard (all elements)</li>
                    <li><code>[n]</code>: Array index</li>
                    <li><code>[start:end:step]</code>: Array slice</li>
                    <li><code>[?(@.price &lt; 10)]</code>: Filter expression</li>
                  </ul>
                </div>
              </n-popover>
            </template>
          </n-input>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.json-viewer-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 450px), 1fr));
  gap: 16px;
  width: 100%;
}

.column-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
</style>
