import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const apiBaseUrl = (
  process.env.AI_EVAL_API_URL || 'http://localhost:4000/api/v1'
).replace(/\/+$/, '');

interface DigitizedProduct {
  title: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
}

export async function getEvaluationToken(): Promise<string> {
  const email = process.env.AI_EVAL_EMAIL;
  const password = process.env.AI_EVAL_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Set AI_EVAL_EMAIL and AI_EVAL_PASSWORD for a seller account.',
    );
  }

  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const result = await response.json();
  if (!response.ok || typeof result.accessToken !== 'string') {
    throw new Error(
      result.detail || 'Could not sign in to the evaluation API.',
    );
  }
  return result.accessToken;
}

export async function digitizeImage(
  imagePath: string,
  accessToken: string,
): Promise<DigitizedProduct> {
  const image = await readFile(imagePath);
  const mimeType =
    extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
  const imageUrl = `data:${mimeType};base64,${image.toString('base64')}`;

  const response = await fetch(`${apiBaseUrl}/ai/digitize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ imageUrl }),
  });
  const result = await response.json();
  if (!response.ok || !result.product) {
    throw new Error(result.detail || 'Image digitization failed.');
  }
  return result.product as DigitizedProduct;
}
