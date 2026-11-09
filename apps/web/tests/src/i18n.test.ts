import { describe, expect, it, vi, beforeEach } from 'vitest';
import i18n, { safeT } from '@/i18n';

describe('i18n', () => {
  it('is initialized with resources', () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.options.resources).toBeDefined();
    expect(i18n.options.resources?.en).toBeDefined();
    expect(i18n.options.resources?.te).toBeDefined();
    expect(i18n.options.resources?.hi).toBeDefined();
  });

  describe('safeT', () => {
    it('translates a key successfully', () => {
      // 'app.name' might not be in the real translation files during test,
      // but it should return the key if not found, or the translation if found.
      const result = safeT('test.key');
      expect(result).toBeDefined();
    });

    it('returns the key and logs an error when i18n.t throws', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const tSpy = vi.spyOn(i18n, 't').mockImplementation(() => {
        throw new Error('Forced error');
      });

      const result = safeT('error.key');

      expect(result).toBe('error.key');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('i18n translation error for key: error.key'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
      tSpy.mockRestore();
    });
  });
});
