import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(process.cwd(), 'esm/native/builder/corner_wing_extension_cells_config.ts');

test('[corner-ext-drawers-config] corner cell normalization preserves ext drawers count from the stored corner cell config', () => {
  const src = fs.readFileSync(SRC, 'utf8');

  assert.match(src, /function readFiniteInt\(value: unknown\): number \| null \{/);
  assert.match(src, /const extRaw = cfgBase\.extDrawersCount \?\? cfgBase\.extDrawers;/);
  assert.match(src, /const ext = readFiniteInt\(extRaw\);/);
  assert.match(src, /cfg\.extDrawersCount = ext != null \? ext : 0;/);
  assert.doesNotMatch(src, /parseInt\(String\(extRaw/);
});
