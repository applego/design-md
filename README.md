# design-md

DESIGN.md collection, CLI, font manager, and gallery.
JP + EN unified. Auto-syncs from the awesome-design-md ecosystem.

## What is DESIGN.md?

A plain-text design system spec that AI agents read when generating UI.
Introduced by [Google Stitch](https://stitch.withgoogle.com/docs/design-md/format/) — 9-section standard format.

| File | Reader | Defines |
|------|--------|---------|
| `README.md` | Humans | Project overview |
| `AGENTS.md` | Coding agents | How to build |
| **`DESIGN.md`** | **Design agents** | **How it should look** |

---

## 🎨 The Best Flow — Gallery → Live Preview → Apply

新しいサイトの DESIGN.md を決める最高のフロー。**ブラウザで選ぶだけ**。

### セットアップ（初回のみ）

```bash
git clone https://github.com/applego/design-md.git ~/Documents/workspace_dev/design-md
cd ~/Documents/workspace_dev/design-md
```

### 毎回の使い方（1コマンド）

```bash
cd ~/Documents/workspace_dev/design-md
npm start
```

これだけで Gallery + Live Preview の両サーバー起動 + ブラウザ自動オープン。
Ctrl+C で両方停止。

### 個別起動（デバッグ用）

```bash
npm run preview    # Live Preview (port 4567) のみ
npm run gallery    # Gallery (port 3456) のみ
```

### 操作フロー

```
┌─────────────────────────────────────────┐
│ 1. Gallery でカードにホバー               │
│    → 右上に緑の [Apply] ボタン出現        │
├─────────────────────────────────────────┤
│ 2. [Apply] クリック                       │
│    → POST /tokens でトークン送信          │
│    → SSE 経由で Live Preview 即更新       │
├─────────────────────────────────────────┤
│ 3. 気に入ったらプロジェクトにコピー       │
│    node cli/bin/design-md.mjs apply X ./ │
├─────────────────────────────────────────┤
│ 4. Claude Code で自然言語微調整（任意） │
│    「もう少し角丸大きく」                │
│    「primaryをティール系に」              │
└─────────────────────────────────────────┘
```

### 14 プリセット（緑ボタン = 完全トークンセット）

Stripe / Linear / Notion / Vercel / Figma / Spotify / Cal.com / Apple / Apple Japan / freee / SmartHR / MoneyForward / MUJI / LINE / Mercari

その他のブランドは primary 色のみから基本トークンを自動生成。

---

## CLI Commands

```bash
# 全ブランド一覧
node cli/bin/design-md.mjs list

# キーワード検索
node cli/bin/design-md.mjs search "finance japanese"

# プレビューをブラウザで開く
node cli/bin/design-md.mjs preview stripe

# 2ブランド比較
node cli/bin/design-md.mjs compare stripe freee

# プロジェクトにコピー
node cli/bin/design-md.mjs apply stripe /path/to/project

# URL からデザイン抽出（Puppeteer必要）
node cli/bin/design-md.mjs generate https://example.com

# 対話型 wizard（ターミナル内）
node cli/bin/design-md.mjs wizard

# フォントツール
node cli/bin/design-md.mjs fonts list
node cli/bin/design-md.mjs fonts stack "Noto Sans JP"
node cli/bin/design-md.mjs fonts pair "Noto Sans JP"
```

---

## Collection

### Japanese Brands (24 brands, via [kzhrknt/awesome-design-md-jp](https://github.com/kzhrknt/awesome-design-md-jp))

Apple Japan, freee, LINE, Mercari, MoneyForward, MUJI, note, pixiv, Qiita, Rakuten, SmartHR, STUDIO, Zenn, ABEMA, cookpad, cybozu, Sansan, tabelog, Toyota, connpass, Droga5, novasell, Notion (JP), WIRED

### International Brands (58 brands, via [awesome-design-md](https://github.com/VoltAgent/awesome-design-md))

Stripe, Linear, Notion, Vercel, Figma, Supabase, Spotify, Cal.com, Claude, Airbnb, Apple, Tesla, Uber, Wise, Kraken, Coinbase, MongoDB, Sentry, NVIDIA, and 40+ more.

---

## Fonts

Built-in font catalog with 20 fonts:

- **Sans**: Inter, Geist, Roboto, SF Pro, Helvetica Neue, Noto Sans JP, Hiragino Sans, Yu Gothic, Meiryo, Circular, Söhne, Figma Sans
- **Mono**: JetBrains Mono, Geist Mono, SF Mono, Berkeley Mono, IBM Plex Mono, Source Code Pro
- **Serif**: Noto Serif JP, Georgia

### Features
- **Pairing recommendations** — tested JP + EN combinations
- **Fallback stack generator** — `fonts stack "Noto Sans JP"` outputs full chain
- **CJK typography rules** — line-break, OpenType features (`palt`, `kern`), line-height guides
- **License info** — OFL, commercial, system fonts

---

## Sync

Upstream sources are synced weekly via GitHub Actions (Monday 00:00 UTC).

```bash
npm run sync        # Pull upstream + rebuild catalog
npm run sync:jp     # Japanese brands only
npm run sync:en     # International brands only
```

Manual sync creates a PR automatically.

---

## Architecture

```
upstream/           <- git subtree (read-only mirror)
  ├── jp/           <- kzhrknt/awesome-design-md-jp
  └── en/           <- Meliwat/awesome-design-md-pre-paywall
design-md/          <- Unified catalog (built from upstream)
  ├── {brand}/
  │   ├── DESIGN.md       <- 9-section spec
  │   ├── meta.json       <- category, mood, primaryColor, fonts
  │   ├── preview.html    <- light mode visual catalog
  │   └── preview-dark.html  (EN brands only)
  └── catalog.json    <- index of all 82 brands
fonts/              <- Font catalog, pairings, stacks, CJK rules
  ├── catalog/      <- sans/ mono/ serif/
  ├── pairings/     <- JP + EN combinations
  ├── stacks/       <- fallback chains
  └── rules/        <- CJK typography rules
cli/
  ├── bin/design-md.mjs    <- main CLI entry
  └── src/
      ├── wizard.mjs          <- interactive builder
      ├── preview-server.mjs  <- live preview + SSE
      └── serve-preview.mjs   <- standalone server
gallery/            <- Web gallery (static HTML, no build)
  └── index.html
scripts/            <- Build & sync scripts
.github/workflows/  <- Weekly upstream sync
```

---

## How It Works: Gallery ↔ Live Preview

```
┌─────────────────────┐     POST /tokens     ┌──────────────────────┐
│ Gallery (port 3456) │ ───────────────────▶ │ Preview (port 4567)  │
│ 82 cards + Apply    │                      │ SSE → auto-refresh   │
└─────────────────────┘                      └──────────────────────┘
                                                        │
                                                        ▼
                                              ┌──────────────────────┐
                                              │ Claude Code chat     │
                                              │ 自然言語で微調整     │
                                              └──────────────────────┘
```

- Gallery はクライアント側 JS で `http://localhost:4567/tokens` を POST
- Preview サーバーが SSE (Server-Sent Events) でブラウザに reload シグナル送信
- CORS preflight (OPTIONS) 対応済み

---

## Credits

- [kzhrknt/awesome-design-md-jp](https://github.com/kzhrknt/awesome-design-md-jp) -- Japanese DESIGN.md collection
- [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) -- Original DESIGN.md collection
- [Google Stitch](https://stitch.withgoogle.com/) -- DESIGN.md format specification

## License

MIT
