import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { badRequest, unprocessable } from '../../lib/http-error';

export interface DigitizeResult {
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

const CLOTHING_KEYWORDS = [
  'shirt',
  't-shirt',
  'tshirt',
  'kurta',
  'saree',
  'lehenga',
  'jeans',
  'dress',
  'ethnic',
  'menswear',
  'womenswear',
  'footwear',
  'accessories',
  'jacket',
  'sweater',
  'hoodie',
  'trouser',
  'skirt',
  'suit',
  'blazer',
  'coat',
  'shawl',
  'dupatta',
  'salwar',
  'churidar',
  'dhoti',
  'lungi',
  'sherwani',
  'frock',
  'gown',
  'lingerie',
  'activewear',
  'swimwear',
  'men',
  'women',
  'kids',
  'unisex',
  'cotton',
  'silk',
  'denim',
  'blouse',
  'pants',
  'top',
  'shoes',
  'sandals',
  'scarf',
  'apparel',
  'clothing',
  'fashion',
];

const SYSTEM_PROMPT = `You are an AI that extracts clothing product data from images.
Analyze the uploaded product image and extract structured product information.
Return JSON with: title, description, price (INR), category, tags (array), and confidence (object).
- category must be one of: Menswear, Womenswear, Ethnic, Accessories, Footwear, Kids
- price must be a number (200-5000 range if unclear)
- tags should be 3-5 relevant keywords
- confidence: object with keys (title, description, price, category, tags) and values 0-1 indicating certainty.
If the image does NOT contain clothing, fashion, footwear, accessories, or textiles, return:
{"error":"not-clothing","title":"","description":"","price":0,"category":"","tags":[],"confidence":{"title":0,"description":0,"price":0,"category":0,"tags":0}}
Return ONLY valid JSON. No markdown, no explanations.`;

export function sanitizeText(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim();
}

export function isClothingProduct(product: {
  title?: string;
  category?: string;
  tags?: string[];
}): boolean {
  const text = [
    product.title || '',
    product.category || '',
    ...(product.tags || []),
  ]
    .join(' ')
    .toLowerCase();
  return CLOTHING_KEYWORDS.some(kw => text.includes(kw));
}

export function parseAIResponse(content: string): DigitizeResult {
  const cleaned = content.replace(/```json\n?|```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  if (parsed.error === 'not-clothing') {
    throw unprocessable(
      'The uploaded image does not appear to contain a clothing or fashion product.',
    );
  }

  const result: DigitizeResult = {
    title: sanitizeText(parsed.title || 'Untitled Product'),
    description: sanitizeText(
      parsed.description || 'Quality product from our store',
    ),
    price:
      typeof parsed.price === 'number' && parsed.price > 0 ? parsed.price : 499,
    category: sanitizeText(parsed.category || 'Menswear'),
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.map((t: string) => sanitizeText(t)).filter(Boolean)
      : ['clothing'],
    confidence: parsed.confidence || {
      title: 0.9,
      description: 0.85,
      price: 0.8,
      category: 0.9,
      tags: 0.85,
    },
  };

  if (!isClothingProduct(result)) {
    throw unprocessable(
      'The uploaded image does not appear to contain a clothing or fashion product.',
    );
  }

  return result;
}

export async function checkAiDailyLimit(sellerId: string) {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { aiDailyLimit: true },
  });
  const limit = seller?.aiDailyLimit ?? 25;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const usage = await prisma.aiUsage.findUnique({
    where: { sellerId_day: { sellerId, day: today } },
  });
  const count = usage?.count ?? 0;
  return {
    allowed: count < limit,
    count,
    limit,
    remaining: Math.max(0, limit - count),
  };
}

export async function incrementAiUsage(sellerId: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return prisma.aiUsage.upsert({
    where: { sellerId_day: { sellerId, day: today } },
    update: { count: { increment: 1 } },
    create: { sellerId, day: today, count: 1 },
  });
}

