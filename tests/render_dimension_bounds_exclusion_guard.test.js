import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = [
  'esm/native/builder/render_ops_extras.ts',
  'esm/native/builder/render_ops_extras_dimensions.ts',
]
  .map(rel => fs.readFileSync(path.join(process.cwd(), rel), 'utf8'))
  .join('\n');

test('dimension overlays are excluded from wardrobe bounds measurement', () => {
  assert.match(source, /line\.userData\.__wpExcludeWardrobeBounds\s*=\s*true/);
  assert.match(source, /sprite\.userData\.__wpExcludeWardrobeBounds\s*=\s*true/);
});
