import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import CLink from './c-link.vue';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
    { path: '/test', name: 'test', component: { template: '<div>Test</div>' } },
  ],
});

describe('CLink', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders a normal link with href', () => {
    const wrapper = mount(CLink, {
      props: {
        href: 'https://google.com',
      },
    });
    expect(wrapper.get('a').attributes('href')).toBe('https://google.com');
  });

  it('renders a router link with resolved path and does not expose [object Object] as href', async () => {
    const wrapper = mount(CLink, {
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
