/**
 * Live preview server — serves a customizable preview page
 * Tokens update via SSE (Server-Sent Events) for instant browser refresh
 */
import { createServer } from 'node:http';

const PREVIEW_HTML = (tokens) => `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DESIGN.md Live Preview</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  :root {
    --primary: ${tokens.primary};
    --primary-light: ${tokens.primaryLight};
    --bg: ${tokens.bg};
    --card: ${tokens.card};
    --surface: ${tokens.surface};
    --text: ${tokens.text};
    --text-sec: ${tokens.textSec};
    --border: ${tokens.border};
    --success: ${tokens.success};
    --warning: ${tokens.warning};
    --danger: ${tokens.danger};
    --radius: ${tokens.radius};
    --font: '${tokens.fontSans}', 'Noto Sans JP', sans-serif;
    --mono: '${tokens.fontMono}', monospace;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:var(--font);background:var(--bg);color:var(--text);padding:24px;transition:all .3s}
  .header{margin-bottom:24px}
  .header h1{font-size:20px;font-weight:700;margin-bottom:4px}
  .header p{font-size:12px;color:var(--text-sec)}
  .live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;margin-right:6px;animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

  .section{margin-bottom:28px}
  .section-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:var(--text-sec);margin-bottom:10px}

  .color-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:6px}
  .color-chip{border-radius:var(--radius);padding:10px;min-height:64px;display:flex;flex-direction:column;justify-content:flex-end}
  .color-chip .label{font-size:9px;font-weight:600}
  .color-chip .hex{font-size:10px;font-family:var(--mono)}

  .badges-row{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px}
  .badge{padding:2px 8px;border-radius:calc(var(--radius) / 2);font-size:9px;font-weight:700;text-transform:uppercase}

  .components-row{display:flex;gap:12px;flex-wrap:wrap}
  .card-demo{border-radius:var(--radius);padding:14px;width:260px;background:var(--card);border:1px solid var(--border)}
  .card-demo h3{font-size:13px;font-weight:700;margin-bottom:4px}
  .card-demo p{font-size:11px;color:var(--text-sec);margin-bottom:10px}
  .metrics-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}
  .metric-box{border-radius:calc(var(--radius) / 2);padding:7px;background:var(--surface)}
  .metric-box .m-label{font-size:8px;color:var(--text-sec)}
  .metric-box .m-value{font-size:13px;font-weight:700;font-family:var(--mono)}

  .sidebar-demo{width:160px;border-radius:var(--radius);padding:6px;background:var(--surface);border:1px solid var(--border)}
  .nav-item{display:flex;align-items:center;gap:7px;padding:5px 8px;border-radius:calc(var(--radius) / 2);font-size:11px;font-weight:500;color:var(--text-sec)}
  .nav-item.active{background:var(--primary-light);color:var(--primary);font-weight:600}
  .nav-icon{width:12px;height:12px;border-radius:3px;background:currentColor;opacity:.4;flex-shrink:0}
  .nav-item.active .nav-icon{opacity:.8}

  .btn-group{display:flex;gap:6px;flex-wrap:wrap}
  .btn{padding:6px 14px;border-radius:var(--radius);font-size:11px;font-weight:600;border:none;cursor:pointer;font-family:var(--font)}
  .btn-primary{background:var(--primary);color:#fff}
  .btn-secondary{background:var(--card);border:1px solid var(--border);color:var(--text-sec)}
  .btn-ghost{background:transparent;color:var(--text-sec)}

  .tab-bar{display:inline-flex;gap:2px;border-radius:var(--radius);padding:3px;background:var(--surface);border:1px solid var(--border)}
  .tab-item{padding:5px 12px;border-radius:calc(var(--radius) / 2);font-size:11px;font-weight:600;background:transparent;color:var(--text-sec);border:none;font-family:var(--font)}
  .tab-item.active{background:var(--card);color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,.08)}

  .input-demo{border-radius:var(--radius);padding:8px 12px;font-size:12px;border:1px solid var(--border);width:220px;font-family:var(--font);background:var(--card);color:var(--text)}

  .shadow-demo{display:flex;gap:14px}
  .shadow-box{width:72px;height:72px;border-radius:var(--radius);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;background:var(--card);color:var(--text-sec)}

  .jp-typo{padding:14px;border-radius:var(--radius);background:var(--card);border:1px solid var(--border)}

  .token-bar{position:fixed;bottom:0;left:0;right:0;background:var(--surface);border-top:1px solid var(--border);padding:8px 16px;font-size:10px;color:var(--text-sec);font-family:var(--mono);display:flex;gap:16px;flex-wrap:wrap;backdrop-filter:blur(12px)}
  .token-bar span{white-space:nowrap}
</style>
</head>
<body>
<div class="header">
  <h1><span class="live-dot"></span>${tokens.brandName || 'Custom'} — Live Preview</h1>
  <p>Wizard で変更すると自動更新されます</p>
</div>

<div class="section">
  <div class="section-title">Colors</div>
  <div class="color-grid">
    <div class="color-chip" style="background:${tokens.primary};color:#fff"><div class="label">Primary</div><div class="hex">${tokens.primary}</div></div>
    <div class="color-chip" style="background:${tokens.primaryLight};color:${tokens.primary}"><div class="label">Primary Lt</div><div class="hex">${tokens.primaryLight}</div></div>
    <div class="color-chip" style="background:${tokens.bg};color:${tokens.text};border:1px solid ${tokens.border}"><div class="label">Background</div><div class="hex">${tokens.bg}</div></div>
    <div class="color-chip" style="background:${tokens.card};color:${tokens.text};border:1px solid ${tokens.border}"><div class="label">Card</div><div class="hex">${tokens.card}</div></div>
    <div class="color-chip" style="background:${tokens.surface};color:${tokens.text}"><div class="label">Surface</div><div class="hex">${tokens.surface}</div></div>
    <div class="color-chip" style="background:${tokens.success};color:#fff"><div class="label">Success</div><div class="hex">${tokens.success}</div></div>
    <div class="color-chip" style="background:${tokens.warning};color:#fff"><div class="label">Warning</div><div class="hex">${tokens.warning}</div></div>
    <div class="color-chip" style="background:${tokens.danger};color:#fff"><div class="label">Danger</div><div class="hex">${tokens.danger}</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Badges</div>
  <div class="badges-row">
    <span class="badge" style="background:${tokens.success}22;color:${tokens.success}">承認済</span>
    <span class="badge" style="background:${tokens.warning}22;color:${tokens.warning}">確認中</span>
    <span class="badge" style="background:${tokens.danger}22;color:${tokens.danger}">却下</span>
    <span class="badge" style="background:${tokens.primary}22;color:${tokens.primary}">売上</span>
    <span class="badge" style="background:#7c3aed22;color:#7c3aed">AI提案</span>
  </div>
</div>

<div class="section">
  <div class="section-title">Typography</div>
  <div style="font-size:20px;font-weight:700;margin-bottom:6px">月次損益レポート</div>
  <div style="font-size:14px;font-weight:700;margin-bottom:4px">売上高推移 — 2026年Q1</div>
  <div style="font-size:12px;color:var(--text-sec);margin-bottom:4px">freeeから取得した取引データを元に、AIが仕訳候補を自動生成しました。</div>
  <div style="font-size:14px;font-weight:700;font-family:var(--mono)">¥12,450,000 <span style="font-size:11px;opacity:.5">(+8.3%)</span></div>
</div>

<div class="section">
  <div class="section-title">Japanese Typography</div>
  <div class="jp-typo">
    <p style="font-size:14px;line-height:1.8;letter-spacing:.04em;margin-bottom:6px">損益計算書（PL）は、企業の一定期間における経営成績を示す財務諸表です。売上高から各種費用を差し引き、最終的な利益を算出します。</p>
    <p style="font-size:11px;color:var(--text-sec)">font: ${tokens.fontSans} + Noto Sans JP / line-height: 1.8</p>
  </div>
</div>

<div class="section">
  <div class="section-title">Buttons</div>
  <div class="btn-group">
    <button class="btn btn-primary">承認する</button>
    <button class="btn btn-secondary">差し戻し</button>
    <button class="btn btn-ghost">キャンセル</button>
  </div>
</div>

<div class="section">
  <div class="section-title">Tab Bar</div>
  <div class="tab-bar">
    <button class="tab-item active">レビュー</button>
    <button class="tab-item">仕訳一覧</button>
    <button class="tab-item">PL推移</button>
    <button class="tab-item">設定</button>
  </div>
</div>

<div class="section">
  <div class="section-title">Cards & Sidebar</div>
  <div class="components-row">
    <div class="card-demo">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <h3>仕訳レビュー #1042</h3>
        <span class="badge" style="background:${tokens.success}22;color:${tokens.success};font-size:8px">HIGH 92%</span>
      </div>
      <p>Amazon Web Services — サーバー利用料</p>
      <div class="metrics-grid">
        <div class="metric-box"><div class="m-label">借方</div><div class="m-value">通信費</div></div>
        <div class="metric-box"><div class="m-label">金額</div><div class="m-value" style="color:${tokens.warning}">¥245,800</div></div>
        <div class="metric-box"><div class="m-label">ソース</div><div class="m-value" style="font-size:10px">freee</div></div>
        <div class="metric-box"><div class="m-label">前月比</div><div class="m-value" style="color:${tokens.danger}">+12.3%</div></div>
      </div>
    </div>
    <div class="sidebar-demo">
      <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--text-sec);opacity:.5;padding:6px 8px">MAIN</div>
      <div class="nav-item active"><div class="nav-icon"></div>ホーム</div>
      <div class="nav-item"><div class="nav-icon"></div>レビュー</div>
      <div class="nav-item"><div class="nav-icon"></div>プロジェクト</div>
      <div class="nav-item"><div class="nav-icon"></div>メンバー</div>
      <div class="nav-item"><div class="nav-icon"></div>チャット</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">Input</div>
  <input class="input-demo" placeholder="勘定科目を検索..." />
</div>

<div class="section">
  <div class="section-title">Elevation</div>
  <div class="shadow-demo">
    <div class="shadow-box" style="box-shadow:0 1px 3px rgba(0,0,0,.06)">SM</div>
    <div class="shadow-box" style="box-shadow:0 4px 12px rgba(0,0,0,.08)">MD</div>
    <div class="shadow-box" style="box-shadow:0 8px 24px rgba(0,0,0,.1)">LG</div>
    <div class="shadow-box" style="box-shadow:0 16px 48px rgba(0,0,0,.14)">XL</div>
  </div>
</div>

<div class="token-bar">
  <span>primary: ${tokens.primary}</span>
  <span>bg: ${tokens.bg}</span>
  <span>font: ${tokens.fontSans}</span>
  <span>radius: ${tokens.radius}</span>
  <span>mode: ${tokens.bg === '#ffffff' || tokens.bg.includes('f5') ? 'light' : 'dark'}</span>
</div>

<script>
  const es = new EventSource('/sse');
  es.onmessage = () => location.reload();
</script>
</body>
</html>`;

export function createPreviewServer(initialTokens) {
  let tokens = { ...initialTokens };
  let sseClients = [];

  const server = createServer((req, res) => {
    if (req.url === '/sse') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      sseClients.push(res);
      req.on('close', () => { sseClients = sseClients.filter(c => c !== res); });
      return;
    }

    // POST /tokens — update tokens via HTTP API (for Claude Code integration)
    if (req.method === 'POST' && req.url === '/tokens') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const newTokens = JSON.parse(body);
          tokens = { ...tokens, ...newTokens };
          for (const client of sseClients) {
            client.write('data: reload\n\n');
          }
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ ok: true, tokens }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // GET /tokens — read current tokens
    if (req.url === '/tokens') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(tokens));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(PREVIEW_HTML(tokens));
  });

  return {
    start(port = 0) {
      return new Promise(resolve => {
        server.listen(port, () => {
          const addr = server.address();
          resolve(addr.port);
        });
      });
    },
    update(newTokens) {
      tokens = { ...tokens, ...newTokens };
      for (const client of sseClients) {
        client.write('data: reload\n\n');
      }
    },
    getTokens() { return { ...tokens }; },
    stop() { server.close(); },
  };
}
