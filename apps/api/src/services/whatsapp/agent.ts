import { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { randomToken } from '../../lib/tokens';
import { emitToSeller } from '../../realtime';

export interface WhatsAppMessage {
  role: 'user' | 'model' | 'function';
  parts: any[];
}

export const WHATSAPP_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'get_products',
        description:
          'Fetch the product catalog for this store. Call this when customer asks about products, catalog, items, or prices.',
        parameters: {
          type: 'OBJECT',
          properties: {
            store_slug: { type: 'STRING', description: 'The store URL slug' },
          },
          required: ['store_slug'],
        },
      },
      {
        name: 'place_order',
        description:
          'Place a confirmed order. Only call this after confirming product name, quantity, and buyer name.',
        parameters: {
          type: 'OBJECT',
          properties: {
            store_slug: { type: 'STRING', description: 'The store slug' },
            product_id: {
              type: 'STRING',
              description: 'The product UUID from get_products',
            },
            buyer_name: { type: 'STRING', description: 'Name of the customer' },
            quantity: { type: 'NUMBER', description: 'Quantity to order' },
          },
          required: ['store_slug', 'product_id', 'buyer_name'],
        },
      },
      {
        name: 'get_datetime',
        description:
          'Get current date and time for delivery scheduling in IST.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'generate_upi_payment',
        description: 'Generate a UPI payment deep link after order is placed.',
        parameters: {
          type: 'OBJECT',
          properties: {
            amount: { type: 'NUMBER', description: 'Total amount in INR' },
            note: { type: 'STRING', description: 'Short note like Order #123' },
          },
          required: ['amount', 'note'],
        },
      },
    ],
  },
];

export async function getConversation(
  phone: string,
  storeSlug: string,
): Promise<WhatsAppMessage[]> {
  const conv = await prisma.conversation.findUnique({
    where: { phone_storeSlug: { phone, storeSlug } },
  });
  if (!conv || !Array.isArray(conv.messages)) return [];
  return conv.messages as unknown as WhatsAppMessage[];
}

export async function saveConversation(
  phone: string,
  storeSlug: string,
  messages: WhatsAppMessage[],
) {
  const trimmed = messages.slice(-30);
  await prisma.conversation.upsert({
    where: { phone_storeSlug: { phone, storeSlug } },
    update: { messages: trimmed as any },
    create: { phone, storeSlug, messages: trimmed as any },
  });
}

export async function getProductsForStore(storeSlug: string) {
  const seller = await prisma.seller.findUnique({
    where: { storeSlug },
    include: {
      products: {
        where: { stock: { gt: 0 } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });
  if (!seller) return [];
  return seller.products.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    price: p.price,
    category: p.category,
    stock: p.stock,
  }));
}

export async function placeWhatsAppOrder(
  buyerPhone: string,
  storeSlug: string,
  productId: string,
  buyerName: string,
  quantity: number = 1,
) {
  const seller = await prisma.seller.findUnique({
    where: { storeSlug },
  });
  if (!seller) return { success: false, error: 'Store not found' };

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });
  if (!product) return { success: false, error: 'Product not found' };

  const unitPrice = Number(product.price);
  const totalAmount = unitPrice * quantity;
  const orderNumber = `WA-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
  const trackingToken = randomToken(18);

  const order = await prisma.order.create({
    data: {
      sellerId: seller.id,
      buyerPhone,
      buyerName,
      orderNumber,
      trackingToken,
      subtotal: new Prisma.Decimal(totalAmount),
      total: new Prisma.Decimal(totalAmount),
      status: 'pending',
      payMethod: 'upi',
      payStatus: 'pending',
      items: {
        create: {
          productId: product.id,
          titleSnapshot: product.title,
          priceSnapshot: product.price,
          quantity,
          lineTotal: new Prisma.Decimal(totalAmount),
        },
      },
    },
  });

  emitToSeller(seller.id, 'order:new', {
    order_id: order.id,
    order_number: order.orderNumber,
    buyer_name: buyerName,
  });

  return { success: true, order_id: order.id, total_amount: totalAmount };
}

export function buildSystemInstruction(
  storeName: string,
  storeSlug: string,
): string {
  return `You are a friendly AI sales assistant for "${storeName}" on WhatsApp.
