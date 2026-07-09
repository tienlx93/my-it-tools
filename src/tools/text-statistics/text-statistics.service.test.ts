import { describe, expect, it } from 'vitest';
import { calculateCost, formatCost, getStringSizeInBytes, getTokenCount } from './text-statistics.service';

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
