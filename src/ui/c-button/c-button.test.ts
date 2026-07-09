import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import CButton from './c-button.vue';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
    { path: '/test', name: 'test', component: { template: '<div>Test</div>' } },
  ],
});

describe('CButton', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders an anchor with href', () => {
    const wrapper = mount(CButton, {
      props: {
        href: 'https://google.com',
      },
    });
    expect(wrapper.get('a').attributes('href')).toBe('https://google.com');
  });

  it('renders a router link with correct href and not [object Object]', async () => {
    const wrapper = mount(CButton, {
      global: {
        plugins: [router],
      },
      props: {
        to: { name: 'test' },
      },
    });
    await router.isReady();
    expect(wrapper.get('a').attributes('href')).toBe('/test');
  });
});
