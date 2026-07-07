<script setup lang="ts">
import type { QRCodeErrorCorrectionLevel } from 'qrcode';
import { useQRCode } from './useQRCode';
import { useDownloadFileFromBase64 } from '@/composable/downloadBase64';

const props = defineProps<{ initialValue?: string }>();
const foreground = ref('#000000ff');
const background = ref('#ffffffff');
const errorCorrectionLevel = ref<QRCodeErrorCorrectionLevel>('medium');

const errorCorrectionLevels = ['low', 'medium', 'quartile', 'high'];

const text = ref(props.initialValue || 'https://it-tools.tech');

watch(() => props.initialValue, (val) => {
  if (val !== undefined) {
    text.value = val;
  }
});
const sizeOption = ref<'small' | 'medium' | 'big'>('small');

const downloadWidth = computed(() => {
  if (sizeOption.value === 'medium') {
    return 1536;
  }
  if (sizeOption.value === 'big') {
    return 2048;
  }
  return 1024;
});

const uiWidth = computed(() => {
  if (sizeOption.value === 'medium') {
    return 300;
  }
  if (sizeOption.value === 'big') {
    return 400;
  }
  return 200;
});

const { qrcode } = useQRCode({
  text,
  color: {
    background,
    foreground,
  },
  errorCorrectionLevel,
  width: downloadWidth,
});

const { download } = useDownloadFileFromBase64({ source: qrcode, filename: 'qr-code.png' });
</script>

<template>
  <c-card>
    <n-grid x-gap="12" y-gap="12" cols="1 600:3">
      <n-gi span="2">
        <c-input-text
          v-model:value="text"
          label-position="left"
          label-width="130px"
          label-align="right"
          label="Text:"
          multiline
          rows="1"
          autosize
          placeholder="Your link or text..."
          mb-6
        />
        <n-form label-width="130" label-placement="left">
          <n-form-item label="Foreground color:">
            <n-color-picker v-model:value="foreground" :modes="['hex']" />
          </n-form-item>
          <n-form-item label="Background color:">
            <n-color-picker v-model:value="background" :modes="['hex']" />
          </n-form-item>
          <c-select
            v-model:value="errorCorrectionLevel"
            label="Error resistance:"
            label-position="left"
            label-width="130px"
            label-align="right"
            :options="errorCorrectionLevels.map((value) => ({ label: value, value }))"
            mb-12px
          />
          <c-buttons-select
            v-model:value="sizeOption"
            label="Size:"
            label-position="left"
            label-width="130px"
            label-align="right"
            :options="[
              { label: 'Small (1x)', value: 'small' },
              { label: 'Medium (1.5x)', value: 'medium' },
              { label: 'Big (2x)', value: 'big' },
            ]"
          />
        </n-form>
      </n-gi>
      <n-gi>
        <div flex flex-col items-center gap-3>
          <n-image :src="qrcode" :width="uiWidth" />
          <c-button @click="download">
            Download qr-code
          </c-button>
        </div>
      </n-gi>
    </n-grid>
  </c-card>
</template>
