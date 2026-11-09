import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { supabase } from '../src/integrations/supabase/client';

interface GroundTruthItem {
  id: string;
  image: string;
  expected: {
    title: string;
    category: string;
    priceRange: { min: number; max: number };
    tags: string[];
  };
}

interface EvalItem {
  id: string;
  image: string;
  expected: GroundTruthItem['expected'];
  actual: any;
  scores: {
    categoryMatch: boolean;
    titleSimilarity: number;
    priceInRange: boolean;
    tagJaccard: number;
  };
}

interface EvalResults {
  timestamp: string;
  summary: {
    total: number;
    processed: number;
    success: number;
    accuracy: {
      category: number;
      price: number;
      titleSimilarity: number;
      tagJaccard: number;
    };
  };
  items: EvalItem[];
}

function stringSimilarity(s1: string, s2: string): number {
  const n1 = s1.toLowerCase().trim();
  const n2 = s2.toLowerCase().trim();
  if (n1 === n2) return 1;
  if (n1.includes(n2) || n2.includes(n1)) return 0.8;
  return 0; // Simple for now
}

function jaccardSimilarity(a1: string[], a2: string[]): number {
  const s1 = new Set(a1.map(s => s.toLowerCase().trim()));
  const s2 = new Set(a2.map(s => s.toLowerCase().trim()));
  const intersection = new Set([...s1].filter(x => s2.has(x)));
  const union = new Set([...s1, ...s2]);
  return intersection.size / union.size;
}

async function callDigitize(imagePath: string) {
  try {
    const { data, error } = await supabase.functions.invoke('digitize', {
      body: {
        imageUrl: `https://raw.githubusercontent.com/stackblitz/stackblitz-apnabazar/main/ai-eval/images/${imagePath}`,
      },
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`Error digitizing ${imagePath}:`, err);
    return null;
  }
}

async function main() {
  const groundTruthPath = join(process.cwd(), 'ai-eval', 'ground-truth.json');
  const outputPath = join(process.cwd(), 'ai-eval', 'results.json');

  if (!existsSync(groundTruthPath)) {
    console.error('Ground truth file not found!');
    process.exit(1);
  }

  const groundTruth: GroundTruthItem[] = JSON.parse(
    readFileSync(groundTruthPath, 'utf-8'),
  );

  console.log(`\n AI Accuracy Evaluation`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`Loaded ${groundTruth.length} test cases\n`);

  console.log(`Processing ${groundTruth.length} items concurrently...\n`);

  const results = await Promise.all(
    groundTruth.map(async item => {
      const actual = await callDigitize(item.image);
      return { item, actual };
    }),
  );

  const items: EvalItem[] = [];
  let categoryCorrect = 0;
  let priceInRangeCount = 0;
  let titleSimilaritySum = 0;
  let tagJaccardSum = 0;
  let processedCount = 0;

  for (const { item, actual } of results) {
    processedCount++;
    console.log(
      `[${item.id}] ${item.image} - ${actual ? 'Success' : 'Failed'}`,
    );

    if (actual) {
      const categoryMatch =
        actual.category.toLowerCase() === item.expected.category.toLowerCase();
      const titleSim = stringSimilarity(actual.title, item.expected.title);
      const priceInRange =
        actual.price >= item.expected.priceRange.min &&
        actual.price <= item.expected.priceRange.max;
      const tagJaccard = jaccardSimilarity(actual.tags, item.expected.tags);

      items.push({
        id: item.id,
        image: item.image,
        expected: item.expected,
        actual,
        scores: {
          categoryMatch,
          titleSimilarity: Math.round(titleSim * 100) / 100,
          priceInRange,
          tagJaccard: Math.round(tagJaccard * 100) / 100,
        },
      });

      if (categoryMatch) categoryCorrect++;
      if (priceInRange) priceInRangeCount++;
      titleSimilaritySum += titleSim;
      tagJaccardSum += tagJaccard;

      console.log(
        `  → Category: ${categoryMatch ? '✓' : '✗'} (got: ${actual.category}, expected: ${item.expected.category})`,
      );
      console.log(
        `  → Title sim: ${(titleSim * 100).toFixed(0)}%  (got: "${actual.title}")`,
      );
      console.log(
        `  → Price: ${priceInRange ? '✓' : '✗'} ₹${actual.price} [expected ₹${item.expected.priceRange.min}-${item.expected.priceRange.max}]`,
      );
      console.log(`  → Tag Jaccard: ${(tagJaccard * 100).toFixed(0)}%`);
    } else {
      items.push({
        id: item.id,
        image: item.image,
        expected: item.expected,
        actual: null,
        scores: {
          categoryMatch: false,
          titleSimilarity: 0,
          priceInRange: false,
          tagJaccard: 0,
        },
      });
      console.log(`  → SKIPPED (no result)`);
    }
    console.log('');
  }

  const finalResults: EvalResults = {
    timestamp: new Date().toISOString(),
    summary: {
      total: groundTruth.length,
      processed: processedCount,
      success: items.filter(i => i.actual).length,
      accuracy: {
        category:
          Math.round(
            (categoryCorrect / items.filter(i => i.actual).length) * 100,
          ) || 0,
        price:
          Math.round(
            (priceInRangeCount / items.filter(i => i.actual).length) * 100,
          ) || 0,
        titleSimilarity:
          Math.round(
            (titleSimilaritySum / items.filter(i => i.actual).length) * 100,
          ) || 0,
        tagJaccard:
          Math.round(
            (tagJaccardSum / items.filter(i => i.actual).length) * 100,
          ) || 0,
      },
    },
    items,
  };

  writeFileSync(outputPath, JSON.stringify(finalResults, null, 2));
  console.log(`\nResults saved to ${outputPath}`);
  console.log(`Summary:`);
  console.log(
    `- Category Accuracy: ${finalResults.summary.accuracy.category}%`,
  );
  console.log(`- Price Accuracy: ${finalResults.summary.accuracy.price}%`);
  console.log(
    `- Title Similarity: ${finalResults.summary.accuracy.titleSimilarity}%`,
  );
  console.log(`- Tag Accuracy: ${finalResults.summary.accuracy.tagJaccard}%`);
}

main().catch(console.error);
