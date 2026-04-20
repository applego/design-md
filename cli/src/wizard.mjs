/**
 * design-md wizard — Interactive DESIGN.md builder with live preview
 */
import { createInterface } from 'node:readline';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createPreviewServer } from './preview-server.mjs';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));
const clear = () => process.stdout.write('\x1B[2J\x1B[0f');

// Default token set
const DEFAULT_TOKENS = {
  brandName: 'Custom',
  primary: '#2563eb', primaryLight: '#e0edff',
  bg: '#ffffff', card: '#ffffff', surface: '#f5f7fa',
  text: '#1e293b', textSec: '#64748b',
  border: '#e2e8f0',
  success: '#15803d', warning: '#a16207', danger: '#b91c1c',
  radius: '8px',
  fontSans: 'Inter', fontMono: 'JetBrains Mono',
};

// Brand presets extracted from catalog
const PRESETS = {
  stripe:  { brandName:'Stripe', primary:'#0e7490', primaryLight:'#e0f4f4', bg:'#f6f9fc', card:'#ffffff', surface:'#f0f4f8', text:'#0a2540', textSec:'#5a6f83', border:'#e3e8ee', success:'#0e7490', warning:'#b45309', danger:'#dc2626', radius:'8px', fontSans:'Söhne', fontMono:'Söhne Mono' },
  linear:  { brandName:'Linear', primary:'#5e6ad2', primaryLight:'#ededff', bg:'#ffffff', card:'#ffffff', surface:'#f9f9fb', text:'#1a1a2e', textSec:'#6b6b80', border:'#e5e5ea', success:'#27a644', warning:'#e09600', danger:'#d63031', radius:'10px', fontSans:'Inter', fontMono:'Berkeley Mono' },
  notion:  { brandName:'Notion', primary:'#0075de', primaryLight:'#e8f0fc', bg:'#ffffff', card:'#ffffff', surface:'#f6f5f4', text:'#37352f', textSec:'#615d59', border:'rgba(0,0,0,0.08)', success:'#2a9d99', warning:'#dd5b00', danger:'#c42b2b', radius:'4px', fontSans:'Inter', fontMono:'JetBrains Mono' },
  vercel:  { brandName:'Vercel', primary:'#171717', primaryLight:'#f5f5f5', bg:'#ffffff', card:'#ffffff', surface:'#fafafa', text:'#171717', textSec:'#666666', border:'rgba(0,0,0,0.06)', success:'#0a8a2e', warning:'#f5a623', danger:'#ee0000', radius:'8px', fontSans:'Geist', fontMono:'Geist Mono' },
  freee:   { brandName:'freee', primary:'#2864f0', primaryLight:'#e0edff', bg:'#ffffff', card:'#ffffff', surface:'#f5f5f5', text:'#333333', textSec:'#666666', border:'#dddddd', success:'#27ae60', warning:'#f39c12', danger:'#e74c3c', radius:'6px', fontSans:'Inter', fontMono:'JetBrains Mono' },
  smarthr: { brandName:'SmartHR', primary:'#0077c7', primaryLight:'#e0f0ff', bg:'#f8f7f6', card:'#ffffff', surface:'#f0efed', text:'#23221e', textSec:'#706d65', border:'#d6d3d0', success:'#27ae60', warning:'#ffcc17', danger:'#e01e5a', radius:'8px', fontSans:'Inter', fontMono:'JetBrains Mono' },
  apple:   { brandName:'Apple', primary:'#0071e3', primaryLight:'#e8f2ff', bg:'#ffffff', card:'#ffffff', surface:'#f5f5f7', text:'#1d1d1f', textSec:'rgba(0,0,0,0.45)', border:'#d2d2d7', success:'#34c759', warning:'#ff9f0a', danger:'#ff3b30', radius:'12px', fontSans:'SF Pro', fontMono:'SF Mono' },
  muji:    { brandName:'MUJI', primary:'#7f0019', primaryLight:'#f5e8ec', bg:'#ffffff', card:'#ffffff', surface:'#f4eede', text:'#3c3c43', textSec:'#6d6d72', border:'#d8d8d9', success:'#2d8a4e', warning:'#c48500', danger:'#dd0c14', radius:'0px', fontSans:'Helvetica Neue', fontMono:'monospace' },
  calcom:  { brandName:'Cal.com', primary:'#242424', primaryLight:'#f0f0f0', bg:'#ffffff', card:'#ffffff', surface:'#fafafa', text:'#242424', textSec:'#898989', border:'rgba(34,42,53,0.06)', success:'#2a9d8f', warning:'#d97706', danger:'#dc2626', radius:'8px', fontSans:'Cal Sans', fontMono:'monospace' },
  mf:      { brandName:'MoneyForward', primary:'#4db848', primaryLight:'#e8f5e6', bg:'#ffffff', card:'#ffffff', surface:'#f5f5f5', text:'#333333', textSec:'#666666', border:'#dddddd', success:'#27ae60', warning:'#f39c12', danger:'#e74c3c', radius:'6px', fontSans:'Inter', fontMono:'JetBrains Mono' },
};

