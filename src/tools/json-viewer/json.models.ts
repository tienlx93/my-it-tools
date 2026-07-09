import { type MaybeRef, get } from '@vueuse/core';
import JSON5 from 'json5';
import { JSONPath } from 'jsonpath-plus';

export { sortObjectKeys, formatJson, validateJson, formatAndQueryJson };

function sortObjectKeys<T>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys) as unknown as T;
  }

  return Object.keys(obj)
    .sort((a, b) => a.localeCompare(b))
    .reduce((sortedObj, key) => {
      sortedObj[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
      return sortedObj;
    }, {} as Record<string, unknown>) as T;
}

export interface FormatOptions {
  rawJson: string
  indentSize: string | number // '2', '4', '1', 'tab', 'minified'
  sortKeys: boolean
  parserMode: 'json' | 'json5'
  jsonPath?: string
}

export interface ValidationResult {
  isValid: boolean
  error?: {
    message: string
    line?: number
    column?: number
  }
}

function validateJson(rawJson: string, mode: 'json' | 'json5'): ValidationResult {
  if (!rawJson.trim()) {
    return { isValid: true };
  }
  try {
    if (mode === 'json') {
      JSON.parse(rawJson);
    }
    else {
      JSON5.parse(rawJson);
    }
    return { isValid: true };
  }
  catch (e: any) {
    // Extract line and column numbers
    let line: number | undefined;
    let column: number | undefined;
    if (e.line !== undefined) {
      line = e.line;
      column = e.column;
    }
    else {
      // Fallback parse of the error message for line/column
      const match = e.message.match(/at line (\d+), column (\d+)/i)
                    || e.message.match(/position (\d+)/i)
                    || e.message.match(/line (\d+) column (\d+)/i);
      if (match) {
        if (match[2] !== undefined) {
          line = Number.parseInt(match[1], 10);
          column = Number.parseInt(match[2], 10);
        }
        else {
          // position index fallback
          const pos = Number.parseInt(match[1], 10);
          const before = rawJson.substring(0, pos);
          const lines = before.split('\n');
          line = lines.length;
          column = lines[lines.length - 1].length + 1;
        }
      }
    }
    return {
      isValid: false,
      error: {
        message: e.message,
        line,
        column,
      },
    };
  }
}

function formatAndQueryJson(options: FormatOptions): string {
  const { rawJson, indentSize, sortKeys, parserMode, jsonPath } = options;
  if (!rawJson.trim()) {
    return '';
  }

  let parsed: any;
  if (parserMode === 'json') {
    parsed = JSON.parse(rawJson);
  }
  else {
    parsed = JSON5.parse(rawJson);
  }

  if (sortKeys) {
    parsed = sortObjectKeys(parsed);
  }

  let queryResult = parsed;
  if (jsonPath && jsonPath.trim()) {
    queryResult = JSONPath({
      path: jsonPath.trim(),
      json: parsed,
      preventEval: true,
    } as any);
  }

  if (queryResult === undefined) {
    return 'undefined';
  }

  // Determine indentation spacing
  if (indentSize === 'minified') {
    return JSON.stringify(queryResult);
  }

  let spacing: string | number = 2;
  if (indentSize === 'tab') {
    spacing = '\t';
  }
  else {
    spacing = Number.parseInt(String(indentSize), 10);
    if (Number.isNaN(spacing)) {
      spacing = 2;
    }
  }

  return JSON.stringify(queryResult, null, spacing);
}

function formatJson({
  rawJson,
  sortKeys = true,
  indentSize = 3,
}: {
  rawJson: MaybeRef<string>
  sortKeys?: MaybeRef<boolean>
  indentSize?: MaybeRef<number>
}) {
  const parsedObject = JSON5.parse(get(rawJson));
  return JSON.stringify(get(sortKeys) ? sortObjectKeys(parsedObject) : parsedObject, null, get(indentSize));
}
