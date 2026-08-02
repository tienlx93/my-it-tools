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

export function flattenObject(
  obj: any,
  maxDepth: number,
  currentDepth: number = 1,
  prefix: string = '',
): Record<string, any> {
  if (obj === null || typeof obj !== 'object') {
    return prefix ? { [prefix]: obj } : {};
  }

  const result: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];

    if (val !== null && typeof val === 'object' && currentDepth < maxDepth) {
      const flattened = flattenObject(val, maxDepth, currentDepth + 1, newKey);
      Object.assign(result, flattened);
    }
    else if (val !== null && typeof val === 'object') {
      result[newKey] = JSON.stringify(val);
    }
    else {
      result[newKey] = val;
    }
  }

  return result;
}

export function extractTableData(
  parsedData: any,
  maxDepth: number,
): { headers: string[]; rows: Record<string, any>[] } {
  if (parsedData === null || parsedData === undefined) {
    return { headers: [], rows: [] };
  }

  let rawRows: any[];
  if (Array.isArray(parsedData)) {
    rawRows = parsedData;
  }
  else if (typeof parsedData === 'object') {
    rawRows = [parsedData];
  }
  else {
    rawRows = [parsedData];
  }

  const rows: Record<string, any>[] = rawRows.map((item) => {
    if (item !== null && typeof item === 'object') {
      return flattenObject(item, maxDepth);
    }
    return { value: item };
  });

  const headersSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      headersSet.add(key);
    }
  }

  return {
    headers: Array.from(headersSet),
    rows,
  };
}

export function filterAndSortRows(
  rows: Record<string, any>[],
  columnFilters: Record<string, string>,
  sortKey: string | null,
  sortOrder: 'asc' | 'desc' | null,
): Record<string, any>[] {
  const filtered = rows.filter((row) => {
    for (const [col, filterText] of Object.entries(columnFilters)) {
      if (!filterText || !filterText.trim()) {
        continue;
      }
      const val = row[col];
      if (val === undefined || val === null) {
        return false;
      }
      const strVal = String(val).toLowerCase();
      const search = filterText.trim().toLowerCase();
      if (!strVal.includes(search)) {
        return false;
      }
    }
    return true;
  });

  if (!sortKey || !sortOrder) {
    return filtered;
  }

  const sorted = [...filtered].sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];

    if (valA === valB) {
      return 0;
    }
    if (valA === undefined || valA === null) {
      return 1;
    }
    if (valB === undefined || valB === null) {
      return -1;
    }

    let comp = 0;
    if (typeof valA === 'number' && typeof valB === 'number') {
      comp = valA - valB;
    }
    else {
      comp = String(valA).localeCompare(String(valB));
    }

    return sortOrder === 'asc' ? comp : -comp;
  });

  return sorted;
}
