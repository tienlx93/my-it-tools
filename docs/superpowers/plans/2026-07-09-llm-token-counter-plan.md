# LLM Token Counter & Pricing Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the existing text-statistics tool with a real-time LLM token counter and input/output cost estimates across 2026 model lineups.

**Architecture:** Use `js-tiktoken`'s `o200k_base` and `cl100k_base` encodings locally to count tokens. Expose a configuration array and helper methods in the service, and render them in a clean table with a collapsible base-price reference in the Vue template.

**Tech Stack:** Vue 3 Composition API, TypeScript, Naive UI, js-tiktoken, Vitest.

## Global Constraints
- Count tokens in real-time as the user types or pastes text.
- Use `o200k_base` tokenizer for OpenAI's latest models.
- Use `cl100k_base` tokenizer for other models as a close local approximation.
- Support specified 2026 models: GPT-5.5 Pro, GPT-5.5, GPT-5, GPT-5.4 mini, GPT-5.4 nano, Claude Fable 5, Claude Sonnet 5, Claude Haiku 4.5, Gemini 3.1 Pro, Gemini 3.5 Flash, Gemini 2.5 Flash-Lite.
- Include a Collapse containing a raw table of base price ($ per million tokens) for configured models.
- Verification checklist: `pnpm lint`, `pnpm typecheck`, `pnpm test` must all pass.

---

### Task 1: Enrich Text Statistics with LLM Token Counter and Pricing

**Files:**
- Modify: `src/tools/text-statistics/text-statistics.service.ts`
- Modify: `src/tools/text-statistics/text-statistics.service.test.ts`
- Modify: `src/tools/text-statistics/text-statistics.vue`

**Interfaces:**
- Consumes: Standard text input from Vue reactive state.
- Produces: Enhanced UI displaying LLM token counts, input/output estimated costs, and a collapsible base price reference table.

