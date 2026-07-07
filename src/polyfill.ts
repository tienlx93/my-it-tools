// Polyfill localStorage and sessionStorage if blocked (e.g., in a cross-origin iframe)
export function polyfillStorage(type: 'localStorage' | 'sessionStorage') {
  try {
    if (typeof window !== 'undefined') {
      const storage = window[type];
      const testKey = `__storage_test_${type}__`;
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
    }
  }
  catch (e) {
    console.warn(
      `[Storage Polyfill] ${type} is not accessible (blocked or cross-domain iframe). Falling back to memory storage.`,
      e,
    );
    const memoryStorageMap = new Map<string, string>();
    const memoryStorage = {
      getItem(key: string) {
        return memoryStorageMap.get(key) ?? null;
      },
      setItem(key: string, value: any) {
        memoryStorageMap.set(key, String(value));
      },
      removeItem(key: string) {
        memoryStorageMap.delete(key);
      },
      clear() {
        memoryStorageMap.clear();
      },
      key(index: number) {
        return Array.from(memoryStorageMap.keys())[index] ?? null;
      },
      get length() {
        return memoryStorageMap.size;
      },
    };
    try {
      Object.defineProperty(window, type, {
        value: memoryStorage,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    catch (err) {
      console.error(`[Storage Polyfill] Failed to redefine ${type}:`, err);
    }
  }
}