function printBanner() {
  console.log(`
\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m
  \x1b[1mDESIGN.md Wizard\x1b[0m — with Live Preview
\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m
`);
}

function printTokenSummary(tokens) {
  console.log(`
  \x1b[1mCurrent tokens:\x1b[0m
  ┌──────────────┬────────────────┐
  │ Primary      │ ${tokens.primary.padEnd(14)} │
  │ Background   │ ${tokens.bg.padEnd(14)} │
  │ Text         │ ${tokens.text.padEnd(14)} │
  │ Success      │ ${tokens.success.padEnd(14)} │
  │ Warning      │ ${tokens.warning.padEnd(14)} │
  │ Danger       │ ${tokens.danger.padEnd(14)} │
  │ Radius       │ ${tokens.radius.padEnd(14)} │
  │ Font Sans    │ ${tokens.fontSans.padEnd(14)} │
  │ Font Mono    │ ${tokens.fontMono.padEnd(14)} │
  └──────────────┴────────────────┘
`);
}

export async function runWizard(catalogDir) {
  printBanner();

  // Start live preview server
  const server = createPreviewServer(DEFAULT_TOKENS);
  const port = await server.start();
  const previewUrl = `http://localhost:${port}`;

  console.log(`  \x1b[32m● Live Preview:\x1b[0m ${previewUrl}`);
  console.log(`  変更するたびにブラウザが自動更新されます\n`);

  // Open browser
  try {
    const open = (await import('open')).default;
    await open(previewUrl);
  } catch { console.log(`  ブラウザで ${previewUrl} を開いてください\n`); }

  // Step 1: Starting point
  console.log(`  \x1b[1mStep 1: どこから始める？\x1b[0m\n`);
  console.log(`  1) 既存ブランドをベースにする（推奨）`);
  console.log(`  2) ゼロから作る`);
  const step1 = await ask('\n  選択 [1]: ');
  const fromBrand = step1 !== '2';

  let tokens = { ...DEFAULT_TOKENS };

  if (fromBrand) {
    // Step 2: Choose brand
    console.log(`\n  \x1b[1mStep 2: ベースブランドを選択\x1b[0m\n`);
    const names = Object.keys(PRESETS);
    names.forEach((n, i) => {
      const p = PRESETS[n];
      console.log(`  ${String(i + 1).padStart(2)}) ${p.brandName.padEnd(14)} ${p.primary}  ${p.fontSans}`);
    });
    console.log(`\n  ${names.length + 1}) カタログから検索`);

    const choice = await ask(`\n  番号 [1]: `);
    const idx = parseInt(choice || '1') - 1;

    if (idx >= 0 && idx < names.length) {
      tokens = { ...PRESETS[names[idx]] };
    } else {
      // Search from catalog
      const query = await ask('  検索キーワード: ');
      console.log(`  → CLI: design-md search "${query}" で検索し、preview で確認してください`);
      console.log(`  → 確認後、ベースブランド名を入力:`);
      const brandName = await ask('  ブランド名: ');
      if (PRESETS[brandName.toLowerCase()]) {
        tokens = { ...PRESETS[brandName.toLowerCase()] };
      }
    }

    server.update(tokens);
    console.log(`\n  \x1b[32m✓\x1b[0m ${tokens.brandName} をベースに設定。プレビューを確認してください。`);
    printTokenSummary(tokens);
  }

  // Step 3: Customize loop
  let customizing = true;
  while (customizing) {
    console.log(`  \x1b[1mStep 3: カスタマイズ\x1b[0m\n`);
    console.log(`  変更するトークンを選択:\n`);
    console.log(`  1) primary     — メインカラー     [${tokens.primary}]`);
    console.log(`  2) bg          — 背景色            [${tokens.bg}]`);
    console.log(`  3) text        — テキスト色        [${tokens.text}]`);
    console.log(`  4) success     — 成功色            [${tokens.success}]`);
    console.log(`  5) warning     — 警告色            [${tokens.warning}]`);
    console.log(`  6) danger      — 危険色            [${tokens.danger}]`);
    console.log(`  7) radius      — 角丸              [${tokens.radius}]`);
    console.log(`  8) fontSans    — 本文フォント      [${tokens.fontSans}]`);
    console.log(`  9) fontMono    — 数値フォント      [${tokens.fontMono}]`);
    console.log(`  0) brandName   — ブランド名        [${tokens.brandName}]`);
    console.log(`  d) done        — 確定して DESIGN.md 生成`);
    console.log(`  p) preset      — 別のプリセットに変更`);

    const action = await ask('\n  選択: ');

    if (action === 'd' || action === 'done') {
      customizing = false;
      break;
    }

    if (action === 'p' || action === 'preset') {
      const names = Object.keys(PRESETS);
      names.forEach((n, i) => console.log(`  ${i + 1}) ${PRESETS[n].brandName}`));
      const pi = parseInt(await ask('  番号: ')) - 1;
      if (pi >= 0 && pi < names.length) {
        tokens = { ...PRESETS[names[pi]] };
        server.update(tokens);
        console.log(`  \x1b[32m✓\x1b[0m ${tokens.brandName} に変更。プレビュー更新済み。\n`);
      }
      continue;
    }

    const map = { '1': 'primary', '2': 'bg', '3': 'text', '4': 'success', '5': 'warning', '6': 'danger', '7': 'radius', '8': 'fontSans', '9': 'fontMono', '0': 'brandName' };
    const key = map[action];
    if (!key) { console.log('  無効な選択\n'); continue; }

    const val = await ask(`  新しい値 [${tokens[key]}]: `);
    if (val) {
      tokens[key] = val;

      // Auto-derive primaryLight from primary
      if (key === 'primary' && val.startsWith('#')) {
        const r = parseInt(val.slice(1, 3), 16);
        const g = parseInt(val.slice(3, 5), 16);
        const b = parseInt(val.slice(5, 7), 16);
        tokens.primaryLight = `rgba(${r},${g},${b},0.08)`;
      }

      server.update(tokens);
      console.log(`  \x1b[32m✓\x1b[0m ${key} = ${val} — プレビュー更新済み\n`);
    }
  }

  // Step 4: Generate DESIGN.md
  console.log(`\n  \x1b[1mStep 4: DESIGN.md 生成\x1b[0m\n`);

  const outputDir = await ask('  出力先ディレクトリ [.]: ') || '.';
  const designMd = generateDesignMd(tokens);
  const outPath = join(outputDir, 'DESIGN.md');
  await writeFile(outPath, designMd);
  console.log(`  \x1b[32m✓\x1b[0m ${outPath} に書き出しました`);

  // Also save preview
  const previewPath = join(outputDir, 'design-preview.html');
  const previewResp = await fetch(previewUrl);
  const previewHtml = await previewResp.text();
  // Remove SSE script for static file
  const staticHtml = previewHtml.replace(/<script>[\s\S]*?<\/script>/, '');
  await writeFile(previewPath, staticHtml);
  console.log(`  \x1b[32m✓\x1b[0m ${previewPath} にプレビューを保存しました`);

  printTokenSummary(tokens);
  console.log(`  完了！ブラウザで ${previewPath} を開いて最終確認してください。\n`);

  server.stop();
  rl.close();
}

