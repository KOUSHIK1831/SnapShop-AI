import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { parseAIResponse } from './parser.ts';

// ── Zod (brought in via npm specifier for Deno) ──
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const ProductSchema = z.object({
  title: z.string().min(1, 'Title must not be empty'),
  description: z.string().optional().default(''),
  price: z.number().positive('Price must be positive'),
  category: z.string().min(1, 'Category must not be empty'),
  tags: z.array(z.string()).optional().default([]),
  confidence: z
    .object({
      title: z.number().min(0).max(1),
      description: z.number().min(0).max(1),
      price: z.number().min(0).max(1),
      category: z.number().min(0).max(1),
      tags: z.number().min(0).max(1),
    })
    .optional(),
});

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
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Prompt versioning (2E.5) ──
const PROMPT_VERSION = 'v3';

const SYSTEM_PROMPTS: Record<string, string> = {
  v1: `You digitize clothing catalogs. Extract product data as JSON from the image.
Fields: title, description, price (INR), category (Menswear/Womenswear/Ethnic/Accessories/Footwear/Kids), tags (3-5 keywords).
Return ONLY valid JSON. No explanations.`,

  v2: `You are an AI agent that digitizes clothing store catalogs.
Analyze the uploaded product image and extract structured product data.
Always return a JSON object with exactly these fields:
- title: Clear, concise product name
- description: Short, catchy product description (1-2 sentences)
- price: Numeric price in INR (estimate if not visible; use 200-5000)
- category: One of Menswear, Womenswear, Ethnic, Accessories, Footwear, Kids
- tags: Array of 3-5 relevant keywords
Return ONLY valid JSON. Do not include markdown, explanations, or code fences.`,

  v3: `You are an AI that extracts clothing product data from images.
Return JSON with: title, description, price (INR), category, tags (array), and confidence (object).
- category must be one of: Menswear, Womenswear, Ethnic, Accessories, Footwear, Kids
- price must be a number (200-5000 range if unclear)
- tags should be 3-5 relevant keywords
- confidence: object with keys (title, description, price, category, tags) and values 0-1 indicating your certainty.
If the image does NOT contain any clothing, fashion item, or textile, return: {"error":"not-clothing","title":"","description":"","price":0,"category":"","tags":[],"confidence":{"title":0,"description":0,"price":0,"category":0,"tags":0}}
Otherwise, return ONLY valid JSON. No markdown, no explanations.`,
};

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    str,
  );
}

function isSupabaseStorageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes('supabase.co') ||
      parsed.hostname.includes('supabase.in') ||
      parsed.hostname.includes('unsplash.com')
    );
  } catch {
    return false;
  }
}

