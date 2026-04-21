#!/usr/bin/env node
/**
 * Standalone preview server for Claude Code integration.
 * Start: node cli/src/serve-preview.mjs [port]
 * Update: curl -X POST http://localhost:PORT/tokens -d '{"primary":"#ff0000"}'
 * Read:   curl http://localhost:PORT/tokens
 */
import { createPreviewServer } from './preview-server.mjs';

const PORT = parseInt(process.argv[2] || '4567');

const tokens = {
  brandName: 'Billing PL',
  primary: '#2563eb', primaryLight: '#e0edff',
  bg: '#ffffff', card: '#ffffff', surface: '#f5f7fa',
  text: '#1e293b', textSec: '#64748b',
  border: '#e2e8f0',
  success: '#15803d', warning: '#a16207', danger: '#b91c1c',
  radius: '8px',
  fontSans: 'Inter', fontMono: 'JetBrains Mono',
};

const server = createPreviewServer(tokens);
const port = await server.start(PORT);
console.log(`Preview server running at http://localhost:${port}`);
console.log(`POST /tokens to update, GET /tokens to read`);
console.log(`Press Ctrl+C to stop\n`);
