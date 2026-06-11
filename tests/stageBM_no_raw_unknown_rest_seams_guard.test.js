import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const roots = ['esm', 'types'];
const restPattern = /\.\.\.args\s*:\s*unknown\[\]/g;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

test('stageBM: source no longer keeps raw ...args: unknown[] rest seams', () => {
  const hits = [];
  for (const root of roots) {
    for (const file of walk(path.join(process.cwd(), root))) {
      const text = fs.readFileSync(file, 'utf8');
      if (restPattern.test(text)) hits.push(path.relative(process.cwd(), file));
      restPattern.lastIndex = 0;
    }
  }
  assert.deepEqual(hits, []);
});
