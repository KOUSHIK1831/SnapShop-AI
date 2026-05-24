/**
 * Phonetic mapping for Telugu typing.
 * Maps English letter combinations to Telugu characters.
 */
export const teluguMapping: Record<string, string> = {
  'a': 'అ', 'aa': 'ఆ', 'A': 'ఆ',
  'i': 'ఇ', 'ii': 'ఈ', 'I': 'ఈ',
  'u': 'ఉ', 'uu': 'ఊ', 'U': 'ఊ',
  'Ru': 'ఋ', 'RU': 'ౠ',
  'e': 'ఎ', 'ee': 'ఏ', 'E': 'ఏ',
  'ai': 'ఐ', 'AI': 'ఐ',
  'o': 'ఒ', 'oo': 'ఓ', 'O': 'ఓ',
  'au': 'ఔ', 'AU': 'ఔ',
  'am': 'అం', 'ah': 'అః',
  
  'k': 'క్', 'kh': 'ఖ్', 'g': 'గ్', 'gh': 'ఘ్', 'ng': 'ఙ్',
  'ch': 'చ్', 'Ch': 'ఛ్', 'j': 'జ్', 'jh': 'ఝ్', 'ny': 'ఞ్',
  't': 'ట్', 'th': 'ఠ్', 'd': 'డ్', 'dh': 'ఢ్', 'N': 'ణ్',
  'thh': 'త్', 'thhh': 'థ్', 'dhh': 'ద్', 'dhhh': 'ధ్', 'n': 'న్',
  'p': 'ప్', 'ph': 'ఫ్', 'b': 'బ్', 'bh': 'భ్', 'm': 'మ్',
  'y': 'య్', 'r': 'ర్', 'l': 'ల్', 'v': 'వ్', 'w': 'వ్',
  'sh': 'శ్', 'S': 'ష్', 's': 'స్', 'h': 'హ్', 'L': 'ళ్',
  'x': 'క్ష్', 'R': 'ఱ్',

  // Guninthalu (Vowel signs)
  'ka': 'క', 'kaa': 'కా', 'ki': 'కి', 'kii': 'కీ', 'ku': 'కు', 'kuu': 'కూ', 'ke': 'కె', 'kee': 'కే', 'kai': 'కై', 'ko': 'కొ', 'koo': 'కో', 'kau': 'కౌ', 'kam': 'కం', 'kah': 'కః',
  // ... (Simplified for prototype, can be expanded)
};

export const transliterate = (text: string): string => {
  // This is a simplified transliteration logic
  let result = text;
  const sortedKeys = Object.keys(teluguMapping).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    const regex = new RegExp(key, 'g');
    result = result.replace(regex, teluguMapping[key]);
  }
  
  return result;
};
