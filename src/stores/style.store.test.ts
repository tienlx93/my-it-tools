import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useStyleStore } from './style.store';

const mockRoute = {
  query: { mode: '' },
};

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
}));

describe('style store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockRoute.query.mode = '';
  });

  it('returns false for isModalMode by default', () => {
    const store = useStyleStore();
    expect(store.isModalMode).toBe(false);
  });

  it('detects isModalMode when mode=modal is present in query', () => {
    mockRoute.query.mode = 'modal';
    const store = useStyleStore();
    expect(store.isModalMode).toBe(true);
  });

  it('returns false for isVscodeMode by default', () => {
    const store = useStyleStore();
    expect(store.isVscodeMode).toBe(false);
  });

  it('detects isVscodeMode when mode=vscode is present in query', () => {
    mockRoute.query.mode = 'vscode';
    const store = useStyleStore();
    expect(store.isVscodeMode).toBe(true);
  });
});