- [ ] **Step 1: Write the failing test for token counting and pricing**

  Replace the content of `src/tools/text-statistics/text-statistics.service.test.ts` with:
  ```typescript
  import { describe, expect, it } from 'vitest';
  import { getStringSizeInBytes, getTokenCount, calculateCost, formatCost } from './text-statistics.service';

  describe('text-statistics', () => {
    describe('getStringSizeInBytes', () => {
      it('should return the size of a string in bytes', () => {
        expect(getStringSizeInBytes('')).toEqual(0);
        expect(getStringSizeInBytes('a')).toEqual(1);
        expect(getStringSizeInBytes('aa')).toEqual(2);
        expect(getStringSizeInBytes('😀')).toEqual(4);
        expect(getStringSizeInBytes('aaaaaaaaaa')).toEqual(10);
      });
    });

    describe('getTokenCount', () => {
      it('should return 0 for empty string', () => {
        expect(getTokenCount('', 'cl100k_base')).toEqual(0);
        expect(getTokenCount('', 'o200k_base')).toEqual(0);
      });

      it('should count tokens for standard text using cl100k_base', () => {
        // "Hello world" is typically 2 tokens in cl100k_base
        expect(getTokenCount('Hello world', 'cl100k_base')).toEqual(2);
      });

      it('should count tokens for standard text using o200k_base', () => {
        // "Hello world" is typically 2 tokens in o200k_base
        expect(getTokenCount('Hello world', 'o200k_base')).toEqual(2);
      });
    });

    describe('calculateCost', () => {
      it('should return correct cost per million tokens', () => {
        expect(calculateCost(0, 10)).toEqual(0);
        expect(calculateCost(1000000, 5)).toEqual(5);
        expect(calculateCost(500000, 2)).toEqual(1);
      });
    });

    describe('formatCost', () => {
      it('should format cost to currency representation', () => {
        expect(formatCost(0)).toEqual('$0.00');
        expect(formatCost(0.000015)).toEqual('$0.000015');
        expect(formatCost(1.25)).toEqual('$1.2500');
        expect(formatCost(0.002)).toEqual('$0.0020');
      });
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `npx vitest run src/tools/text-statistics/text-statistics.service.test.ts`
  Expected: FAIL with compilation errors (getTokenCount, calculateCost, formatCost not exported).

- [ ] **Step 3: Write minimal implementation in text-statistics.service.ts**

  Replace the content of `src/tools/text-statistics/text-statistics.service.ts` with:
  ```typescript
  import { getEncoding } from 'js-tiktoken';

  export interface ModelPricing {
    provider: string;
    name: string;
    inputCostPerMillion: number;
    outputCostPerMillion: number;
    encoding: 'o200k_base' | 'cl100k_base';
  }

  export const MODELS_PRICING: ModelPricing[] = [
    // OpenAI
    { provider: 'OpenAI', name: 'GPT-5.5 Pro', inputCostPerMillion: 30.00, outputCostPerMillion: 180.00, encoding: 'o200k_base' },
    { provider: 'OpenAI', name: 'GPT-5.5', inputCostPerMillion: 5.00, outputCostPerMillion: 30.00, encoding: 'o200k_base' },
    { provider: 'OpenAI', name: 'GPT-5', inputCostPerMillion: 5.00, outputCostPerMillion: 30.00, encoding: 'o200k_base' },
    { provider: 'OpenAI', name: 'GPT-5.4 mini', inputCostPerMillion: 0.75, outputCostPerMillion: 4.50, encoding: 'o200k_base' },
    { provider: 'OpenAI', name: 'GPT-5.4 nano', inputCostPerMillion: 0.20, outputCostPerMillion: 1.25, encoding: 'o200k_base' },

    // Anthropic
    { provider: 'Anthropic', name: 'Claude Fable 5', inputCostPerMillion: 10.00, outputCostPerMillion: 50.00, encoding: 'cl100k_base' },
    { provider: 'Anthropic', name: 'Claude Sonnet 5', inputCostPerMillion: 3.00, outputCostPerMillion: 15.00, encoding: 'cl100k_base' },
    { provider: 'Anthropic', name: 'Claude Haiku 4.5', inputCostPerMillion: 1.00, outputCostPerMillion: 5.00, encoding: 'cl100k_base' },

    // Google
    { provider: 'Google', name: 'Gemini 3.1 Pro', inputCostPerMillion: 2.00, outputCostPerMillion: 12.00, encoding: 'cl100k_base' },
    { provider: 'Google', name: 'Gemini 3.5 Flash', inputCostPerMillion: 1.50, outputCostPerMillion: 9.00, encoding: 'cl100k_base' },
    { provider: 'Google', name: 'Gemini 2.5 Flash-Lite', inputCostPerMillion: 0.10, outputCostPerMillion: 0.40, encoding: 'cl100k_base' },
  ];

  export function getStringSizeInBytes(text: string) {
    return new TextEncoder().encode(text).buffer.byteLength;
  }

  let cl100kEncoder: any = null;
  let o200kEncoder: any = null;

  function getEncoder(encoding: 'cl100k_base' | 'o200k_base') {
    if (encoding === 'cl100k_base') {
      if (!cl100kEncoder) cl100kEncoder = getEncoding('cl100k_base');
      return cl100kEncoder;
    } else {
      if (!o200kEncoder) o200kEncoder = getEncoding('o200k_base');
      return o200kEncoder;
    }
  }

  export function getTokenCount(text: string, encoding: 'cl100k_base' | 'o200k_base'): number {
    if (!text) return 0;
    try {
      const encoder = getEncoder(encoding);
      return encoder.encode(text).length;
    } catch (e) {
      console.error(`Tokenization failed for ${encoding}:`, e);
      return 0;
    }
  }

  export function calculateCost(tokens: number, ratePerMillion: number): number {
    return (tokens / 1_000_000) * ratePerMillion;
  }

  export function formatCost(cost: number): string {
    if (cost === 0) return '$0.00';
    if (cost < 0.0001) {
      return '$' + cost.toFixed(6);
    }
    return cost.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    });
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `npx vitest run src/tools/text-statistics/text-statistics.service.test.ts`
  Expected: PASS

