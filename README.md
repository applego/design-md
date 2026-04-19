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

## Quick Start

```bash
# Browse the gallery
npx @applego/design-md

# Search by mood
npx @applego/design-md search "warm finance japanese"

# Preview a theme
npx @applego/design-md preview stripe

# Apply to your project
npx @applego/design-md apply stripe

# Compare two themes side-by-side
npx @applego/design-md compare stripe notion

# Font tools
npx @applego/design-md fonts pair "Noto Sans JP"
npx @applego/design-md fonts stack "Noto Sans JP"
```

## Collection

### Japanese Brands (via [kzhrknt/awesome-design-md-jp](https://github.com/kzhrknt/awesome-design-md-jp))

Apple Japan, freee, LINE, Mercari, MoneyForward, MUJI, note, pixiv, Qiita, Rakuten, SmartHR, STUDIO, Zenn, and more.

### International Brands (via [awesome-design-md](https://github.com/VoltAgent/awesome-design-md))

Stripe, Linear, Notion, Vercel, Figma, Supabase, Spotify, Cal.com, and 50+ more.

## Fonts

Built-in font catalog with:
- **Pairing recommendations** — tested JP + EN combinations
- **Fallback stack generator** — `fonts stack "Noto Sans JP"` outputs full chain
- **CJK typography rules** — line-break, OpenType features, line-height guides
- **License info** — OFL, commercial, system fonts

## Sync

Upstream sources are synced weekly via GitHub Actions.

```bash
npm run sync        # Pull upstream + rebuild catalog
npm run sync:jp     # Japanese brands only
npm run sync:en     # International brands only
```

## Architecture

```
upstream/           <- git subtree (read-only mirror)
  ├── jp/           <- kzhrknt/awesome-design-md-jp
  └── en/           <- Meliwat/awesome-design-md-pre-paywall
design-md/          <- Unified catalog (built from upstream + enrichment)
fonts/              <- Font catalog, pairings, stacks, CJK rules
cli/                <- CLI tool
gallery/            <- Web gallery (Astro + GitHub Pages)
scripts/            <- Build & sync scripts
template/           <- DESIGN.md + preview.html templates
```

## Credits

- [kzhrknt/awesome-design-md-jp](https://github.com/kzhrknt/awesome-design-md-jp) -- Japanese DESIGN.md collection
- [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) -- Original DESIGN.md collection
- [Google Stitch](https://stitch.withgoogle.com/) -- DESIGN.md format specification

## License

MIT