function isClothingProduct(product: {
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

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // ── Rate limiting (2D.3) ──
  // Use persistent DB-level rate limiting
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  const { data: allowed, error: limitError } = await supabaseAdmin.rpc(
    'check_rate_limit',
    {
      p_key: `digitize_ip_${ip}`,
      p_max_requests: 10,
      p_window_seconds: 60,
    },
  );

  if (limitError) {
    console.error('Rate limit RPC error:', limitError);
  } else if (!allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded. Max 10 requests per minute.',
      }),
      {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  // ── Auth token verification (2D.2) ──
  const authHeader = req.headers.get('authorization') || '';
  let userId: string | null = null;
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser(token);
    userId = user?.id || null;
  }

  try {
    const { imageUrl, sellerId } = await req.json();

    // ── Validate required fields ──
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'imageUrl is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Validate sellerId is UUID (2D.5) ──
    if (!sellerId || !isValidUUID(sellerId)) {
      return new Response(
        JSON.stringify({ error: 'sellerId must be a valid UUID' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // ── Validate imageUrl is Supabase Storage URL (2D.4) ──
    if (!isSupabaseStorageUrl(imageUrl)) {
      return new Response(
        JSON.stringify({ error: 'imageUrl must be a Supabase Storage URL' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // ── AI Usage Limit Check ──
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 1. Fetch seller's daily limit
    const { data: sellerData, error: sellerError } = await supabaseAdmin
      .from('sellers')
      .select('ai_daily_limit')
      .eq('id', sellerId)
      .single();

    if (sellerError || !sellerData) {
      console.error('Error fetching seller limit:', sellerError);
      return new Response(
        JSON.stringify({ error: 'Could not verify AI limits' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const dailyLimit = sellerData.ai_daily_limit ?? 25;
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    // 2. Count usage today
    // We count rows in 'files' table for this seller created today
    const { count, error: countError } = await supabaseAdmin
      .from('files')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .gte('created_at', startOfDay.toISOString());

    if (countError) {
      console.error('Error counting AI usage:', countError);
    } else if (count !== null && count >= dailyLimit) {
      return new Response(
        JSON.stringify({
          error: 'limit-exceeded',
          message: `Daily AI digitization limit reached (${dailyLimit}). Please try again tomorrow or contact admin to increase your limit.`,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(
      `Processing digitization for seller: ${sellerId}, image: ${imageUrl}, user: ${userId} (Usage: ${count}/${dailyLimit})`,
    );

    // ── Download image and convert to base64 ──
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(
      String.fromCharCode(...new Uint8Array(imageBuffer)),
    );
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    let product = null;
    let providerUsed = '';
    let retriesUsed = 0;

    const SYSTEM_PROMPT = SYSTEM_PROMPTS[PROMPT_VERSION] || SYSTEM_PROMPTS.v3;

    // ── Helper: attempt digitization with a given API ──
    async function attemptWithProvider(
      provider: 'groq' | 'gemini',
      retryCount = 0,
    ): Promise<{ product: Record<string, unknown>; provider: string } | null> {
      if (retryCount > 2) return null;
      retriesUsed = retryCount + 1;

      if (provider === 'groq') {
        const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
        if (!GROQ_API_KEY) return null;

        const prompt =
          retryCount > 0
            ? `${SYSTEM_PROMPT}\n\nYour previous response was invalid. You MUST return ONLY valid JSON.`
            : SYSTEM_PROMPT;

        const groqResponse = await fetch(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.2-11b-vision-preview',
              messages: [
                { role: 'system', content: prompt },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: 'Analyze this image and return JSON.',
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:${mimeType};base64,${base64Image}`,
                      },
                    },
                  ],
                },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.1,
            }),
          },
        );

        if (!groqResponse.ok) {
          const errText = await groqResponse.text();
          console.warn(`Groq API error: ${groqResponse.status} - ${errText}`);
          return null;
        }

        const data = await groqResponse.json();
        const content = data.choices[0].message.content;
        return { product: parseAIResponse(content), provider: 'Groq' };
      }

      if (provider === 'gemini') {
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
        if (!GEMINI_API_KEY) return null;

        const prompt =
          retryCount > 0
            ? `${SYSTEM_PROMPT}\n\nYour previous response was invalid. You MUST return ONLY valid JSON.`
            : SYSTEM_PROMPT;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${prompt}\nAnalyze this product image and return structured product information as JSON.`,
                  },
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

        if (!geminiResponse.ok) {
          const errText = await geminiResponse.text();
          throw new Error(
            `Gemini API failed: ${geminiResponse.status} - ${errText}`,
          );
        }

        const data = await geminiResponse.json();
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw new Error('Gemini returned empty response.');
        }
        return {
          product: parseAIResponse(data.candidates[0].content.parts[0].text),
          provider: 'Gemini',
        };
      }

      return null;
    }

    // ── STRATEGY 1: Attempt Groq (Primary) ──
    console.log('Attempting digitization with Groq (Primary)...');
    let result = await attemptWithProvider('groq');

    // Auto-retry with modified prompt (2E.2 + 2E.3)
    if (!result?.product || result.product.error === 'not-clothing') {
      console.log('Groq failed or returned non-clothing, retrying once...');
      result = await attemptWithProvider('groq', 1);
    }

    // ── STRATEGY 2: Fallback to Gemini ──
    if (!result?.product || result.product.error === 'not-clothing') {
      console.log('Groq exhausted, falling back to Gemini...');
      result = await attemptWithProvider('gemini');

      if (!result?.product || result.product.error === 'not-clothing') {
        result = await attemptWithProvider('gemini', 1);
      }
    }

    if (result) {
      product = result.product;
      providerUsed = `${result.provider} (retries: ${retriesUsed})`;
    }

    if (!product) {
      throw new Error(
        'All AI providers exhausted. Unable to digitize product.',
      );
    }

    // ── Non-clothing image guard (2E.4) ──
    if (!isClothingProduct(product)) {
      return new Response(
        JSON.stringify({
          error: 'not-clothing',
          message:
            'The uploaded image does not appear to contain a clothing product.',
        }),
        {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // ── Zod schema validation (2E.1) ──
    const validProduct = ProductSchema.parse(product);

    return new Response(
      JSON.stringify({ product: validProduct, provider: providerUsed }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Digitization Function Error:', error);
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: 'validation-error',
          details: error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
        }),
        {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred during digitization';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
