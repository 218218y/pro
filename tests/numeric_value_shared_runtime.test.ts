import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readFiniteNumber,
  readInteger,
  readNumericInput,
  readPositiveInteger,
} from '../esm/shared/numeric_value_shared.ts';

test('numeric readers preserve finite numbers and parse explicit numeric strings', () => {
  assert.equal(readFiniteNumber(readNumericInput(2.5)), 2.5);
  assert.equal(readFiniteNumber(readNumericInput(' 2.5 ')), 2.5);
  assert.equal(readInteger(readNumericInput(2.9)), 2);
  assert.equal(readInteger(readNumericInput('42')), 42);
  assert.equal(readPositiveInteger(readNumericInput('3')), 3);
});

test('numeric readers reject empty, malformed, non-scalar, boolean, and symbol input', () => {
  for (const value of ['', '2px', null, undefined, {}, [], true, Symbol('2')]) {
    assert.equal(readFiniteNumber(readNumericInput(value)), null);
    assert.equal(readInteger(readNumericInput(value)), null);
  }
  assert.equal(readPositiveInteger(readNumericInput('0')), null);
  assert.equal(readPositiveInteger(readNumericInput('-1')), null);
});
