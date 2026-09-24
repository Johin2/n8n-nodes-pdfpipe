import { mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// The credential class carries an icon too, and n8n resolves a credential's
// icon relative to the compiled credential file, so the SVGs have to land in
// dist/credentials as well as dist/nodes.
const pairs = [
  ['nodes/PDFPipe', 'dist/nodes/PDFPipe'],
  ['credentials', 'dist/credentials'],
];

for (const [src, dest] of pairs) {
  mkdirSync(dest, { recursive: true });
  for (const file of readdirSync(src)) {
    if (file.endsWith('.svg') || file.endsWith('.png')) {
      copyFileSync(join(src, file), join(dest, file));
    }
  }
}
console.log('icons copied to dist');