async function getImageBase64(
  imageUrl: string,
): Promise<{ base64Image: string; mimeType: string }> {
  if (imageUrl.startsWith('data:')) {
    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match || !match[1] || !match[2])
      throw badRequest('Invalid data URL format');
    return { mimeType: match[1], base64Image: match[2] };
  }

  const res = await fetch(imageUrl);
  if (!res.ok) throw badRequest(`Failed to download image: HTTP ${res.status}`);
  const buffer = await res.arrayBuffer();
  const base64Image = Buffer.from(buffer).toString('base64');
  const mimeType = res.headers.get('content-type') || 'image/jpeg';
  return { base64Image, mimeType };
}

async function callGemini(
  base64Image: string,
  mimeType: string,
): Promise<DigitizeResult> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT },
            { inline_data: { mime_type: mimeType, data: base64Image } },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${errText}`);
  }

  const data: any = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Gemini returned empty response');
  return parseAIResponse(rawText);
}

async function callGroq(
  base64Image: string,
  mimeType: string,
): Promise<DigitizeResult> {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const model = env.GROQ_MODEL || 'llama-3.2-11b-vision-preview';
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Digitize this product image into JSON.' },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error: ${res.status} - ${errText}`);
  }

  const data: any = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq returned empty response');
  return parseAIResponse(content);
}

export function getMockDigitizeResult(): DigitizeResult {
  return {
    title: 'Handloom Cotton Kurta',
    description:
      'Traditional breathable cotton kurta with subtle embroidered accents.',
    price: 1299,
    category: 'Ethnic',
    tags: ['kurta', 'cotton', 'ethnic', 'handloom', 'festive'],
    confidence: {
      title: 0.95,
      description: 0.9,
      price: 0.85,
      category: 0.95,
      tags: 0.9,
    },
  };
}

export async function digitizeProductImage(
  imageUrl: string,
  sellerId: string,
): Promise<{ product: DigitizeResult; provider: string }> {
  // Check daily limit first
  const quota = await checkAiDailyLimit(sellerId);
  if (!quota.allowed) {
    throw badRequest(
      `Daily AI digitization limit reached (${quota.limit}). Please try again tomorrow.`,
    );
  }

  // If mock mode is explicitly chosen or no keys provided in non-production
  if (
    env.AI_PROVIDER === 'mock' ||
    (!env.GEMINI_API_KEY && !env.GROQ_API_KEY)
  ) {
    await incrementAiUsage(sellerId);
    return { product: getMockDigitizeResult(), provider: 'Mock' };
  }

  const { base64Image, mimeType } = await getImageBase64(imageUrl);

  let lastError: Error | null = null;

  // 1. Try Gemini first (or if AI_PROVIDER is gemini)
  if (
    env.GEMINI_API_KEY &&
    (env.AI_PROVIDER === 'gemini' || env.AI_PROVIDER === 'auto')
  ) {
    try {
      const product = await callGemini(base64Image, mimeType);
      await incrementAiUsage(sellerId);
      return { product, provider: 'Gemini 2.5 Flash' };
    } catch (err: any) {
      console.warn('Gemini digitize attempt failed:', err?.message);
      lastError = err;
    }
  }

  // 2. Fallback to Groq
  if (
    env.GROQ_API_KEY &&
    (env.AI_PROVIDER === 'groq' || env.AI_PROVIDER === 'auto')
  ) {
    try {
      const product = await callGroq(base64Image, mimeType);
      await incrementAiUsage(sellerId);
      return { product, provider: 'Groq Vision' };
    } catch (err: any) {
      console.warn('Groq digitize attempt failed:', err?.message);
      lastError = err;
    }
  }

  // If providers failed in development/test, fallback gracefully
  if (env.NODE_ENV !== 'production') {
    await incrementAiUsage(sellerId);
    return { product: getMockDigitizeResult(), provider: 'Mock (Fallback)' };
  }

  throw (
    lastError ||
    new Error('All AI providers exhausted. Unable to digitize image.')
  );
}