function generateDesignMd(t) {
  return `# DESIGN.md — ${t.brandName}

> AI-readable design system specification.
> Format: [Google Stitch DESIGN.md standard](https://stitch.withgoogle.com/docs/design-md/format/) (9-section)
> Generated by [design-md wizard](https://github.com/applego/design-md)

---

## 1. Visual Theme & Atmosphere

- **Brand**: ${t.brandName}
- **Mood**: [TODO: describe in 3-5 keywords]
- **Density**: Medium
- **Default mode**: ${t.bg === '#ffffff' || t.bg.includes('f5') || t.bg.includes('fa') ? 'Light' : 'Dark'}

---

## 2. Color Palette & Roles

### Brand

| Role | Value |
|------|-------|
| Primary | \`${t.primary}\` |
| Primary Light | \`${t.primaryLight}\` |

### Text

| Role | Value |
|------|-------|
| Text Primary | \`${t.text}\` |
| Text Secondary | \`${t.textSec}\` |

### Semantic

| Role | Value |
|------|-------|
| Success | \`${t.success}\` |
| Warning | \`${t.warning}\` |
| Danger | \`${t.danger}\` |

### Surfaces

| Role | Value |
|------|-------|
| Background | \`${t.bg}\` |
| Card | \`${t.card}\` |
| Surface | \`${t.surface}\` |
| Border | \`${t.border}\` |

---

## 3. Typography Rules

### Font Families

| Role | Stack |
|------|-------|
| Sans (default) | \`${t.fontSans}, "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif\` |
| Mono (metrics) | \`${t.fontMono}, monospace\` |

### Type Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| Display | 24px | 700 | Page titles |
| Heading | 18px | 700 | Section headings |
| Subheading | 14px | 700 | Card headings |
| Body | 12-13px | 400 | Body text |
| Caption | 10px | 400 | Labels, meta |
| Micro | 9px | 700 | Badges, tags |
| Metric | 14px | 700 mono | Financial values |

### Japanese Typography

- line-height: 1.8 (body), 1.3 (heading)
- letter-spacing: 0.04em (body)
- line-break: strict (禁則処理)
- font-feature-settings: "palt" (headings)

---

## 4. Component Stylings

### Buttons

| Variant | Style |
|---------|-------|
| Primary | bg: \`${t.primary}\`, color: #fff, radius: ${t.radius} |
| Secondary | bg: \`${t.card}\`, border: 1px solid \`${t.border}\`, color: \`${t.textSec}\` |
| Ghost | bg: transparent, color: \`${t.textSec}\` |

### Cards

- Background: \`${t.card}\`
- Border: 1px solid \`${t.border}\`
- Radius: ${t.radius}
- Padding: 14-16px

### Badges

\`\`\`
bg: {color}22 (8% opacity)
text: {color}
font-size: 9px, font-weight: 700, uppercase
\`\`\`

---

## 5. Layout Principles

- Spacing base: 4px
- Common gaps: 4px, 8px, 12px, 16px, 24px
- Page padding: 24-32px
- Sidebar width: 160-192px

---

## 6. Depth & Elevation

| Level | Shadow |
|-------|--------|
| SM | 0 1px 3px rgba(0,0,0,0.06) |
| MD | 0 4px 12px rgba(0,0,0,0.08) |
| LG | 0 8px 24px rgba(0,0,0,0.10) |
| XL | 0 16px 48px rgba(0,0,0,0.14) |

### Border Radius

| Token | Value |
|-------|-------|
| Default | ${t.radius} |
| Small | calc(${t.radius} / 2) |
| Full | 50% |

---

## 7. Do's and Don'ts

### Do
- Use \`${t.fontMono}\` for all financial/numerical values
- Use opacity-based semantic badges
- Apply transition-colors to interactive elements
- Use CSS variable tokens for theme-switchable values

### Don't
- Don't hardcode pixel values — use spacing scale
- Don't use hover without transition
- Don't add new colors without updating this file

---

## 8. Responsive Behavior

| Breakpoint | Width |
|------------|-------|
| sm | >= 640px |
| md | >= 768px |
| lg | >= 1024px |
| xl | >= 1280px |

---

## 9. Agent Prompt Guide

### Quick Reference

\`\`\`
Primary:    ${t.primary}
Background: ${t.bg}
Text:       ${t.text}
Success:    ${t.success}
Warning:    ${t.warning}
Danger:     ${t.danger}
Font:       ${t.fontSans} + Noto Sans JP
Mono:       ${t.fontMono}
Radius:     ${t.radius}
\`\`\`
`;
}
