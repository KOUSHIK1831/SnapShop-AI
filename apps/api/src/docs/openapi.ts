export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'SnapShop AI API',
    version: '1.0.0',
    description:
      'Complete Full-Stack REST API for SnapShop AI. Supports Google OAuth 2.0, multi-tenant merchant storefronts, product catalog, cart, orders, presigned storage uploads, Gemini 2.5 AI product digitization, and WhatsApp AI sales agent.',
  },
  servers: [{ url: '/api/v1', description: 'API v1 root' }],
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register a new user account with role selection',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  role: {
                    type: 'string',
                    enum: ['seller', 'buyer', 'volunteer'],
                  },
                  name: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'User registered successfully' },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authenticated with access token and session cookie',
          },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/google': {
      post: {
        summary: 'Authenticate or onboard with Google OAuth 2.0 ID Token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  credential: {
                    type: 'string',
                    description: 'Google ID Token JWT',
                  },
                  role: { type: 'string', enum: ['seller', 'buyer'] },
                },
                required: ['credential'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Google OAuth success' },
          '401': { description: 'Invalid Google token' },
        },
      },
    },
    '/sellers/me': {
      get: {
        summary: 'Get current seller profile',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Seller profile retrieved' },
          '401': { description: 'Unauthorized' },
        },
      },
      patch: {
        summary: 'Update current seller store profile',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Seller profile updated' },
        },
      },
    },
    '/products': {
      get: {
        summary: 'List products (public or seller filtered)',
        responses: {
          '200': { description: 'Product list retrieved' },
        },
      },
      post: {
        summary: 'Create a new catalog product',
        security: [{ BearerAuth: [] }],
        responses: {
          '201': { description: 'Product created' },
        },
      },
    },
    '/cart': {
      get: {
        summary: 'Get user active shopping cart',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Cart retrieved' },
        },
      },
      post: {
        summary: 'Add item to shopping cart',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Item added to cart' },
        },
      },
    },
    '/orders': {
      get: {
        summary: 'List seller or buyer orders',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Orders list' },
        },
      },
      post: {
        summary: 'Place order from cart or buy-now',
        security: [{ BearerAuth: [] }],
        responses: {
          '201': { description: 'Order created' },
        },
      },
    },
    '/ai/digitize': {
      post: {
        summary:
          'Extract clothing product data from image using Gemini 2.5 Flash / Groq',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  imageUrl: { type: 'string', format: 'uri' },
                  sellerId: { type: 'string', format: 'uuid' },
                },
                required: ['imageUrl'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Digitized clothing product JSON' },
          '429': { description: 'Daily AI limit reached' },
        },
      },
    },
    '/whatsapp/webhook': {
      get: {
        summary: 'Meta WhatsApp webhook verification challenge',
        responses: {
          '200': { description: 'Returns hub.challenge string' },
          '403': { description: 'Invalid verify token' },
        },
      },
      post: {
        summary: 'Incoming WhatsApp message webhook handler',
        responses: {
          '200': { description: 'Webhook received' },
        },
      },
    },
    '/admin/overview': {
      get: {
        summary:
          'Platform-wide administrator dashboard statistics and audit logs',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Overview statistics' },
          '403': { description: 'Admin role required' },
        },
      },
    },
    '/admin/users/{id}/block': {
      patch: {
        summary: 'Block or unblock user access',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'User block status updated' },
          '403': { description: 'Admin role required' },
        },
      },
    },
    '/admin/sellers/{id}/status': {
      patch: {
        summary: 'Update seller status (active, suspended, blocked)',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Seller status updated' },
          '403': { description: 'Admin role required' },
        },
      },
    },
    '/analytics/seller': {
      get: {
        summary: 'Retrieve seller sales metrics, revenue, and daily trends',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Analytics data' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};
