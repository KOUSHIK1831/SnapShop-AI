import { describe, expect, it } from 'vitest';
import { transliterate, teluguMapping } from './teluguKeyboard';

describe('teluguKeyboard', () => {
  it('transliterates simple characters', () => {
    expect(transliterate('a')).toBe('అ');
    expect(transliterate('ka')).toBe('క');
  });

  it('transliterates multiple characters', () => {
    // Note: the current implementation uses simple regex replacement 
    // which might not be perfect for all combinations, but we test what it does.
    expect(transliterate('kaa')).toBe('కా');
  });

  it('sorts keys by length to handle multi-char mappings first', () => {
    // 'aa' should be replaced before 'a'
    expect(transliterate('aa')).toBe('ఆ');
  });

  it('handles unknown characters by keeping them', () => {
    expect(transliterate('z')).toBe('z');
  });

  it('covers various mappings', () => {
    expect(transliterate('Ru')).toBe('ఋ');
    expect(transliterate('kh')).toBe('ఖ్');
  });
});
