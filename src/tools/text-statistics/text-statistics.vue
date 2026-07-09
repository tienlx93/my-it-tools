<script setup lang="ts">
import { MODELS_PRICING, calculateCost, formatCost, getStringSizeInBytes, getTokenCount } from './text-statistics.service';
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
  return MODELS_PRICING.map((model) => {
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
function getProviderTagType(provider: string): 'default' | 'error' | 'primary' | 'info' | 'success' | 'warning' {
  switch (provider) {
    case 'OpenAI': return 'success';
    case 'Anthropic': return 'warning';
    case 'Google': return 'info';
    default: return 'default';
  }
}
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
      <h3 mb-4 text-lg font-bold>
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
