import slugify from '@sindresorhus/slugify';
import { stringify as stringifyYaml } from 'yaml';
import * as XLSX from 'xlsx';

export interface Cell {
  html: string
}

export type Alignment = 'left' | 'center' | 'right' | null;

export interface TableSnapshot {
  headers: Cell[]
  rows: Cell[][]
  alignments: Alignment[]
}

export class TableState {
  public headers: Cell[] = [];
  public rows: Cell[][] = [];
  public alignments: Alignment[] = [];

  public undoStack: string[] = [];
  public redoStack: string[] = [];

  public get canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  public get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  constructor(initialRows = 3, initialCols = 3) {
    this.reset(initialRows, initialCols);
  }

  public reset(numRows: number, numCols: number) {
    this.headers = Array.from({ length: numCols }, () => ({ html: '' }));
    this.rows = Array.from({ length: numRows }, () =>
      Array.from({ length: numCols }, () => ({ html: '' })),
    );
    this.alignments = Array.from({ length: numCols }, () => null);
    this.clearHistory();
    this.undoStack.push(this.serialize());
  }

  public clearHistory() {
    this.undoStack = [];
    this.redoStack = [];
  }

  private serialize(): string {
    return JSON.stringify({
      headers: this.headers,
      rows: this.rows,
      alignments: this.alignments,
    });
  }

  private deserialize(json: string) {
    const data = JSON.parse(json);
    this.headers = data.headers;
    this.rows = data.rows;
    this.alignments = data.alignments;
  }

  public saveHistory() {
    this.undoStack.push(this.serialize());
    this.redoStack = [];
  }

  public undo() {
    if (this.undoStack.length > 1) {
      const current = this.undoStack.pop();
      if (current) {
        this.redoStack.push(current);
      }
      const prev = this.undoStack[this.undoStack.length - 1];
      this.deserialize(prev);
    }
  }

  public redo() {
    if (this.redoStack.length > 0) {
      const next = this.redoStack.pop();
      if (next) {
        this.undoStack.push(next);
        this.deserialize(next);
      }
    }
  }

  public setColumnAlignment(colIdx: number, align: Alignment) {
    if (colIdx >= 0 && colIdx < this.alignments.length) {
      this.alignments[colIdx] = align;
      this.saveHistory();
    }
  }

  public insertRow(rowIdx: number, position: 'above' | 'below') {
    if (rowIdx >= 0 && rowIdx < this.rows.length) {
      const insertAt = position === 'above' ? rowIdx : rowIdx + 1;
      const numCols = this.headers.length;
      const newRow = Array.from({ length: numCols }, () => ({ html: '' }));
      this.rows.splice(insertAt, 0, newRow);
      this.saveHistory();
    }
  }

  public deleteRow(rowIdx: number) {
    if (rowIdx >= 0 && rowIdx < this.rows.length) {
      if (this.rows.length > 1) {
        this.rows.splice(rowIdx, 1);
        this.saveHistory();
      }
    }
  }

  public insertColumn(colIdx: number, position: 'left' | 'right') {
    if (colIdx >= 0 && colIdx < this.headers.length) {
      const insertAt = position === 'left' ? colIdx : colIdx + 1;
      this.headers.splice(insertAt, 0, { html: '' });
      this.alignments.splice(insertAt, 0, null);
      for (const row of this.rows) {
        row.splice(insertAt, 0, { html: '' });
      }
      this.saveHistory();
    }
  }

  public deleteColumn(colIdx: number) {
    if (colIdx >= 0 && colIdx < this.headers.length) {
      if (this.headers.length > 1) {
        this.headers.splice(colIdx, 1);
        this.alignments.splice(colIdx, 1);
        for (const row of this.rows) {
          row.splice(colIdx, 1);
        }
        this.saveHistory();
      }
    }
  }

  public transpose() {
    const oldRowsCount = this.rows.length;
    const oldColsCount = this.headers.length;

    const newHeaders: Cell[] = [];
    const newRows: Cell[][] = [];
    const newAlignments: Alignment[] = Array.from({ length: oldRowsCount + 1 }, () => null);

    newHeaders.push({ html: this.headers[0].html });
    for (let r = 0; r < oldRowsCount; r++) {
      newHeaders.push({ html: this.rows[r][0].html });
    }

    for (let c = 1; c < oldColsCount; c++) {
      const row: Cell[] = [{ html: this.headers[c].html }];
      for (let r = 0; r < oldRowsCount; r++) {
        row.push({ html: this.rows[r][c].html });
      }
      newRows.push(row);
    }

    if (newRows.length === 0) {
      newRows.push(Array.from({ length: newHeaders.length }, () => ({ html: '' })));
    }

    this.headers = newHeaders;
    this.rows = newRows;
    this.alignments = newAlignments;
    this.saveHistory();
  }

