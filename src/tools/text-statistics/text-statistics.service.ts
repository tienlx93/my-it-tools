import type { Tiktoken } from 'js-tiktoken';

export interface ModelPricing {
  provider: string
  name: string
  inputCostPerMillion: number
  outputCostPerMillion: number
  encoding: 'o200k_base' | 'cl100k_base'
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

let cl100kEncoder: Tiktoken | null = null;
let o200kEncoder: Tiktoken | null = null;

async function getEncoder(encoding: 'cl100k_base' | 'o200k_base'): Promise<Tiktoken> {
  if (encoding === 'cl100k_base') {
    if (!cl100kEncoder) {
      const { getEncoding } = await import('js-tiktoken');
      cl100kEncoder = getEncoding('cl100k_base');
    }
    return cl100kEncoder;
  }
  else {
    if (!o200kEncoder) {
      const { getEncoding } = await import('js-tiktoken');
      o200kEncoder = getEncoding('o200k_base');
    }
    return o200kEncoder;
  }
}

export async function getTokenCount(text: string, encoding: 'cl100k_base' | 'o200k_base'): Promise<number> {
  if (!text) {
    return 0;
  }
  try {
    const encoder = await getEncoder(encoding);
    return encoder.encode(text).length;
  }
  catch (e) {
    console.error(`Tokenization failed for ${encoding}:`, e);
    return 0;
  }
}

export function calculateCost(tokens: number, ratePerMillion: number): number {
  return (tokens / 1_000_000) * ratePerMillion;
}

export function formatCost(cost: number): string {
  if (cost === 0) {
    return '$0.00';
  }
  if (cost < 0.0001) {
    return `$${cost.toFixed(6)}`;
  }
  return cost.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}
