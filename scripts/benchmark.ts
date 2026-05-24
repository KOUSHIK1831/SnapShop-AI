import { readFileSync, existsSync, writeFileSync, readdirSync } from 'fs';
import { resolve, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, '../.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

interface BenchmarkResult {
  fileName: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  compressionRatio: number;
  compressionTimeMs: number;
  aiLatencyMs?: number;
  fullPipelineMs?: number;
}

function measureCompression(imagePath: string): BenchmarkResult {
  const buffer = readFileSync(imagePath);
  const originalSizeKB = buffer.length / 1024;
  const start = performance.now();

  // Simulate compression measurement
  const base64 = buffer.toString('base64');
  const compressedSizeKB = (base64.length * 0.75) / 1024; // Approximation
  const compressionTimeMs = Math.round(performance.now() - start);

  return {
    fileName: imagePath.split('/').pop() || '',
    originalSizeKB: Math.round(originalSizeKB * 100) / 100,
    compressedSizeKB: Math.round(compressedSizeKB * 100) / 100,
    compressionRatio:
      originalSizeKB > 0
        ? Math.round((1 - compressedSizeKB / originalSizeKB) * 10000) / 100
        : 0,
    compressionTimeMs,
  };
}

async function measureAILatency(imageUrl: string): Promise<number> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !anonKey) return 0;

  const start = performance.now();
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/digitize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        imageUrl,
        sellerId: '00000000-0000-4000-8000-000000000000',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await res.json();
    return Math.round(performance.now() - start);
  } catch (err) {
    console.error(`  [Latency Error] ${err}`);
    return 0;
  }
}

async function main() {
  const groundTruthPath = resolve(__dirname, '../ai-eval/ground-truth.json');
  if (!existsSync(groundTruthPath)) {
    console.error('ground-truth.json not found.');
    return;
  }

  const testCases = JSON.parse(readFileSync(groundTruthPath, 'utf-8'));
  const imagesDir = resolve(__dirname, '../ai-eval/images');

  console.log(`\n Performance Benchmark`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const results: BenchmarkResult[] = await Promise.all(
    testCases.map(async (test: any) => {
      const localPath = resolve(
        __dirname,
        '..',
        'ai-eval/images',
        test.image.split('/').pop() || '',
      );
      let result: BenchmarkResult;

      if (existsSync(localPath)) {
        result = measureCompression(localPath);
      } else {
        result = {
          fileName: test.id,
          originalSizeKB: 0,
          compressedSizeKB: 0,
          compressionRatio: 0,
          compressionTimeMs: 0,
        };
      }

      console.log(
        `Testing ${test.id} (${test.image.split('?')[0].split('/').pop()})...`,
      );
      const aiLatency = await measureAILatency(test.image);
      result.aiLatencyMs = aiLatency;
      result.fullPipelineMs = result.compressionTimeMs + aiLatency;

      console.log(
        `  Comp: ${result.compressionTimeMs}ms | AI Latency: ${aiLatency}ms | Full: ${result.fullPipelineMs}ms`,
      );
      return result;
    }),
  );

  const validAIResults = results.filter(r => (r.aiLatencyMs || 0) > 0);
  const avgAILatency =
    validAIResults.reduce((s, r) => s + (r.aiLatencyMs || 0), 0) /
    (validAIResults.length || 1);
  const latencies = validAIResults
    .map(r => r.aiLatencyMs || 0)
    .sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  console.log(`\nLatency Summary:`);
  console.log(`  P50: ${p50}ms`);
  console.log(`  P95: ${p95}ms`);
  console.log(`  P99: ${p99}ms`);
  console.log(`  Avg: ${Math.round(avgAILatency)}ms`);

  writeFileSync(
    resolve(__dirname, '../ai-eval/benchmark-results.json'),
    JSON.stringify(
      {
        results,
        summary: {
          p50,
          p95,
          p99,
          avgAILatency,
          count: results.length,
        },
      },
      null,
      2,
    ),
  );
  console.log(`\nSaved: ai-eval/benchmark-results.json`);
}

main().catch(console.error);
