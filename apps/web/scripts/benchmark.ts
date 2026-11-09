import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digitizeImage, getEvaluationToken } from './api-eval-client';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

async function measureAILatency(
  imagePath: string,
  accessToken: string,
): Promise<number> {
  const start = performance.now();
  try {
    await digitizeImage(imagePath, accessToken);
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
  const accessToken = await getEvaluationToken();

  console.log(`\n Performance Benchmark`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const results: BenchmarkResult[] = await Promise.all(
    testCases.map(async (test: any) => {
      const localPath = resolve(__dirname, '..', 'ai-eval', test.image);
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
      const aiLatency = await measureAILatency(localPath, accessToken);
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
