import { mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const src = 'nodes/PDFPipe';
const dest = 'dist/nodes/PDFPipe';
mkdirSync(dest, { recursive: true });
for (const file of readdirSync(src)) {
  if (file.endsWith('.svg') || file.endsWith('.png')) {
    copyFileSync(join(src, file), join(dest, file));
  }
}
console.log('icons copied to dist');
