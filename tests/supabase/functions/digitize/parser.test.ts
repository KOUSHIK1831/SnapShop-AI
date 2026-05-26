import { describe, it, expect } from 'vitest';
import {
  parseAIResponse,
  FALLBACK_PRODUCT,
  sanitizeText,
} from '../../../../supabase/functions/digitize/parser';

describe('sanitizeText', () => {
  it('should strip script tags', () => {
    expect(sanitizeText('hello <script>alert("xss")</script> world')).toBe(
      'hello  world',
    );
  });

  it('should strip all HTML tags', () => {
    expect(sanitizeText('<b>Bold</b> <i>Italic</i>')).toBe('Bold Italic');
  });

  it('should strip lone angle brackets', () => {
    expect(sanitizeText('evil < > text')).toBe('evil  text');
  });

  it('should keep non-HTML special characters', () => {
    expect(sanitizeText('"><script>alert(1)</script>')).toBe('"');
  });

  it('should return empty string for null/undefined', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
  });

  it('should keep normal text unchanged', () => {
    expect(sanitizeText('Blue Cotton Kurta')).toBe('Blue Cotton Kurta');
  });
});

describe('parseAIResponse', () => {
  it('should parse valid JSON', () => {
    const input =
      '{"title": "Red Saree", "price": 1200, "category": "Ethnic", "tags": ["silk"], "description": "Beautiful silk saree"}';
    const result = parseAIResponse(input);
    expect(result.title).toBe('Red Saree');
    expect(result.price).toBe(1200);
  });

  it('should strip markdown code fences', () => {
    const input = '```json\n{"title": "Blue Jeans", "price": 999}\n```';
    const result = parseAIResponse(input);
    expect(result.title).toBe('Blue Jeans');
    expect(result.price).toBe(999);
  });

  it('should return fallback on empty input', () => {
    const result = parseAIResponse('');
    expect(result).toEqual(FALLBACK_PRODUCT);
  });

  it('should return fallback on invalid JSON', () => {
    const result = parseAIResponse('not a json');
    expect(result).toEqual(FALLBACK_PRODUCT);
  });

  it('should use fallback values for missing required fields', () => {
    const input = '{"category": "Menswear"}';
    const result = parseAIResponse(input);
    expect(result.title).toBe(FALLBACK_PRODUCT.title);
    expect(result.category).toBe('Menswear');
  });
});
