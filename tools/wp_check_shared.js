import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT = path.resolve(__dirname, '..');
export const JS_ROOT = path.join(ROOT, 'js');
export const ESM_ROOT = path.join(ROOT, 'esm');
export const DEFAULT_BASELINE = path.join(__dirname, 'wp_baseline.json');

export const JS_EXTS = new Set(['.js', '.mjs', '.cjs']);
export const TS_EXTS = new Set(['.ts', '.tsx', '.mts', '.cts']);
export const SOURCE_EXTS = new Set([...JS_EXTS, ...TS_EXTS]);

export function rel(rootOrFile, maybeFile) {
  const root = maybeFile ? rootOrFile : ROOT;
  const file = maybeFile || rootOrFile;
  return path.relative(root, file).replace(/\\/g, '/');
}

export function walkSourceFiles(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'vendor' || ent.name === 'node_modules' || ent.name === 'dist') continue;
      out.push(...walkSourceFiles(abs));
      continue;
    }
    if (!ent.isFile()) continue;
    const ext = path.extname(ent.name).toLowerCase();
    if (SOURCE_EXTS.has(ext)) out.push(abs);
  }
  return out;
}

export function countByExtension(files) {
  const out = {};
  for (const file of files) {
    const ext = path.extname(file).toLowerCase() || '<none>';
    out[ext] = (out[ext] || 0) + 1;
  }
  return out;
}

export function countOccurrences(text, needle) {
  let count = 0;
  let idx = 0;
  while (true) {
    idx = text.indexOf(needle, idx);
    if (idx === -1) break;
    count += 1;
    idx += needle.length;
  }
  return count;
}

export function countNeedles(files, needles) {
  const totals = Object.fromEntries(needles.map(needle => [needle, 0]));
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const needle of needles) totals[needle] += countOccurrences(text, needle);
  }
  return totals;
}

export function countNeedlesByDir(srcRoot, files, needles) {
  const byDir = {};
  for (const file of files) {
    const relPath = rel(srcRoot, file);
    const top = relPath.split('/')[0] || relPath;
    if (!byDir[top]) byDir[top] = Object.fromEntries(needles.map(needle => [needle, 0]));
    const text = fs.readFileSync(file, 'utf8');
    for (const needle of needles) byDir[top][needle] += countOccurrences(text, needle);
  }
  return byDir;
}

export function readBaseline(baselinePath) {
  if (!fs.existsSync(baselinePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  } catch {
    return null;
  }
}

export function writeBaseline(baselinePath, mode, needles, totals, byDir) {
  const data = {
    mode,
    needles,
    totals,
    byDir,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(baselinePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