Your responsibilities:
- Greet customers warmly.
- When customers ask about items/catalog, call the get_products tool with store_slug "${storeSlug}". Never invent products.
- Confirm product, quantity, buyer name, and delivery preference.
- Show clear order summary (item, qty, price, customer name).
- When customer says YES to confirm, call the place_order tool.
- Upon successful order, call generate_upi_payment tool to provide UPI payment link.
- Keep messages short (3-4 lines max).
- Detect the customer's language (Hindi, English, Telugu, etc.) and reply in that language.`;
}

export async function processToolCall(
  name: string,
  args: any,
  phone: string,
  storeSlug: string,
  sellerUpiId?: string,
): Promise<any> {
  switch (name) {
    case 'get_products': {
      const slug = args.store_slug || storeSlug;
      const products = await getProductsForStore(slug);
      return products.length
        ? products
        : { message: 'No items currently available.' };
    }
    case 'place_order': {
      const res = await placeWhatsAppOrder(
        phone,
        args.store_slug || storeSlug,
        args.product_id,
        args.buyer_name,
        args.quantity || 1,
      );
      return res;
    }
    case 'get_datetime': {
      return {
        datetime: new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'full',
          timeStyle: 'short',
        }),
      };
    }
    case 'generate_upi_payment': {
      const upiId = sellerUpiId || 'snapshop@upi';
      const amount = args.amount;
      const note = encodeURIComponent(args.note || 'SnapShop Order');
      return {
        payment_url: `upi://pay?pa=${upiId}&am=${amount}&tn=${note}&cu=INR`,
      };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function runWhatsAppAgent(
  phone: string,
  userMessage: string,
  storeSlug: string,
): Promise<string> {
  const seller = await prisma.seller.findUnique({
    where: { storeSlug },
  });
  const storeName = seller?.storeName || 'Our Store';
  const sellerUpiId = (seller as any)?.sellerUpiId || 'snapshop@upi';

  const history = await getConversation(phone, storeSlug);
  history.push({ role: 'user', parts: [{ text: userMessage }] });

  // If no Gemini key or in test mode, return a helpful friendly response
  if (!env.GEMINI_API_KEY) {
    const products = await getProductsForStore(storeSlug);
    let reply = `Namaste! Welcome to *${storeName}*. 🙏\n`;
    if (products.length && products[0]) {
      reply += `We have ${products.length} products available today including *${products[0].title}* (₹${products[0].price}). How can I help you today?`;
    } else {
      reply += `How can I help you today?`;
    }
    history.push({ role: 'model', parts: [{ text: reply }] });
    await saveConversation(phone, storeSlug, history);
    return reply;
  }

  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  const systemInstruction = buildSystemInstruction(storeName, storeSlug);

  const contents = history.map(m => ({
    role: m.role === 'function' ? 'function' : m.role,
    parts: m.parts,
  }));

  // Agent loop (max 5 turns)
  for (let turn = 0; turn < 5; turn++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        tools: WHATSAPP_TOOLS,
        generationConfig: { temperature: 0.2 },
      }),
    });

    if (!res.ok) {
      console.error('Gemini WhatsApp Agent error:', await res.text());
      return `Welcome to ${storeName}! How can we help you today?`;
    }

    const data: any = await res.json();
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    // Check for function calls
    const funcCallPart = parts.find((p: any) => p.functionCall);
    if (funcCallPart) {
      const { name, args } = funcCallPart.functionCall;
      const toolResult = await processToolCall(
        name,
        args,
        phone,
        storeSlug,
        sellerUpiId,
      );

      contents.push({ role: 'model', parts: [funcCallPart] });
      contents.push({
        role: 'function',
        parts: [
          {
            functionResponse: {
              name,
              response: { content: toolResult },
            },
          },
        ],
      });
      continue;
    }

    // Normal text reply
    const textPart = parts.find((p: any) => p.text);
    const reply = textPart?.text || `Thank you for contacting ${storeName}!`;

    history.push({ role: 'model', parts: [{ text: reply }] });
    await saveConversation(phone, storeSlug, history);
    return reply;
  }

  return `Thank you for reaching out to ${storeName}! We will get back to you shortly.`;
}

export async function sendWhatsAppTextMessage(to: string, text: string) {
  const token = env.WHATSAPP_APP_SECRET || process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log(`[WhatsApp Simulated Send] to: ${to}, message: "${text}"`);
    return { simulated: true };
  }

  const res = await fetch(
    `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    },
  );

  return res.json();
}
