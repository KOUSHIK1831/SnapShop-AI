// supabase/functions/whatsapp-agent/index.ts
// WhatsApp AI Sales Agent for SnapShop AI
//
// ⚠️  COMING SOON — FUTURE WORK  ⚠️
// This is an alpha-stage implementation. It is actively being worked on
// and is NOT ready for production use. Expect breaking changes, bugs,
// and incomplete features.
//
// Runs as a Supabase Edge Function (Deno runtime)
// Webhook URL: https://pupjskrkmhzesjfltncb.supabase.co/functions/v1/whatsapp-agent

import Anthropic from 'npm:@anthropic-ai/sdk@0.27.3';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ── Env ──────────────────────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN')!;
const PHONE_NUMBER_ID = Deno.env.get('PHONE_NUMBER_ID')!;
const VERIFY_TOKEN = Deno.env.get('VERIFY_TOKEN')!;
const UPI_ID = Deno.env.get('UPI_ID') || 'snapshop@upi';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Types ────────────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant';
  content: string | Anthropic.ContentBlock[];
}

// ── Supabase helpers ─────────────────────────────────────────────────────────

async function getConversation(
  phone: string,
  storeSlug: string,
): Promise<Message[]> {
  const { data } = await sb
    .from('conversations')
    .select('messages')
    .eq('phone', phone)
    .eq('store_slug', storeSlug)
    .single();
  return (data?.messages as Message[]) || [];
}

async function saveConversation(
  phone: string,
  storeSlug: string,
  messages: Message[],
) {
  // Keep last 30 messages to avoid token overflow
  const trimmed = messages.slice(-30);
  await sb
    .from('conversations')
    .upsert(
      { phone, store_slug: storeSlug, messages: trimmed },
      { onConflict: 'phone,store_slug' },
    );
}

async function getSellerBySlug(storeSlug: string) {
  const { data } = await sb
    .from('sellers')
    .select(
      'id, store_name, location, phone, contact_number, store_description',
    )
    .eq('store_slug', storeSlug)
    .single();
  return data;
}

async function getProducts(storeSlug: string) {
  const seller = await getSellerBySlug(storeSlug);
  if (!seller) return [];
  const { data } = await sb
    .from('products')
    .select('id, title, description, price, category, tags, stock')
    .eq('seller_id', seller.id)
    .gt('stock', 0)
    .order('created_at', { ascending: false });
  return data || [];
}

async function placeOrder(
  buyerPhone: string,
  storeSlug: string,
  productId: string,
  buyerName: string,
  quantity: number,
) {
  const seller = await getSellerBySlug(storeSlug);
  if (!seller) return { success: false, error: 'Store not found' };

  const { data, error } = await sb
    .from('orders')
    .insert({
      seller_id: seller.id,
      product_id: productId,
      buyer_id: null, // guest order via WhatsApp
      buyer_phone: buyerPhone,
      buyer_name: buyerName,
      quantity,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, order_id: data.id };
}

// ── Tools ────────────────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_products',
    description:
      "Fetch the product catalog for this store. Call this when the customer asks about products, menu, prices, or what's available.",
    input_schema: {
      type: 'object' as const,
      properties: {
        store_slug: { type: 'string', description: 'The store URL slug' },
      },
      required: ['store_slug'],
    },
  },
  {
    name: 'place_order',
    description:
      "Place a confirmed order. Only call this AFTER you have: product name, quantity, and buyer's name. Always show an order summary and ask for confirmation before calling this.",
    input_schema: {
      type: 'object' as const,
      properties: {
        store_slug: { type: 'string' },
        product_id: {
          type: 'string',
          description: 'The product UUID from get_products',
        },
        buyer_name: { type: 'string' },
        quantity: { type: 'number', default: 1 },
      },
      required: ['store_slug', 'product_id', 'buyer_name'],
    },
  },
  {
    name: 'get_datetime',
    description:
      'Get the current date and time. Use this for delivery scheduling.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'generate_upi_payment',
    description:
      'Generate a UPI payment deep link. Call this after the order is successfully placed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        amount: { type: 'number', description: 'Total amount in INR' },
        note: {
          type: 'string',
          description: "Short payment note e.g. 'Order #123'",
        },
      },
      required: ['amount', 'note'],
    },
  },
];

