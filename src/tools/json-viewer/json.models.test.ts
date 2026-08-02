import { describe, expect, it } from 'vitest';
import { extractTableData, filterAndSortRows, flattenObject, sortObjectKeys } from './json.models';

describe('json models', () => {
  describe('sortObjectKeys', () => {
    it('the object keys are recursively sorted alphabetically', () => {
      expect(JSON.stringify(sortObjectKeys({ b: 2, a: 1 }))).to.deep.equal(JSON.stringify({ a: 1, b: 2 }));
      // To unsure that this way of testing is working
      expect(JSON.stringify(sortObjectKeys({ b: 2, a: 1 }))).to.not.deep.equal(JSON.stringify({ b: 2, a: 1 }));

      expect(JSON.stringify(sortObjectKeys({ b: 2, a: 1, d: { j: 7, a: [{ z: 9, y: 8 }] }, c: 3 }))).to.deep.equal(
        JSON.stringify({ a: 1, b: 2, c: 3, d: { a: [{ y: 8, z: 9 }], j: 7 } }),
      );
    });
  });

  describe('flattenObject', () => {
    it('flattens object up to maxDepth 1 (stringifies deeper objects)', () => {
      const input = { a: 1, b: { c: 2 } };
      expect(flattenObject(input, 1)).toEqual({ a: 1, b: '{"c":2}' });
    });

    it('flattens object up to maxDepth 2', () => {
      const input = { a: 1, b: { c: 2, d: { e: 3 } } };
      expect(flattenObject(input, 2)).toEqual({ 'a': 1, 'b.c': 2, 'b.d': '{"e":3}' });
    });

    it('flattens object up to maxDepth 3', () => {
      const input = { a: { b: { c: 3 } } };
      expect(flattenObject(input, 3)).toEqual({ 'a.b.c': 3 });
    });
  });

  describe('extractTableData', () => {
    it('extracts table headers and rows from an array of objects', () => {
      const input = [{ a: 1 }, { b: 2 }];
      const result = extractTableData(input, 1);
      expect(result.headers).toEqual(['a', 'b']);
      expect(result.rows).toEqual([{ a: 1 }, { b: 2 }]);
    });

    it('extracts table headers and rows from a single object', () => {
      const input = { a: 1 };
      const result = extractTableData(input, 1);
      expect(result.headers).toEqual(['a']);
      expect(result.rows).toEqual([{ a: 1 }]);
    });
  });

  describe('filterAndSortRows', () => {
    it('filters rows based on column filters', () => {
      const rows = [
        { author: 'Herman Melville', title: 'Moby Dick' },
        { author: 'Jane Austen', title: 'Pride and Prejudice' },
      ];
      const filtered = filterAndSortRows(rows, { author: 'Melville' }, null, null);
      expect(filtered).toEqual([{ author: 'Herman Melville', title: 'Moby Dick' }]);
    });

    it('sorts numeric columns ascending and descending', () => {
      const rows = [{ val: 30 }, { val: 10 }, { val: 20 }];
      const asc = filterAndSortRows(rows, {}, 'val', 'asc');
      expect(asc).toEqual([{ val: 10 }, { val: 20 }, { val: 30 }]);

      const desc = filterAndSortRows(rows, {}, 'val', 'desc');
      expect(desc).toEqual([{ val: 30 }, { val: 20 }, { val: 10 }]);
    });

    it('sorts string columns ascending and descending', () => {
      const rows = [{ name: 'Banana' }, { name: 'Apple' }, { name: 'Cherry' }];
      const asc = filterAndSortRows(rows, {}, 'name', 'asc');
      expect(asc).toEqual([{ name: 'Apple' }, { name: 'Banana' }, { name: 'Cherry' }]);

      const desc = filterAndSortRows(rows, {}, 'name', 'desc');
      expect(desc).toEqual([{ name: 'Cherry' }, { name: 'Banana' }, { name: 'Apple' }]);
    });
  });
});
