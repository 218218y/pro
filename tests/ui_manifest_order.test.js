import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveUiInstallOrder } from '../dist/esm/native/ui/ui_manifest.js';

function mk(id, after) {
  const e = {
    id,
    file: `x/${id}.js`,
    importer: async () => ({}),
  };
  if (after) e.after = after;
  return e;
}

test('resolveUiInstallOrder preserves original order when no dependencies exist', () => {
  const entries = [mk('a'), mk('b'), mk('c')];
  const ordered = resolveUiInstallOrder(entries);
  assert.deepEqual(
    ordered.map(x => x.id),
    ['a', 'b', 'c']
  );
});

test('resolveUiInstallOrder respects "after" dependencies', () => {
  const entries = [mk('a'), mk('b', ['a']), mk('c', ['b'])];
  const ordered = resolveUiInstallOrder(entries);
  assert.deepEqual(
    ordered.map(x => x.id),
    ['a', 'b', 'c']
  );
});

test('resolveUiInstallOrder is stable (ties keep original order)', () => {
  // c depends on a; b is independent.
  // Expected: a first, then b (keeps original), then c.
  const entries = [mk('a'), mk('b'), mk('c', ['a'])];
  const ordered = resolveUiInstallOrder(entries);
  assert.deepEqual(
    ordered.map(x => x.id),
    ['a', 'b', 'c']
  );
});

test('resolveUiInstallOrder throws on cycles', () => {
  const entries = [mk('a', ['b']), mk('b', ['a'])];
  assert.throws(
    () => resolveUiInstallOrder(entries),
    err => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /cyclic/i);
      return true;
    }
  );
});
