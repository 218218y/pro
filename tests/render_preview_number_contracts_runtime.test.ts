import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readPreviewNumber,
  readPreviewNumberOr,
  readPreviewPositiveNumber,
  readPreviewPositiveNumberOr,
} from '../esm/native/builder/render_preview_number_contracts.ts';

test('preview number contracts accept explicit preview scalars only', () => {
  assert.equal(readPreviewNumber(0.25), 0.25);
  assert.equal(readPreviewNumber(' 0.25 '), 0.25);
  assert.equal(readPreviewNumber(''), null);
  assert.equal(readPreviewNumber('   '), null);
  assert.equal(readPreviewNumber(null), null);
  assert.equal(readPreviewNumber(false), null);
  assert.equal(readPreviewNumber([]), null);
  assert.equal(readPreviewNumber({ value: 1 }), null);
});

test('preview number contracts keep positive dimensions separate from coordinates', () => {
  assert.equal(readPreviewPositiveNumber('0.4'), 0.4);
  assert.equal(readPreviewPositiveNumber(0), null);
  assert.equal(readPreviewPositiveNumber('-0.4'), null);
  assert.equal(readPreviewNumberOr('', 0.12), 0.12);
  assert.equal(readPreviewPositiveNumberOr('0', 0.18), 0.18);
});