  // Helper to translate HTML cell format to Markdown syntax
  public static htmlToCellMarkdown(html: string): string {
    if (!html) {
      return '';
    }

    let text = html;
    text = text.replace(/<(b|strong)>(.*?)<\/\1>/gi, '**$2**');
    text = text.replace(/<(i|em)>(.*?)<\/\1>/gi, '*$2*');
    text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    text = text.replace(/<br\s*\/?>/gi, '___BR___');
    text = text.replace(/<\/p><p>/gi, '___BR___');
    text = text.replace(/<\/div><div>/gi, '___BR___');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/___BR___/g, '<br>');
    text = text.replace(/\|/g, '\\|');
    return text.trim();
  }

  public toMarkdown(options: { compact: boolean }): string {
    const compact = options.compact;
    const mdHeaders = this.headers.map(h => TableState.htmlToCellMarkdown(h.html));
    const mdRows = this.rows.map(row => row.map(cell => TableState.htmlToCellMarkdown(cell.html)));

    const colWidths = this.headers.map((_, colIdx) => {
      if (compact) {
        return 0;
      }
      let maxLen = mdHeaders[colIdx].length;
      for (const row of mdRows) {
        maxLen = Math.max(maxLen, row[colIdx].length);
      }
      return Math.max(maxLen, 3);
    });

    const formatCell = (text: string, colIdx: number): string => {
      if (compact) {
        return text;
      }
      const width = colWidths[colIdx];
      return text.padEnd(width, ' ');
    };

    if (compact) {
      const headerLine = `|${mdHeaders.join('|')}|`;
      const separatorLine = `|${this.alignments.map((align) => {
        const dashCount = 3;
        if (align === 'left') {
          return `:${'-'.repeat(dashCount - 1)}`;
        }
 else if (align === 'center') {
          return `:${'-'.repeat(dashCount - 2)}:`;
        }
 else if (align === 'right') {
          return `${'-'.repeat(dashCount - 1)}:`;
        }
 else {
          return '-'.repeat(dashCount);
        }
      }).join('|')}|`;
      const bodyLines = mdRows.map((row) => {
        return `|${row.join('|')}|`;
      });
      return [headerLine, separatorLine, ...bodyLines].join('\n');
    }
    else {
      const headerLine = `| ${mdHeaders.map((h, i) => formatCell(h, i)).join(' | ')} |`;
      const separatorLine = `| ${this.alignments.map((align, i) => {
        const width = colWidths[i];
        const dashCount = width;

        if (align === 'left') {
          return `:${'-'.repeat(dashCount - 1)}`;
        }
 else if (align === 'center') {
          return `:${'-'.repeat(dashCount - 2)}:`;
        }
 else if (align === 'right') {
          return `${'-'.repeat(dashCount - 1)}:`;
        }
 else {
          return '-'.repeat(dashCount);
        }
      }).join(' | ')} |`;
      const bodyLines = mdRows.map((row) => {
        return `| ${row.map((cell, i) => formatCell(cell, i)).join(' | ')} |`;
      });
      return [headerLine, separatorLine, ...bodyLines].join('\n');
    }
  }

  // Helper to strip HTML tags and get plain text, preserving line breaks
  private static htmlToPlainText(html: string): string {
    if (!html) {
      return '';
    }
    // Convert block/line-break elements to newlines before stripping tags
    let text = html;
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<\/li>/gi, '\n');
    // Strip all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');
    // Decode common HTML entities
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, '\'');
    text = text.replace(/&nbsp;/g, ' ');
    // Normalize line endings and trim
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Collapse multiple blank lines to a single newline
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
  }

  // Get plain-text headers
  private getPlainHeaders(): string[] {
    return this.headers.map(h => TableState.htmlToPlainText(h.html));
  }

  // Get plain-text rows
  private getPlainRows(): string[][] {
    return this.rows.map(row => row.map(cell => TableState.htmlToPlainText(cell.html)));
  }

  // Slugify a header to a safe key name
  private static slugifyKey(header: string): string {
    const slug = slugify(header, { separator: '_' });
    return slug || `column_${Math.random().toString(36).slice(2, 7)}`;
  }

  public toJson(): string {
    const headers = this.getPlainHeaders();
    const rows = this.getPlainRows();
    const keys = headers.map(h => TableState.slugifyKey(h));
    const data = rows.map((row) => {
      const obj: Record<string, string> = {};
      keys.forEach((key, i) => {
        obj[key] = row[i] ?? '';
      });
      return obj;
    });
    return JSON.stringify(data, null, 2);
  }

  public toYaml(): string {
    const headers = this.getPlainHeaders();
    const rows = this.getPlainRows();
    const keys = headers.map(h => TableState.slugifyKey(h));
    const data = rows.map((row) => {
      const obj: Record<string, string> = {};
      keys.forEach((key, i) => {
        obj[key] = row[i] ?? '';
      });
      return obj;
    });
    return stringifyYaml(data);
  }

  public toSqlInsert(tableName = 'table_data'): string {
    const headers = this.getPlainHeaders();
    const rows = this.getPlainRows();
    const columns = headers.map(h => `\`${h.replace(/`/g, '``')}\``).join(', ');
    const lines = rows.map((row) => {
      const values = row.map((cell) => {
        const escaped = cell.replace(/'/g, '\'\'');
        return `'${escaped}'`;
      }).join(', ');
      return `INSERT INTO \`${tableName}\` (${columns}) VALUES (${values});`;
    });
    return lines.join('\n');
  }

  public toCsv(delimiter: ',' | ';' | '\t' = ','): string {
    const headers = this.getPlainHeaders();
    const rows = this.getPlainRows();

    const escapeCell = (cell: string): string => {
      if (cell.includes(delimiter) || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    };

    const headerLine = headers.map(escapeCell).join(delimiter);
    const bodyLines = rows.map(row => row.map(escapeCell).join(delimiter));
    return [headerLine, ...bodyLines].join('\n');
  }

  public toMarkdownExport(compact = false): string {
    return this.toMarkdown({ compact });
  }

  public toXlsxBuffer(): ArrayBuffer {
    const headers = this.getPlainHeaders();
    const rows = this.getPlainRows();
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return buf;
  }

  public parsePaste(html: string, text: string) {
    this.saveHistory();

    if (html && html.includes('<table')) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const table = doc.querySelector('table');
        if (table) {
          const rows = Array.from(table.querySelectorAll('tr'));
          if (rows.length > 0) {
            const headerRow = rows[0];
            const headerCells = Array.from(headerRow.querySelectorAll('th, td'));
            const numCols = headerCells.length;

            this.headers = headerCells.map(c => ({ html: c.innerHTML.trim() }));
            this.alignments = Array.from({ length: numCols }, () => null);

            this.rows = rows.slice(1).map((tr) => {
              const cells = Array.from(tr.querySelectorAll('th, td'));
              return Array.from({ length: numCols }, (_, i) => ({
                html: cells[i] ? cells[i].innerHTML.trim() : '',
              }));
            });

            if (this.rows.length === 0) {
              this.rows = [[...this.headers]];
              this.headers = Array.from({ length: numCols }, () => ({ html: 'Header' }));
            }
            return;
          }
        }
      }
      catch (e) {
        console.error('Failed to parse pasted HTML table:', e);
      }
    }

    const content = text || '';
    if (content) {
      const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length > 0) {
        const firstLine = lines[0];
        const isTab = firstLine.includes('\t');
        const delimiter = isTab ? '\t' : ',';

        const parseLine = (line: string) => {
          return line.split(delimiter).map((cell) => {
            let val = cell.trim();
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.substring(1, val.length - 1).replace(/""/g, '"');
            }
            return { html: val };
          });
        };

        const firstRowCells = parseLine(lines[0]);
        const numCols = firstRowCells.length;

        this.headers = firstRowCells;
        this.alignments = Array.from({ length: numCols }, () => null);
        this.rows = lines.slice(1).map((line) => {
          const cells = parseLine(line);
          return Array.from({ length: numCols }, (_, i) => ({
            html: cells[i] ? cells[i].html : '',
          }));
        });
      }
    }
  }
}
