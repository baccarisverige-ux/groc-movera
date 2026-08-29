import { readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, join } from 'node:path';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const budgets = {
  '.js': 1_500_000,
  '.css': 1_000_000,
};

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

let files;
try {
  files = await walk(root);
} catch {
  console.error('Bundle budget check requires an existing dist/. Run npm run build first.');
  process.exit(1);
}

const totals = new Map();
for (const file of files) {
  const ext = extname(file);
  if (!(ext in budgets)) continue;
  const { size } = await stat(file);
  totals.set(ext, (totals.get(ext) ?? 0) + size);
}

let failed = false;
for (const [ext, limit] of Object.entries(budgets)) {
  const total = totals.get(ext) ?? 0;
  const kb = (total / 1024).toFixed(1);
  const limitKb = (limit / 1024).toFixed(1);
  console.log(`${ext}: ${kb} KiB / ${limitKb} KiB budget`);
  if (total > limit) failed = true;
}

if (failed) {
  console.error('Bundle budget exceeded. Investigate before increasing a threshold.');
  process.exit(1);
}
