import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../esm/native/runtime/runtime_selectors.ts', import.meta.url), 'utf8');

test('runtime selectors use a canonical normalizer table instead of per-branch generic casts', () => {
  assert.match(src, /const RUNTIME_SCALAR_NORMALIZERS: \{/);
  assert.match(src, /return RUNTIME_SCALAR_NORMALIZERS\[key\]\(rawValue, def\);/);
  assert.doesNotMatch(src, /readBooleanLike\(rawValue, boolFallback\) as RuntimeScalarValueMap\[K\]/);
  assert.doesNotMatch(
    src,
    /normalizeDrawersOpenId\(rawValue, drawersFallback\) as RuntimeScalarValueMap\[K\]/
  );
});
