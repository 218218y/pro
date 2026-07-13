import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectEsnextTargetViolations,
  collectRedundantImmutableSortSourceViolations,
  collectRequiredRuntimeApiViolations,
} from '../tools/wp_esnext_target_contract.mjs';

test('ESNext target contract rejects redundant immutable array copy-sort patterns', () => {
  const violations = collectRedundantImmutableSortSourceViolations(
    `
const first = items.slice().sort(compare);
const second = [...items].sort(compare);
const alreadyMaterialized = Array.from(ids).sort(compare);
const combined = [...left, ...right].sort(compare);
`,
    'fixture.ts'
  );

  assert.equal(violations.length, 2);
  assert.match(violations[0] ?? '', /fixture\.ts:2 uses redundant slice\(\)\.sort\(\)/);
  assert.match(violations[1] ?? '', /fixture\.ts:3 uses redundant single-spread array \.sort\(\)/);
});

test('ESNext target contract accepts the repository runtime floor and modern source patterns', async () => {
  assert.deepEqual(await collectEsnextTargetViolations(), []);
});

test('ESNext target contract reports every unavailable runtime API required by adopted source', () => {
  assert.deepEqual(
    collectRequiredRuntimeApiViolations({
      'Array.prototype.toSorted': Array.prototype.toSorted,
      'Map.groupBy': undefined,
      'Promise.withResolvers': null,
      'Set.prototype.difference': Set.prototype.difference,
    }),
    ['current Node runtime is missing Map.groupBy', 'current Node runtime is missing Promise.withResolvers']
  );
});
