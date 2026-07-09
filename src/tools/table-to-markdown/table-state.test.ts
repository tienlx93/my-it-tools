import { describe, expect, it } from 'vitest';
import { TableState } from './table-state';

describe('TableState Core Operations', () => {
  it('initializes grid with correct dimensions', () => {
    const state = new TableState(3, 4);
    expect(state.headers.length).toBe(4);
    expect(state.rows.length).toBe(3);
    expect(state.rows[0].length).toBe(4);
    expect(state.alignments.length).toBe(4);
  });

  it('can set column alignment', () => {
    const state = new TableState(3, 3);
    state.setColumnAlignment(1, 'center');
    expect(state.alignments[1]).toBe('center');
  });

  it('can insert row and column', () => {
    const state = new TableState(2, 2);
    state.insertRow(1, 'below');
    expect(state.rows.length).toBe(3);

    state.insertColumn(0, 'right');
    expect(state.headers.length).toBe(3);
    expect(state.rows[0].length).toBe(3);
  });

  it('can delete row and column', () => {
    const state = new TableState(3, 3);
    state.deleteRow(1);
    expect(state.rows.length).toBe(2);

    state.deleteColumn(1);
    expect(state.headers.length).toBe(2);
    expect(state.rows[0].length).toBe(2);
  });

  it('can transpose a table', () => {
    const state = new TableState(2, 3); // 2 rows, 3 cols
    state.headers[0].html = 'H1';
    state.headers[1].html = 'H2';
    state.headers[2].html = 'H3';
    state.rows[0][0].html = 'A';
    state.rows[1][0].html = 'B';
    state.transpose();
    expect(state.headers.length).toBe(3);
    expect(state.rows.length).toBe(2);
    expect(state.rows[0].length).toBe(3);
  });

  it('handles Undo and Redo states', () => {
    const state = new TableState(2, 2);
    state.saveHistory();
    state.rows[0][0].html = 'Edited';
    state.saveHistory();
    state.undo();
    expect(state.rows[0][0].html).toBe('');
    state.redo();
    expect(state.rows[0][0].html).toBe('Edited');
  });

  it('allows undoing the first mutation', () => {
    const state = new TableState(2, 2);
    state.setColumnAlignment(1, 'center');
    expect(state.alignments[1]).toBe('center');
    state.undo();
    expect(state.alignments[1]).toBeNull();
  });

  it('does not mutate or save history if indices are out of bounds', () => {
    const state = new TableState(2, 2);

    // deleteRow with out of bounds index
    state.deleteRow(-1);
    expect(state.rows.length).toBe(2);

    state.deleteRow(5);
    expect(state.rows.length).toBe(2);

    // deleteColumn with out of bounds index
    state.deleteColumn(-1);
    expect(state.headers.length).toBe(2);

    state.deleteColumn(5);
    expect(state.headers.length).toBe(2);

    // insertRow with out of bounds index
    state.insertRow(-1, 'above');
    expect(state.rows.length).toBe(2);

    state.insertRow(5, 'above');
    expect(state.rows.length).toBe(2);

    // insertColumn with out of bounds index
    state.insertColumn(-1, 'left');
    expect(state.headers.length).toBe(2);

    state.insertColumn(5, 'left');
    expect(state.headers.length).toBe(2);

    // setColumnAlignment with out of bounds index
    state.setColumnAlignment(-1, 'center');
    expect(state.alignments).toEqual([null, null]);

    state.setColumnAlignment(5, 'center');
    expect(state.alignments).toEqual([null, null]);
  });

  describe('Markdown Conversion & Parsing', () => {
    it('serializes cell styles to GFM Markdown with formatting', () => {
      const state = new TableState(1, 2);
      state.headers[0].html = '<b>Header 1</b>';
      state.headers[1].html = 'Header 2';
      state.rows[0][0].html = '<i>Italic</i>';
      state.rows[0][1].html = 'Line 1<br>Line 2';

      const markdown = state.toMarkdown({ compact: true });
      expect(markdown).toContain('|**Header 1**|Header 2|');
      expect(markdown).toContain('|*Italic*|Line 1<br>Line 2|');
    });

    it('generates padded Markdown in beautified mode', () => {
      const state = new TableState(1, 2);
      state.headers[0].html = 'H1';
      state.headers[1].html = 'LongHeader';
      state.rows[0][0].html = 'Value';
      state.rows[0][1].html = 'V';

      const markdown = state.toMarkdown({ compact: false });
      expect(markdown).toContain('| H1    | LongHeader |');
    });

    it('parses Excel HTML paste tables', () => {
      const excelHtml = `
        <table>
          <tr><th>Col A</th><th>Col B</th></tr>
          <tr><td>A1</td><td><b>B1</b></td></tr>
        </table>
      `;
      const state = new TableState(1, 1);
      state.parsePaste(excelHtml, '');
      expect(state.headers.length).toBe(2);
      expect(state.headers[0].html).toBe('Col A');
      expect(state.rows[0][1].html).toContain('<b>B1</b>');
    });

    it('parses CSV/TSV plain text paste', () => {
      const plainText = 'Col A\tCol B\nA1\tB1';
      const state = new TableState(1, 1);
      state.parsePaste('', plainText);
      expect(state.headers.length).toBe(2);
      expect(state.rows[0][0].html).toBe('A1');
    });
  });
});