- [ ] **Step 5: Implement UI in text-statistics.vue**

  Replace the content of `src/tools/text-statistics/text-statistics.vue` with:
  ```html
  <script setup lang="ts">
  import { getStringSizeInBytes, getTokenCount, calculateCost, formatCost, MODELS_PRICING } from './text-statistics.service';
  import { formatBytes } from '@/utils/convert';

  const props = defineProps<{ initialValue?: string }>();
  const text = ref(props.initialValue || '');

  watch(() => props.initialValue, (val) => {
    if (val !== undefined) {
      text.value = val;
    }
  });

  // Calculate tokens reactively for both encoders
  const tokenCounts = computed(() => {
    return {
      cl100k_base: getTokenCount(text.value, 'cl100k_base'),
      o200k_base: getTokenCount(text.value, 'o200k_base'),
    };
  });

  // Est. Costs array for the UI table
  const modelEstimates = computed(() => {
    return MODELS_PRICING.map(model => {
      const tokens = tokenCounts.value[model.encoding];
      const inputCost = calculateCost(tokens, model.inputCostPerMillion);
      const outputCost = calculateCost(tokens, model.outputCostPerMillion);
      return {
        ...model,
        tokens,
        formattedInputCost: formatCost(inputCost),
        formattedOutputCost: formatCost(outputCost),
      };
    });
  });

  // Tag type mapper for provider aesthetics
  const getProviderTagType = (provider: string) => {
    switch (provider) {
      case 'OpenAI': return 'success';
      case 'Anthropic': return 'warning';
      case 'Google': return 'info';
      default: return 'default';
    }
  };
  </script>

  <template>
    <c-card>
      <c-input-text v-model:value="text" multiline placeholder="Your text..." rows="5" />

      <div mt-5 flex>
        <n-statistic label="Character count" :value="text.length" flex-1 />
        <n-statistic label="Word count" :value="text === '' ? 0 : text.split(/\s+/).length" flex-1 />
        <n-statistic label="Line count" :value="text === '' ? 0 : text.split(/\r\n|\r|\n/).length" flex-1 />
        <n-statistic label="Byte size" :value="formatBytes(getStringSizeInBytes(text))" flex-1 />
      </div>

      <div mt-8>
        <h3 text-lg font-bold mb-4>
          LLM Token Count & Estimated Costs
        </h3>
        <n-table :bordered="false" :single-column="false" size="small">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Model</th>
              <th>Tokenizer</th>
              <th>Tokens</th>
              <th>Input Cost</th>
              <th>Output Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="model in modelEstimates" :key="model.name">
              <td>
                <n-tag :type="getProviderTagType(model.provider)" size="small" round>
                  {{ model.provider }}
                </n-tag>
              </td>
              <td font-bold>
                {{ model.name }}
              </td>
              <td>
                <code text-xs>{{ model.encoding === 'o200k_base' ? 'o200k_base' : 'cl100k_base (approx)' }}</code>
              </td>
              <td font-bold>
                {{ model.tokens.toLocaleString() }}
              </td>
              <td font-mono>
                {{ model.formattedInputCost }}
              </td>
              <td font-mono>
                {{ model.formattedOutputCost }}
              </td>
            </tr>
          </tbody>
        </n-table>
      </div>

      <div mt-6>
        <n-collapse>
          <n-collapse-item title="Model Base Price Reference" name="pricing-ref">
            <n-table :bordered="false" size="small">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Model</th>
                  <th>Input Cost / 1M Tokens</th>
                  <th>Output Cost / 1M Tokens</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="model in MODELS_PRICING" :key="model.name">
                  <td>
                    <n-tag :type="getProviderTagType(model.provider)" size="small" round>
                      {{ model.provider }}
                    </n-tag>
                  </td>
                  <td font-bold>
                    {{ model.name }}
                  </td>
                  <td font-mono>
                    ${{ model.inputCostPerMillion.toFixed(2) }}
                  </td>
                  <td font-mono>
                    ${{ model.outputCostPerMillion.toFixed(2) }}
                  </td>
                </tr>
              </tbody>
            </n-table>
          </n-collapse-item>
        </n-collapse>
      </div>
    </c-card>
  </template>
  ```

- [ ] **Step 6: Run verification commands**

  Run: `pnpm lint`
  Run: `pnpm typecheck`
  Run: `npx vitest run --environment jsdom`

- [ ] **Step 7: Commit changes**

  Run:
  ```bash
  git add src/tools/text-statistics/text-statistics.service.ts src/tools/text-statistics/text-statistics.service.test.ts src/tools/text-statistics/text-statistics.vue
  git commit -m "feat: enrich text-statistics tool with LLM token count and cost calculator"
  ```
