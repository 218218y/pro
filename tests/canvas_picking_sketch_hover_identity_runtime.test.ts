import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertCanonicalSketchHoverRecord,
  createSketchHoverHostIdentity,
  readSketchHoverHostIdentity,
} from '../esm/native/services/canvas_picking_sketch_hover_identity.ts';

const toModuleKey = (value: unknown): number | 'corner' | null => {
  if (value === 'corner') return 'corner';
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

test('sketch hover host identity emits only the canonical atomic fields', () => {
  const identity = createSketchHoverHostIdentity({ moduleKey: 4, isBottom: true });

  assert.deepEqual(identity, { hostModuleKey: 4, hostIsBottom: true });
  assert.equal(Object.hasOwn(identity, 'moduleKey'), false);
  assert.equal(Object.hasOwn(identity, 'isBottom'), false);
  assert.deepEqual(readSketchHoverHostIdentity(identity, toModuleKey), {
    moduleKey: 4,
    isBottom: true,
  });
});

test('sketch hover host identity rejects legacy, mixed, incomplete, and malformed records', () => {
  const invalidRecords = [
    { moduleKey: 4, isBottom: false },
    { moduleKey: 4, isBottom: false, hostModuleKey: 4, hostIsBottom: false },
    { hostIsBottom: false },
    { hostModuleKey: 4 },
    { hostModuleKey: 4, hostIsBottom: 0 },
    { hostModuleKey: 'invalid', hostIsBottom: false },
  ];

  for (const record of invalidRecords) {
    assert.equal(readSketchHoverHostIdentity(record, toModuleKey), null);
  }
});

test('canonical sketch hover write validation fails fast before retired identity can re-enter runtime state', () => {
  assert.doesNotThrow(() => assertCanonicalSketchHoverRecord({ hostModuleKey: null, hostIsBottom: false }));
  assert.throws(
    () =>
      assertCanonicalSketchHoverRecord({
        moduleKey: 3,
        isBottom: false,
        hostModuleKey: 3,
        hostIsBottom: false,
      }),
    /moduleKey\/isBottom are retired/
  );
  assert.throws(
    () => assertCanonicalSketchHoverRecord({ hostModuleKey: 3 }),
    /missing canonical host identity/
  );
});
