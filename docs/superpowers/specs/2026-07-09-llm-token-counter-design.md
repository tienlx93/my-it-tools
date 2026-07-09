# Design Specification: LLM Token Counter & Pricing Table

## Goal
Enrich the existing `text-statistics` tool with an LLM Token Counter and a clean, tabular display showing token counts and input/output cost estimates across the major active models in 2026 (OpenAI, Anthropic, and Google Gemini).

## Requirements
1. **Interactive Token Counting:** Count tokens in real-time as the user types or pastes text.
2. **Tokenizer Profiles:** 
   - Use `o200k_base` tokenizer for OpenAI's latest models.
   - Use `cl100k_base` tokenizer for older models or as a close local approximation for Anthropic and Google models to avoid heavy remote network calls or WebAssembly dependencies.
3. **Up-to-Date 2026 Model Catalog:** 
   - **OpenAI:** GPT-5.5 Pro, GPT-5.5, GPT-5, GPT-5.4 mini, GPT-5.4 nano.
   - **Anthropic:** Claude Fable 5, Claude Sonnet 5, Claude Haiku 4.5.
   - **Google:** Gemini 3.1 Pro, Gemini 3.5 Flash, Gemini 2.5 Flash-Lite.
4. **Editable Pricing & Code Structure:** Maintain an easy-to-update pricing catalog and cost calculation method in the service module.
5. **Cost Estimation:** Show both **Input Cost** (cost to read the text) and **Output Cost** (cost to generate the text) based on the calculated tokens.
6. **Tabs/Sections UI:** Use a clean, responsive `<n-table>` component to present the results cleanly without cluttering the primary statistics.

---

## Technical Details

### 1. Data Models & Constants
We define the structure of models and pricing in [text-statistics.service.ts](file:///D:/Working/my-it-tools/src/tools/text-statistics/text-statistics.service.ts):

```typescript
export interface ModelPricing {
  provider: string;
  name: string;
  inputCostPerMillion: number; // in USD
  outputCostPerMillion: number; // in USD
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
```

### 2. Pricing & Token Count Methods
Exposed in [text-statistics.service.ts](file:///D:/Working/my-it-tools/src/tools/text-statistics/text-statistics.service.ts):

```typescript
import { getEncoding } from 'js-tiktoken';

// Lazy-loaded tokenizers
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

### 3. UI Design
We will add a beautiful table below the main text-statistics fields in [text-statistics.vue](file:///D:/Working/my-it-tools/src/tools/text-statistics/text-statistics.vue):

- Under the standard statistics (character/word/byte counts), add a section `<div mt-6>`:
- Title: **LLM Token Count & Estimated Costs**
- Table with headers:
  - **Provider** (OpenAI: green/blue tags, Anthropic: orange/brown tags, Google: purple/blue tags)
  - **Model**
  - **Tokenizer** (small monospace text: `o200k_base` or `cl100k_base (approx)`)
  - **Token Count** (bold numeric alignment)
  - **Input Cost** (formatted currency)
  - **Output Cost** (formatted currency)

Add a Collapse with raw table of base price ($ per mil token for config models)

---

## Testing Strategy
- Add unit tests in `text-statistics.service.test.ts` to test:
  1. `getTokenCount` for both `cl100k_base` and `o200k_base` profiles on standard inputs.
  2. `calculateCost` logic on boundary conditions (0 tokens, small token sizes, large token sizes).
  3. `formatCost` format precision.
- Run `pnpm test` to verify all tests pass.
- Run `pnpm typecheck` and `pnpm lint` to verify compilation and linting correctness.
