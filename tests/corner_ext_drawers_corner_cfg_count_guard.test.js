import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(process.cwd(), 'esm/native/builder/corner_wing_extension_cells_config.ts');

test('[corner-ext-drawers-config] corner cell normalization preserves ext drawers count from the stored corner cell config', () => {
  const src = fs.readFileSync(SRC, 'utf8');

  assert.match(src, /const extRaw = cfgBase\.extDrawersCount \?\? cfgBase\.extDrawers;/);
  assert.match(src, /const ext = parseInt\(String\(extRaw \?\? ''\), 10\);/);
  assert.match(src, /cfg\.extDrawersCount = Number\.isFinite\(ext\) \? ext : 0;/);
});