async function processTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  buyerPhone: string,
  storeSlug: string,
): Promise<string> {
  switch (toolName) {
    case 'get_products': {
      const products = await getProducts(
        (toolInput.store_slug as string) || storeSlug,
      );
      if (!products.length)
        return 'No products available in this store right now.';
      return JSON.stringify(products);
    }
    case 'place_order': {
      const result = await placeOrder(
        buyerPhone,
        (toolInput.store_slug as string) || storeSlug,
        toolInput.product_id as string,
        toolInput.buyer_name as string,
        (toolInput.quantity as number) || 1,
      );
      return JSON.stringify(result);
    }
    case 'get_datetime': {
      return new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    case 'generate_upi_payment': {
      const amount = toolInput.amount as number;
      const note = (toolInput.note as string).replace(/\s+/g, '%20');
      return `upi://pay?pa=${UPI_ID}&am=${amount}&tn=${note}&cu=INR`;
    }
    default:
      return 'Unknown tool';
  }
}

// ── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(storeName: string, storeSlug: string): string {
  return `You are a friendly AI sales agent for *${storeName}* on WhatsApp.

*Your responsibilities:*
- Greet customers warmly when they say hi/hello
- Show products when asked (always use get_products tool — never make up products)
- Guide customers through the full order flow
- Answer questions about delivery, timing, and products
- Detect the customer's language and reply in the EXACT same language (Hindi, English, Tamil, Telugu, Bengali, etc.)
- Handle price objections politely — you can offer a 5% discount if customer insists

*Order flow — follow this exact sequence:*
1. Greet → ask what they're looking for
2. Show relevant products with prices from get_products
3. Customer picks a product → confirm product + quantity
4. Ask for their name
5. Ask: delivery or pickup?
6. If delivery → ask for address
7. Ask for preferred date and time
8. Show a clear order summary (product, qty, price, name, address, date)
9. Ask: "Shall I confirm this order? Reply YES to confirm."
10. On YES → call place_order tool
11. On success → call generate_upi_payment tool → send the UPI link
12. Close with a warm thank-you message

*WhatsApp formatting rules (IMPORTANT):*
- Use *bold* for product names and prices (single asterisk)
- Use • for bullet lists
- Keep messages short and conversational — max 3-4 lines per message
- Never use markdown headers (#, ##) or triple backticks
- Emojis are welcome 🎉

*Store info:*
- Store: ${storeName}
- Slug: ${storeSlug}
- Payment: UPI — always generate link after order confirmation
- Delivery: Same day if ordered before 2 PM IST, next day otherwise
- If you don't know something, say "Let me check with the store team and get back to you!"`;
}

// ── Agentic Loop ─────────────────────────────────────────────────────────────

async function runAgent(
  phone: string,
  userMessage: string,
  storeSlug: string,
  storeName: string,
): Promise<string> {
  const history = await getConversation(phone, storeSlug);

  // Add user message
  history.push({ role: 'user', content: userMessage });

  const messages: Message[] = [...history];

  // Agentic loop — keep calling Claude until stop_reason is "end_turn"
  for (let i = 0; i < 10; i++) {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      system: buildSystemPrompt(storeName, storeSlug),
      tools: TOOLS,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })) as Anthropic.MessageParam[],
    });

    if (response.stop_reason === 'end_turn') {
      // Extract final text reply
      const reply = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n');

      // Save updated history
      history.push({ role: 'assistant', content: response.content });
      await saveConversation(phone, storeSlug, history);

      return reply || "Sorry, I couldn't process that. Please try again.";
    }

    if (response.stop_reason === 'tool_use') {
      // Add assistant's tool-use message to history
      messages.push({ role: 'assistant', content: response.content });
      history.push({ role: 'assistant', content: response.content });

      // Process all tool calls in parallel
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        response.content
          .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
          .map(async block => ({
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: await processTool(
              block.name,
              block.input as Record<string, unknown>,
              phone,
              storeSlug,
            ),
          })),
      );

      // Add tool results as user message
      const toolResultMessage: Message = { role: 'user', content: toolResults };
      messages.push(toolResultMessage);
      history.push(toolResultMessage);
      continue;
    }

    // Unexpected stop reason
    break;
  }

  return 'Sorry, something went wrong. Please try again.';
}

// ── WhatsApp API ──────────────────────────────────────────────────────────────

async function sendWhatsAppMessage(to: string, text: string) {
  await fetch(`https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
}

// ── Main Handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // ── GET: Webhook verification from Meta ──
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // ── POST: Incoming WhatsApp message ──
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0]?.value;

      // Ignore non-message events (status updates, etc.)
      if (!changes?.messages) {
        return new Response('ok', { status: 200 });
      }

      const msg = changes.messages[0];
      const phone = msg.from;

      // Ignore non-text messages
      if (msg.type !== 'text') {
        await sendWhatsAppMessage(
          phone,
          'Sorry, I can only handle text messages right now. Please type your question! 😊',
        );
        return new Response('ok', { status: 200 });
      }

      const userText = msg.text.body;

      // Determine which store this WhatsApp number belongs to
      // Look up seller by their contact_number or phone matching PHONE_NUMBER_ID
      // For now: use STORE_SLUG env var (set per-seller deployment)
      // Future: map PHONE_NUMBER_ID → store_slug in a DB table
      const storeSlug = Deno.env.get('STORE_SLUG') || '';
      const sellerData = await getSellerBySlug(storeSlug);
      const storeName = sellerData?.store_name || 'Our Store';

      if (!storeSlug || !sellerData) {
        await sendWhatsAppMessage(
          phone,
          'This store is not set up yet. Please contact the store owner.',
        );
        return new Response('ok', { status: 200 });
      }

      // Run the AI agent
      const reply = await runAgent(phone, userText, storeSlug, storeName);
      await sendWhatsAppMessage(phone, reply);
    } catch (err) {
      console.error('WhatsApp agent error:', err);
      // Always return 200 to Meta — otherwise they retry and you get duplicates
    }

    return new Response('ok', { status: 200 });
  }

  return new Response('Method not allowed', { status: 405 });
});
