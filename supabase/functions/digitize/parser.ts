/**
 * AI Response Parser Utility
 */

export interface ProductData {
  title: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  confidence?: {
    title: number;
    description: number;
    price: number;
    category: number;
    tags: number;
  };
}

export const FALLBACK_PRODUCT: ProductData = {
  title: 'Untitled Product',
  description: 'Product uploaded via SnapShop AI',
  price: 499,
  category: 'Menswear',
  tags: ['clothing'],
  confidence: {
    title: 0.5,
    description: 0.5,
    price: 0.5,
    category: 0.5,
    tags: 0.5,
  },
};

/**
 * Strips HTML/script tags to prevent XSS in AI-generated content.
 */
export function sanitizeText(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim();
}

/**
 * Cleans markdown code fences and parses JSON string
 */
export function parseAIResponse(content: string): ProductData {
  if (!content) return FALLBACK_PRODUCT;

  try {
    // Remove markdown code fences if present
    const cleaned = content.replace(/```json\n?|```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Basic validation
    if (!parsed.title || typeof parsed.title !== 'string')
      parsed.title = FALLBACK_PRODUCT.title;
    if (typeof parsed.price !== 'number') parsed.price = FALLBACK_PRODUCT.price;
    if (!Array.isArray(parsed.tags)) parsed.tags = FALLBACK_PRODUCT.tags;

    // Sanitize text fields to prevent XSS
    parsed.title = sanitizeText(parsed.title);
    if (parsed.description)
      parsed.description = sanitizeText(parsed.description);
    if (parsed.category) parsed.category = sanitizeText(parsed.category);
    if (Array.isArray(parsed.tags)) {
      parsed.tags = parsed.tags.flatMap((t: string) => {
        const sanitized = sanitizeText(t);
        return sanitized ? [sanitized] : [];
      });
    }

    // Default confidence if missing
    if (!parsed.confidence) {
      parsed.confidence = FALLBACK_PRODUCT.confidence;
    } else {
      // Ensure all confidence fields exist and are numbers between 0 and 1
      const defaultConf = FALLBACK_PRODUCT.confidence!;
      parsed.confidence = {
        title:
          typeof parsed.confidence.title === 'number'
            ? parsed.confidence.title
            : defaultConf.title,
        description:
          typeof parsed.confidence.description === 'number'
            ? parsed.confidence.description
            : defaultConf.description,
        price:
          typeof parsed.confidence.price === 'number'
            ? parsed.confidence.price
            : defaultConf.price,
        category:
          typeof parsed.confidence.category === 'number'
            ? parsed.confidence.category
            : defaultConf.category,
        tags:
          typeof parsed.confidence.tags === 'number'
            ? parsed.confidence.tags
            : defaultConf.tags,
      };
    }

    return parsed as ProductData;
  } catch (err) {
    console.error('Failed to parse AI response:', content, err);
    return FALLBACK_PRODUCT;
  }
}
