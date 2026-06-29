import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readMeasurementNumber,
  resolveMeasurementLabelFaceSign,
} from '../esm/native/builder/render_preview_sketch_measurements_input.ts';

test('preview measurement numbers use explicit preview scalar parsing only', () => {
  assert.equal(readMeasurementNumber(0.25), 0.25);
  assert.equal(readMeasurementNumber(' 0.25 '), 0.25);
  assert.equal(readMeasurementNumber(''), null);
  assert.equal(readMeasurementNumber('   '), null);
  assert.equal(readMeasurementNumber(null), null);
  assert.equal(readMeasurementNumber(false), null);
  assert.equal(readMeasurementNumber([]), null);
  assert.equal(readMeasurementNumber({ value: 1 }), null);
});

test('preview measurement face signs ignore implicit boolean/null coercion', () => {
  assert.equal(resolveMeasurementLabelFaceSign({ labelFaceSign: '-1' }, {} as never, 0.2), -1);
  assert.equal(resolveMeasurementLabelFaceSign({ labelFaceSign: false }, {} as never, -0.2), -1);
  assert.equal(resolveMeasurementLabelFaceSign({ labelFaceSign: null }, { faceSign: '1' } as never, -0.2), 1);
});
