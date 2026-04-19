#!/usr/bin/env node
/**
 * build-catalog.mjs
 * Reads upstream/jp and upstream/en, generates unified design-md/ catalog with meta.json
 */
import { readdir, readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const UPSTREAM_JP = join(ROOT, 'upstream/jp/design-md');
const UPSTREAM_EN = join(ROOT, 'upstream/en/design-md');
const OUTPUT = join(ROOT, 'design-md');

// Extract basic metadata from DESIGN.md content
function extractMeta(content, source, brand) {
  const meta = {
    name: brand,
    source,
    category: [],
    mood: [],
    primaryColor: null,
    fonts: { sans: null, mono: null },
    hasJpTypo: source === 'kzhrknt/awesome-design-md-jp',
    hasDarkMode: /dark/i.test(content),
    sections: 0,
  };

  // Count sections (## headings)
  const sectionMatches = content.match(/^## \d+\./gm);
  meta.sections = sectionMatches ? sectionMatches.length : 0;

  // Extract primary color (first hex after "Primary" keyword)
  const colorMatch = content.match(/[Pp]rimary[^#]*?(#[0-9a-fA-F]{6})/);
  if (colorMatch) meta.primaryColor = colorMatch[1].toLowerCase();

  // Extract font family
  const fontMatch = content.match(/[Ff]ont[- ][Ff]amily[^`]*?`([^`]+)`/);
  if (fontMatch) meta.fonts.sans = fontMatch[1].split(',')[0].trim().replace(/['"]/g, '');

  // Mono font
  const monoMatch = content.match(/[Mm]ono[^`]*?`([^`]+)`/);
  if (monoMatch) meta.fonts.mono = monoMatch[1].split(',')[0].trim().replace(/['"]/g, '');

  // Category inference
  const text = content.toLowerCase();
  if (/saas|dashboard|管理/.test(text)) meta.category.push('saas');
  if (/financ|金融|会計|billing/.test(text)) meta.category.push('finance');
  if (/commerce|ec|shop|買/.test(text)) meta.category.push('ecommerce');
  if (/media|記事|article/.test(text)) meta.category.push('media');
  if (/creative|design|デザイン/.test(text)) meta.category.push('creative');
  if (/auto|車|car/.test(text)) meta.category.push('automotive');
  if (/dev|tool|開発/.test(text)) meta.category.push('devtool');
  if (meta.category.length === 0) meta.category.push('general');

  // Mood inference
  if (/minimal|clean|シンプル/.test(text)) meta.mood.push('minimal');
  if (/warm|温かい|cream/.test(text)) meta.mood.push('warm');
  if (/bold|vibrant|鮮やか/.test(text)) meta.mood.push('bold');
  if (/corporate|trust|信頼/.test(text)) meta.mood.push('corporate');
  if (/playful|creative|遊び/.test(text)) meta.mood.push('playful');
  if (/dark|ダーク/.test(text)) meta.mood.push('dark');
  if (meta.mood.length === 0) meta.mood.push('neutral');

  return meta;
}

async function processUpstream(upstreamDir, source) {
  if (!existsSync(upstreamDir)) {
    console.log(`  Skipping ${upstreamDir} (not found)`);
    return [];
  }

  const brands = await readdir(upstreamDir);
  const results = [];

  for (const brand of brands) {
    const brandDir = join(upstreamDir, brand);
    const designMd = join(brandDir, 'DESIGN.md');

    if (!existsSync(designMd)) continue;

    const content = await readFile(designMd, 'utf-8');
    const meta = extractMeta(content, source, brand);

    // Copy to output
    const outDir = join(OUTPUT, brand);
    await mkdir(outDir, { recursive: true });
    await cp(brandDir, outDir, { recursive: true, force: true });

    // Write meta.json
    meta.lastSynced = new Date().toISOString().split('T')[0];
    await writeFile(join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));

    results.push(meta);
  }

  return results;
}

async function main() {
  console.log('Building design-md catalog...\n');

  const jp = await processUpstream(UPSTREAM_JP, 'kzhrknt/awesome-design-md-jp');
  console.log(`  JP: ${jp.length} brands processed`);

  const en = await processUpstream(UPSTREAM_EN, 'Meliwat/awesome-design-md-pre-paywall');
  console.log(`  EN: ${en.length} brands processed`);

  // Write catalog index
  const all = [...jp, ...en].sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(
    join(OUTPUT, 'catalog.json'),
    JSON.stringify({ total: all.length, brands: all }, null, 2)
  );

  console.log(`\nTotal: ${all.length} brands in catalog.json`);
}

main().catch(console.error);
