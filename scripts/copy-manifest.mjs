import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve('manifest.json');
const dest = path.resolve('dist-ext', 'manifest.json');

try {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log('✓ manifest.json successfully copied to dist-ext');
} catch (error) {
  console.error('Failed to copy manifest.json:', error);
  process.exit(1);
}
