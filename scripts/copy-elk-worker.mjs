// Copies ELK's Web Worker build into public/ so the tree page can load it
// as a separate, cacheable file (it is ~1.5 MB and only needed there).
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const source = join(dirname(require.resolve('elkjs/package.json')), 'lib', 'elk-worker.min.js');
mkdirSync('public', { recursive: true });
copyFileSync(source, join('public', 'elk-worker.min.js'));
