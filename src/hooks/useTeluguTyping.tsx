import { useCallback } from 'react';
import { transliterate } from '@/lib/teluguKeyboard';

/**
 * Hook to provide Telugu typing support for input elements.
 * Automatically transliterates English input to Telugu if the current language is Telugu.
 */
export function useTeluguTyping(active: boolean) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!active) return;

      // Simple implementation: wait for space or enter to transliterate the last word
      // In a real production app, this would be more sophisticated (character-by-character)
      if (e.key === ' ' || e.key === 'Enter') {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        const value = target.value;
        const words = value.split(' ');
        const lastWord = words[words.length - 1];

        if (lastWord) {
          const teluguWord = transliterate(lastWord);
          if (teluguWord !== lastWord) {
            words[words.length - 1] = teluguWord;
            target.value = words.join(' ') + (e.key === ' ' ? ' ' : '');
            // Trigger change event for React controlled components
            const event = new Event('input', { bubbles: true });
            target.dispatchEvent(event);

            if (e.key === ' ') e.preventDefault();
          }
        }
      }
    },
    [active],
  );

  return { handleKeyDown };
}
