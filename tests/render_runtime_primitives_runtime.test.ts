import test from 'node:test';
import assert from 'node:assert/strict';

import {
  asRecord,
  hasFiniteVec3,
  readFiniteNumber,
  readFiniteNumberOrNull,
  readMethod,
  readMotionComponent,
  readMotionNumberPart,
  readRecord,
} from '../esm/native/runtime/render_runtime_primitives.js';

test('render runtime primitives keep finite numbers and ignore junk', () => {
  assert.equal(readFiniteNumber(12, 0), 12);
  assert.equal(readFiniteNumber(Number.NaN, 5), 5);
  assert.equal(readFiniteNumber(Number.POSITIVE_INFINITY, 7), 7);
  assert.equal(readFiniteNumberOrNull('12'), null);
  assert.equal(readFiniteNumberOrNull(-3.5), -3.5);
});

test('render runtime primitives expose record and vec helpers', () => {
  const rec = readRecord({ ok: true, nested: { x: 1 } });
  assert.equal(rec?.ok, true);
  assert.equal(readRecord(null), null);
  assert.deepEqual(asRecord(null, { seeded: true }), { seeded: true });
  assert.equal(hasFiniteVec3({ x: 1, y: 2, z: 3 }), true);
  assert.equal(hasFiniteVec3({ x: 1, y: Number.NaN, z: 3 }), false);
});

test('render runtime primitives bind owner methods and motion parts safely', () => {
  const owner = {
    base: 10,
    add(delta: number) {
      return this.base + delta;
    },
  };
  const add = readMethod<[number]>(owner, 'add');
  assert.equal(add?.(5), 15);
  assert.equal(readMethod(owner, 'missing'), null);

  const motion = readMotionComponent({ x: 1, y: Number.NaN, z: 3, w: 4 });
  assert.equal(readMotionNumberPart(motion, 'x'), 1);
  assert.ok(Number.isNaN(readMotionNumberPart(motion, 'y')));
  assert.equal(readMotionNumberPart(motion, 'w'), 4);
});
