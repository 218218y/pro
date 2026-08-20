import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getTypeAssertionFacts } from './_semantic_source_contracts.js';

const normalizersSrc = fs.readFileSync(
  new URL('../esm/native/runtime/runtime_selectors_normalizers.ts', import.meta.url),
  'utf8'
);
const snapshotSrc = fs.readFileSync(
  new URL('../esm/native/runtime/runtime_selectors_snapshot.ts', import.meta.url),
  'utf8'
);
const facadeSrc = fs.readFileSync(
  new URL('../esm/native/runtime/runtime_selectors.ts', import.meta.url),
  'utf8'
);

test('runtime selectors use a canonical normalizer table instead of per-branch generic casts', () => {
  assert.match(normalizersSrc, /const RUNTIME_SCALAR_NORMALIZERS: \{/);
  assert.match(snapshotSrc, /return RUNTIME_SCALAR_NORMALIZERS\[key\]\(rawValue, def\);/);
  assert.match(facadeSrc, /runtime_selectors_normalizers|runtime_selectors_snapshot/);
  const assertions = getTypeAssertionFacts(snapshotSrc, 'runtime_selectors_snapshot.ts');
  assert.equal(
    assertions.some(fact => fact.type === 'RuntimeScalarValueMap[K]'),
    false,
    'runtime selector normalization should not recover generic result types through indexed casts'
  );
});
