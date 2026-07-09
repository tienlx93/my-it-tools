import { FileText } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.text-statistics.title'),
  path: '/text-statistics',
  description: translate('tools.text-statistics.description'),
  keywords: ['text', 'statistics', 'length', 'characters', 'counter', 'size', 'bytes', 'token', 'tokens', 'count', 'word count', 'token count', 'llm', 'pricing', 'cost', 'gpt', 'claude', 'gemini'],
  component: () => import('./text-statistics.vue'),
  icon: FileText,
  redirectFrom: ['/text-stats'],
});
