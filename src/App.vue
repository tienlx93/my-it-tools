<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import { NGlobalStyle, NMessageProvider, NModal, NNotificationProvider, darkTheme } from 'naive-ui';
import { IconBinary, IconCalendarTime, IconQrcode, IconReport } from '@tabler/icons-vue';
import { darkThemeOverrides, lightThemeOverrides } from './themes';
import { layouts } from './layouts';
import { useStyleStore } from './stores/style.store';

// Dynamically import the converter tool components
import QRCodeGenerator from '@/tools/qr-code-generator/qr-code-generator.vue';
import TextStatistics from '@/tools/text-statistics/text-statistics.vue';
import DateTimeConverter from '@/tools/date-time-converter/date-time-converter.vue';
import Base64StringConverter from '@/tools/base64-string-converter/base64-string-converter.vue';

const route = useRoute();
const layout = computed(() => route?.meta?.layout ?? layouts.base);
const styleStore = useStyleStore();

const theme = computed(() => (styleStore.isDarkTheme ? darkTheme : null));
const themeOverrides = computed(() => (styleStore.isDarkTheme ? darkThemeOverrides : lightThemeOverrides));

const { locale } = useI18n();

syncRef(
  locale,
  useStorage('locale', locale),
);

// Selection and popup state
const showDropdown = ref(false);
const showModal = ref(false);
const selectedText = ref('');
const activeTool = ref<'qr' | 'stats' | 'datetime' | 'base64' | null>(null);

const dropdownStyle = ref({
  position: 'absolute' as const,
  left: '0px',
  top: '0px',
  zIndex: 9999,
});

const modalTitle = computed(() => {
  if (activeTool.value === 'qr') {
    return 'Generate QR Code';
  }
  if (activeTool.value === 'stats') {
    return 'Text Statistics';
  }
  if (activeTool.value === 'datetime') {
    return 'Date-Time Converter';
  }
  if (activeTool.value === 'base64') {
    return 'Base64 Encrypt';
  }
  return '';
});

let selectionTimeout: number | null = null;

function handleMouseUp() {
  if (selectionTimeout) {
    clearTimeout(selectionTimeout);
  }

  selectionTimeout = window.setTimeout(() => {
    let textSelection = '';
    let x = 0;
    let y = 0;

    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      const input = activeEl as HTMLInputElement | HTMLTextAreaElement;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      if (start !== null && end !== null && start !== end) {
        textSelection = input.value.substring(start, end);
        const rect = activeEl.getBoundingClientRect();
        x = rect.left + window.scrollX + (rect.width / 2) - 150;
        y = rect.top + window.scrollY - 55;
      }
    }
    else {
      const selection = window.getSelection();
      if (selection && selection.toString().trim() !== '') {
        textSelection = selection.toString();
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        x = rect.left + window.scrollX + (rect.width / 2) - 150;
        y = rect.top + window.scrollY - 55;
      }
    }

    if (textSelection.trim()) {
      selectedText.value = textSelection;

      // Boundary checks
      if (x < 10) {
        x = 10;
      }
      if (y < 10) {
        y = 10;
      }
      if (x + 300 > window.innerWidth + window.scrollX) {
        x = window.innerWidth + window.scrollX - 310;
      }

      dropdownStyle.value.left = `${x}px`;
      dropdownStyle.value.top = `${y}px`;
      showDropdown.value = true;
    }
    else {
      showDropdown.value = false;
    }
  }, 300);
}

function handleMouseDown(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (target.closest('.floating-context-menu')) {
    return;
  }
  showDropdown.value = false;
}

function openTool(tool: 'qr' | 'stats' | 'datetime' | 'base64') {
  activeTool.value = tool;
  showModal.value = true;
  showDropdown.value = false;

  // Deselect highlighted text and remove focus/selection from textboxes
  window.getSelection()?.removeAllRanges();
  const activeEl = document.activeElement;
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
    (activeEl as HTMLInputElement | HTMLTextAreaElement).blur();
  }
}

function onModalClose() {
  activeTool.value = null;
}

onMounted(() => {
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('mousedown', handleMouseDown);
});

onUnmounted(() => {
  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('mousedown', handleMouseDown);
});
</script>

<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <NGlobalStyle />
    <NMessageProvider placement="bottom">
      <NNotificationProvider placement="bottom-right">
        <component :is="layout">
          <RouterView v-slot="{ Component }">
            <component :is="Component" :initial-value="route.query.input as string" />
          </RouterView>
        </component>

        <!-- Floating context dropdown -->
        <Transition name="fade">
          <div
            v-if="showDropdown"
            class="floating-context-menu"
            :style="dropdownStyle"
          >
            <button class="menu-item" @click="openTool('qr')">
              <n-icon class="mr-1" :component="IconQrcode" />
              Generate QR
            </button>
            <button class="menu-item" @click="openTool('stats')">
              <n-icon class="mr-1" :component="IconReport" />
              Text Stats
            </button>
            <button class="menu-item" @click="openTool('datetime')">
              <n-icon class="mr-1" :component="IconCalendarTime" />
              Date-Time
            </button>
            <button class="menu-item" @click="openTool('base64')">
              <n-icon class="mr-1" :component="IconBinary" />
              Base64
            </button>
          </div>
        </Transition>

        <!-- Tool Modal -->
        <NModal
          v-model:show="showModal"
          preset="card"
          class="context-tool-modal"
          :title="modalTitle"
          closable
          @after-leave="onModalClose"
        >
          <div class="modal-content-wrapper">
            <QRCodeGenerator v-if="activeTool === 'qr'" :initial-value="selectedText" />
            <TextStatistics v-else-if="activeTool === 'stats'" :initial-value="selectedText" />
            <DateTimeConverter v-else-if="activeTool === 'datetime'" :initial-value="selectedText" />
            <Base64StringConverter v-else-if="activeTool === 'base64'" :initial-value="selectedText" />
          </div>
        </NModal>
      </NNotificationProvider>
    </NMessageProvider>
  </n-config-provider>
</template>

<style>
body {
  min-height: 100%;
  margin: 0;
  padding: 0;
}

html {
  height: 100%;
  margin: 0;
  padding: 0;
}

* {
  box-sizing: border-box;
}

/* Floating context menu styling */
.floating-context-menu {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  width: max-content;
  max-width: 330px;
}

.dark .floating-context-menu {
  background: rgba(24, 24, 28, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.menu-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 14px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 500;
  color: #1f2937;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dark .menu-item {
  color: #e5e7eb;
}

.menu-item:hover {
  background: rgba(24, 160, 88, 0.12); /* primary theme transparent green */
  color: #18a058; /* primary theme green */
  transform: translateY(-1px) scale(1.02);
}

/* Modal styling */
.context-tool-modal {
  width: 90%;
  max-width: 800px !important;
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22) !important;
}

.modal-content-wrapper {
  max-height: 80vh;
  overflow-y: auto;
  padding: 4px;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(5px);
}
</style>
