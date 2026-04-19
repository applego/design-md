#!/usr/bin/env node
/**
 * design-md CLI
 * Search, preview, apply, compare DESIGN.md files. Manage fonts.
 */
import { readFile, writeFile, cp, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const CATALOG_DIR = join(ROOT, 'design-md');
const FONTS_DIR = join(ROOT, 'fonts');

// ---- Helpers ----

async function loadCatalog() {
  const catalogPath = join(CATALOG_DIR, 'catalog.json');
  if (!existsSync(catalogPath)) {
    console.error('Catalog not built. Run: npm run build:catalog');
    process.exit(1);
  }
  return JSON.parse(await readFile(catalogPath, 'utf-8'));
}

async function loadMeta(brand) {
  const metaPath = join(CATALOG_DIR, brand, 'meta.json');
  if (!existsSync(metaPath)) return null;
  return JSON.parse(await readFile(metaPath, 'utf-8'));
}

function matchesQuery(meta, terms) {
  const haystack = [
    meta.name,
    ...meta.category,
    ...meta.mood,
    meta.primaryColor || '',
    meta.fonts.sans || '',
    meta.hasJpTypo ? 'japanese jp' : '',
  ].join(' ').toLowerCase();

  return terms.every(t => haystack.includes(t.toLowerCase()));
}

// ---- Commands ----

async function cmdSearch(query) {
  const { brands } = await loadCatalog();
  const terms = query.split(/\s+/);
  const matches = brands.filter(b => matchesQuery(b, terms));

  if (matches.length === 0) {
    console.log(`No matches for "${query}"`);
    return;
  }

  console.log(`Found ${matches.length} match(es):\n`);
  for (const m of matches) {
    const color = m.primaryColor || '?';
    const font = m.fonts.sans || 'system';
    const jp = m.hasJpTypo ? ' [JP]' : '';
    const cats = m.category.join(', ');
    console.log(`  ${m.name.padEnd(20)} ${color.padEnd(10)} ${font.padEnd(20)} ${cats}${jp}`);
  }
}

async function cmdPreview(brand) {
  const previewPath = join(CATALOG_DIR, brand, 'preview.html');
  if (!existsSync(previewPath)) {
    console.error(`No preview found for "${brand}". Available:`);
    const { brands } = await loadCatalog();
    brands.filter(b => existsSync(join(CATALOG_DIR, b.name, 'preview.html')))
      .forEach(b => console.log(`  ${b.name}`));
    return;
  }

  const open = (await import('open')).default;
  console.log(`Opening preview for ${brand}...`);
  await open(previewPath);
}

async function cmdCompare(brandA, brandB) {
  const metaA = await loadMeta(brandA);
  const metaB = await loadMeta(brandB);

  if (!metaA || !metaB) {
    console.error(`Brand not found: ${!metaA ? brandA : brandB}`);
    return;
  }

  console.log(`\nComparing: ${brandA} vs ${brandB}\n`);
  console.log(`${''.padEnd(20)} ${brandA.padEnd(20)} ${brandB}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`${'Primary'.padEnd(20)} ${(metaA.primaryColor||'?').padEnd(20)} ${metaB.primaryColor||'?'}`);
  console.log(`${'Font'.padEnd(20)} ${(metaA.fonts.sans||'system').padEnd(20)} ${metaB.fonts.sans||'system'}`);
  console.log(`${'Category'.padEnd(20)} ${metaA.category.join(',').padEnd(20)} ${metaB.category.join(',')}`);
  console.log(`${'Mood'.padEnd(20)} ${metaA.mood.join(',').padEnd(20)} ${metaB.mood.join(',')}`);
  console.log(`${'JP Typo'.padEnd(20)} ${String(metaA.hasJpTypo).padEnd(20)} ${metaB.hasJpTypo}`);
  console.log(`${'Dark Mode'.padEnd(20)} ${String(metaA.hasDarkMode).padEnd(20)} ${metaB.hasDarkMode}`);
}

async function cmdApply(brand, targetDir = '.') {
  const designMd = join(CATALOG_DIR, brand, 'DESIGN.md');
  if (!existsSync(designMd)) {
    console.error(`DESIGN.md not found for "${brand}"`);
    return;
  }

  const target = join(targetDir, 'DESIGN.md');
  await cp(designMd, target);
  console.log(`Applied ${brand}/DESIGN.md -> ${target}`);

  // Also copy preview if exists
  const preview = join(CATALOG_DIR, brand, 'preview.html');
  if (existsSync(preview)) {
    await cp(preview, join(targetDir, 'design-preview.html'));
    console.log(`Applied ${brand}/preview.html -> ${join(targetDir, 'design-preview.html')}`);
  }
}

async function cmdFontsList() {
  const stacksDir = join(FONTS_DIR, 'stacks');
  if (!existsSync(stacksDir)) {
    console.log('No font stacks yet. Run: npm run build:fonts');
    return;
  }
  const { readdir } = await import('node:fs/promises');
  const files = await readdir(join(FONTS_DIR, 'catalog/sans'));
  console.log('Available sans fonts:');
  for (const f of files) {
    const data = JSON.parse(await readFile(join(FONTS_DIR, 'catalog/sans', f), 'utf-8'));
    console.log(`  ${data.name.padEnd(25)} ${data.license.padEnd(10)} ${data.weights.join(', ')}`);
  }
}

async function cmdFontsStack(fontName) {
  const stacksDir = join(FONTS_DIR, 'stacks');
  const stackFile = join(stacksDir, 'japanese-sans.json');
  if (existsSync(stackFile)) {
    const stacks = JSON.parse(await readFile(stackFile, 'utf-8'));
    const match = stacks.find(s =>
      s.primary.toLowerCase().includes(fontName.toLowerCase())
    );
    if (match) {
      console.log(`Font stack for ${match.primary}:\n`);
      console.log(`  ${match.stack}`);
      return;
    }
  }
  // Fallback: generate basic stack
  console.log(`Font stack for ${fontName}:\n`);
  console.log(`  "${fontName}", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif`);
}

async function cmdFontsPair(fontName) {
  const pairingsDir = join(FONTS_DIR, 'pairings');
  if (!existsSync(pairingsDir)) {
    console.log('Pairings catalog not built yet.');
    return;
  }
  const { readdir } = await import('node:fs/promises');
  const files = await readdir(pairingsDir);
  const matches = [];
  for (const f of files) {
    if (f.toLowerCase().includes(fontName.toLowerCase().replace(/\s+/g, '-'))) {
      const data = JSON.parse(await readFile(join(pairingsDir, f), 'utf-8'));
      matches.push(data);
    }
  }
  if (matches.length === 0) {
    console.log(`No pre-defined pairings for "${fontName}". Try:`);
    console.log(`  ${fontName} + Inter (clean, modern)`);
    console.log(`  ${fontName} + JetBrains Mono (code/metrics)`);
    return;
  }
  console.log(`Pairings for ${fontName}:\n`);
  for (const p of matches) {
    console.log(`  ${p.western} + ${p.japanese} — ${p.description}`);
  }
}

async function cmdList() {
  const { brands } = await loadCatalog();
  console.log(`${brands.length} brands available:\n`);
  for (const b of brands) {
    const jp = b.hasJpTypo ? ' [JP]' : '';
    console.log(`  ${b.name.padEnd(20)} ${(b.primaryColor||'').padEnd(10)} ${b.category.join(', ')}${jp}`);
  }
}

// ---- Main ----

const args = process.argv.slice(2);
const cmd = args[0];

switch (cmd) {
  case 'search':   await cmdSearch(args.slice(1).join(' ')); break;
  case 'preview':  await cmdPreview(args[1]); break;
  case 'compare':  await cmdCompare(args[1], args[2]); break;
  case 'apply':    await cmdApply(args[1], args[2]); break;
  case 'list':     await cmdList(); break;
  case 'fonts':
    switch (args[1]) {
      case 'list':  await cmdFontsList(); break;
      case 'stack': await cmdFontsStack(args.slice(2).join(' ')); break;
      case 'pair':  await cmdFontsPair(args.slice(2).join(' ')); break;
      default: console.log('Usage: design-md fonts [list|stack|pair] <font-name>');
    }
    break;
  default:
    console.log(`
design-md — DESIGN.md collection, CLI, font manager

Commands:
  list                          List all brands
  search <query>                Search by mood, color, category
  preview <brand>               Open preview in browser
  compare <brandA> <brandB>     Compare two brands side-by-side
  apply <brand> [target-dir]    Copy DESIGN.md to your project
  fonts list                    List available fonts
  fonts stack <font-name>       Generate fallback stack
  fonts pair <font-name>        Show pairing recommendations

Examples:
  design-md search "warm finance japanese"
  design-md preview stripe
  design-md apply notion ./my-project
  design-md fonts stack "Noto Sans JP"
`);
}
