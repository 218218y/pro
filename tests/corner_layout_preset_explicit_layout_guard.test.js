import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(process.cwd(), 'esm/native/builder/corner_wing_extension_cells_config.ts');

test('[corner-layout-preset] explicit corner cell layout survives normalization before defaults', () => {
  const src = fs.readFileSync(SRC, 'utf8');

  assert.match(
    src,
    /const rawLayout = rawRec && typeof rawRec\.layout === 'string' \? String\(rawRec\.layout\)\.trim\(\) : '';/
  );
  assert.match(src, /if \(!rawLayout\) \{/);
  assert.match(src, /cfg\.layout = rawLayout;/);
  assert.doesNotMatch(
    src,
    /cfg\.layout = typeof cfg\.layout === 'string' \? String\(cfg\.layout\)\.trim\(\) : '';/
  );
});
