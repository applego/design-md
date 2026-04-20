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

  // Known brand → category/mood mapping (overrides heuristics)
  const BRAND_META = {
    airbnb: { cat: ['ecommerce', 'travel'], mood: ['warm', 'friendly'] },
    apple: { cat: ['consumer', 'tech'], mood: ['minimal', 'premium'] },
    bmw: { cat: ['automotive'], mood: ['premium', 'dark'] },
    cal: { cat: ['saas', 'productivity'], mood: ['minimal', 'monochrome'] },
    claude: { cat: ['ai', 'devtool'], mood: ['minimal', 'warm'] },
    clickhouse: { cat: ['devtool', 'database'], mood: ['bold', 'dark'] },
    coinbase: { cat: ['finance', 'crypto'], mood: ['corporate', 'minimal'] },
    cursor: { cat: ['devtool', 'ai'], mood: ['dark', 'minimal'] },
    expo: { cat: ['devtool', 'mobile'], mood: ['minimal'] },
    ferrari: { cat: ['automotive'], mood: ['premium', 'bold'] },
    figma: { cat: ['creative', 'devtool'], mood: ['minimal', 'monochrome'] },
    freee: { cat: ['saas', 'finance'], mood: ['corporate', 'warm'] },
    ibm: { cat: ['enterprise', 'tech'], mood: ['corporate'] },
    kraken: { cat: ['finance', 'crypto'], mood: ['dark', 'bold'] },
    lamborghini: { cat: ['automotive'], mood: ['premium', 'dark'] },
    line: { cat: ['consumer', 'messaging'], mood: ['friendly', 'bold'] },
    'linear.app': { cat: ['saas', 'devtool'], mood: ['minimal', 'dark'] },
    mercari: { cat: ['ecommerce', 'consumer'], mood: ['bold', 'friendly'] },
    moneyforward: { cat: ['saas', 'finance'], mood: ['corporate'] },
    muji: { cat: ['ecommerce', 'retail'], mood: ['minimal', 'natural'] },
    note: { cat: ['media', 'editorial'], mood: ['warm', 'minimal'] },
    notion: { cat: ['saas', 'productivity'], mood: ['warm', 'minimal'] },
    nvidia: { cat: ['tech', 'ai'], mood: ['dark', 'bold'] },
    pixiv: { cat: ['creative', 'media'], mood: ['bold'] },
    posthog: { cat: ['saas', 'devtool'], mood: ['playful', 'bold'] },
    qiita: { cat: ['media', 'devtool'], mood: ['minimal'] },
    rakuten: { cat: ['ecommerce'], mood: ['bold', 'corporate'] },
    renault: { cat: ['automotive'], mood: ['corporate'] },
    sentry: { cat: ['devtool', 'saas'], mood: ['dark', 'bold'] },
    smarthr: { cat: ['saas', 'hr'], mood: ['warm', 'corporate'] },
    spotify: { cat: ['consumer', 'media'], mood: ['dark', 'bold'] },
    stripe: { cat: ['saas', 'finance'], mood: ['minimal', 'premium'] },
    studio: { cat: ['creative', 'devtool'], mood: ['minimal'] },
    supabase: { cat: ['devtool', 'database'], mood: ['dark', 'minimal'] },
    tabelog: { cat: ['consumer', 'food'], mood: ['warm'] },
    tesla: { cat: ['automotive', 'tech'], mood: ['minimal', 'dark'] },
    toyota: { cat: ['automotive'], mood: ['corporate'] },
    uber: { cat: ['consumer', 'transport'], mood: ['bold', 'dark'] },
    vercel: { cat: ['devtool', 'saas'], mood: ['minimal', 'monochrome'] },
    zapier: { cat: ['saas', 'automation'], mood: ['warm', 'friendly'] },
    // JP brands
    abema: { cat: ['media', 'entertainment'], mood: ['dark', 'bold'] },
    connpass: { cat: ['media', 'community'], mood: ['warm'] },
    cookpad: { cat: ['consumer', 'food'], mood: ['warm', 'friendly'] },
    cybozu: { cat: ['saas', 'enterprise'], mood: ['corporate'] },
    droga5: { cat: ['creative', 'agency'], mood: ['bold'] },
    novasell: { cat: ['saas', 'ad-tech'], mood: ['bold', 'dark'] },
    sansan: { cat: ['saas', 'enterprise'], mood: ['corporate', 'minimal'] },
    wired: { cat: ['media', 'editorial'], mood: ['bold', 'dark'] },
    zenn: { cat: ['media', 'devtool'], mood: ['minimal', 'friendly'] },
  };

  const known = BRAND_META[brand];
  if (known) {
    meta.category = known.cat;
    meta.mood = known.mood;
  } else {
    // Fallback heuristics (narrower patterns to avoid false positives)
    const text = content.toLowerCase();
    if (/\bdashboard\b|saas platform/i.test(text)) meta.category.push('saas');
    if (/\bfinancial\b|payment|billing|会計/i.test(text)) meta.category.push('finance');
    if (/\be-?commerce\b|shopping|marketplace/i.test(text)) meta.category.push('ecommerce');
    if (/\beditorial\b|magazine|blog platform/i.test(text)) meta.category.push('media');
    if (/\bdeveloper tool\b|IDE|CLI|SDK/i.test(text)) meta.category.push('devtool');
    if (meta.category.length === 0) meta.category.push('general');

    // Mood from visual theme section only (Section 1)
    const sec1 = content.match(/## 1\..*?(?=## 2\.)/s)?.[0] || '';
    const s1 = sec1.toLowerCase();
    if (/minimal|clean|subtle/i.test(s1)) meta.mood.push('minimal');
    if (/warm|friendly|approachable/i.test(s1)) meta.mood.push('warm');
    if (/bold|vibrant|energetic/i.test(s1)) meta.mood.push('bold');
    if (/corporate|professional|trust/i.test(s1)) meta.mood.push('corporate');
    if (/dark|immersive|cinema/i.test(s1)) meta.mood.push('dark');
    if (/playful|fun|creative/i.test(s1)) meta.mood.push('playful');
    if (meta.mood.length === 0) meta.mood.push('neutral');
  }

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
