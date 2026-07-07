import { type MaybeRef, get } from '@vueuse/core';
import QRCode, { type QRCodeErrorCorrectionLevel, type QRCodeToDataURLOptions } from 'qrcode';
import { isRef, ref, watch } from 'vue';

export function useQRCode({
  text,
  color: { background, foreground },
  errorCorrectionLevel,
  width,
  options,
}: {
  text: MaybeRef<string>
  color: { foreground: MaybeRef<string>; background: MaybeRef<string> }
  errorCorrectionLevel?: MaybeRef<QRCodeErrorCorrectionLevel>
  width?: MaybeRef<number>
  options?: QRCodeToDataURLOptions
}) {
  const qrcode = ref('');

  watch(
    [text, background, foreground, errorCorrectionLevel, width].filter(isRef),
    async () => {
      if (get(text)) {
        qrcode.value = await QRCode.toDataURL(get(text).trim(), {
          color: {
            dark: get(foreground),
            light: get(background),
            ...options?.color,
          },
          errorCorrectionLevel: get(errorCorrectionLevel) ?? 'M',
          width: get(width) ?? options?.width ?? 1024,
          ...options,
        });
      }
    },
    { immediate: true },
  );

  return { qrcode };
}
