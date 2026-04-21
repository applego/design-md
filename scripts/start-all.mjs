#!/usr/bin/env node
/**
 * start-all — Launch both preview server (4567) and gallery server (3456).
 * Opens both in the browser automatically.
 */
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

console.log('Starting design-md servers...\n');

// 1. Preview server (port 4567)
const preview = spawn('node', [join(ROOT, 'cli/src/serve-preview.mjs'), '4567'], {
  cwd: ROOT,
  stdio: 'inherit',
});

// 2. Gallery server (port 3456) via npx serve
const gallery = spawn('npx', ['-y', 'serve', '-l', '3456', '--no-clipboard', ROOT], {
  cwd: ROOT,
  stdio: 'inherit',
});

// Wait a bit then open browsers
setTimeout(async () => {
  try {
    const open = (await import('open')).default;
    await open('http://localhost:3456/gallery/');
    await open('http://localhost:4567');
    console.log('\n✓ Opened Gallery + Live Preview in browser');
    console.log('  Gallery:      http://localhost:3456/gallery/');
    console.log('  Live Preview: http://localhost:4567\n');
    console.log('Press Ctrl+C to stop both servers.\n');
  } catch (e) {
    console.log('\nOpen these URLs manually:');
    console.log('  http://localhost:3456/gallery/');
    console.log('  http://localhost:4567\n');
  }
}, 3000);

// Cleanup on exit
const cleanup = () => {
  preview.kill();
  gallery.kill();
  process.exit(0);
};
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
