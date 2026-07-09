import { Table } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate as t } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: t('tools.table-to-markdown.title'),
  path: '/table-to-markdown',
  description: t('tools.table-to-markdown.description'),
  keywords: ['table', 'markdown', 'generator', 'editor', 'csv', 'excel'],
  component: () => import('./table-to-markdown.vue'),
  icon: Table,
  createdAt: new Date('2026-07-08'),
  category: 'Markdown',
});
